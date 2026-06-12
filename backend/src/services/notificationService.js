import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';
import auditService from './auditService.js';

// Helper to determine role-based database query filter
const getQueryForRole = (user) => {
  if (!user) return { _id: null };
  const role = user.role;

  if (role === 'Admin') {
    // Admin sees everything
    return {};
  }

  if (role === 'Manager') {
    // Manager sees all High/Critical notifications
    return { severity: { $in: ['High', 'Critical'] } };
  }

  const baseQuery = {};

  if (role === 'SafetyOfficer') {
    baseQuery.module = { $in: ['Compliance', 'Risk', 'Incident', 'AutonomousAgent', 'Mitigation'] };
  } else if (role === 'Operator') {
    baseQuery.module = { $in: ['Incident', 'Mitigation', 'Simulation', 'Sensor', 'SensorData', 'TransitNode'] };
  } else {
    return { _id: null };
  }

  // Intersect with recipient lists (if specified)
  const recipientFilter = {
    $and: [
      {
        $or: [
          { recipientUsers: { $size: 0 } },
          { recipientUsers: user._id }
        ]
      },
      {
        $or: [
          { recipientRoles: { $size: 0 } },
          { recipientRoles: role }
        ]
      }
    ]
  };

  return { ...baseQuery, ...recipientFilter };
};

// Helper to format/map a notification document for a specific user
const mapNotificationForUser = (notif, userId) => {
  const doc = notif.toJSON ? notif.toJSON() : notif;
  const userRead = (doc.readBy || []).find(r => r.userId.toString() === userId.toString());
  return {
    ...doc,
    isRead: !!userRead,
    readAt: userRead ? userRead.readAt : null,
    id: doc.notificationId || doc._id
  };
};

export const notificationService = {
  /**
   * Create a notification
   */
  async createNotification(data, req) {
    const { title, message, type, severity, module, recipientRoles = [], recipientUsers = [], metadata = {} } = data;

    const notif = await Notification.create({
      title,
      message,
      type,
      severity,
      module,
      recipientRoles,
      recipientUsers,
      metadata,
      readBy: []
    });

    console.log(`[NOTIFICATION-ENGINE] Notification ${notif.notificationId} created: ${title} (${severity})`);

    // Emit Socket.IO event to all connected clients
    try {
      const io = getIO();
      const payload = {
        ...notif.toJSON(),
        isRead: false,
        readAt: null,
        id: notif.notificationId
      };
      
      io.emit('notification:new', payload);
      console.log(`[SOCKET] Broadcasted notification:new event for NT-${notif.notificationId}`);
    } catch (socketErr) {
      console.error(`[SOCKET-EMIT-ERROR] Failed to emit notification:new: ${socketErr.message}`);
    }

    // Write Audit Log
    try {
      // Map module name to standard audit module
      const validModules = [
        'Authentication', 'TransitNode', 'Sensor', 'SensorData', 'Compliance',
        'Incident', 'Mitigation', 'Simulation', 'Risk', 'AutonomousAgent', 'Webhook'
      ];
      const auditModule = validModules.includes(module) ? module : 'Authentication';

      await auditService.logEvent({
        req,
        action: 'Notification Created',
        module: auditModule,
        description: `Notification created: ${title}. Severity: ${severity}`,
        severity: severity === 'Critical' ? 'Critical' : (severity === 'High' ? 'Warning' : 'Info'),
        metadata: { notificationId: notif.notificationId, type }
      });
    } catch (auditErr) {
      console.error(`[NOTIFICATION-AUDIT-ERROR] Failed to audit notification creation: ${auditErr.message}`);
    }

    return notif;
  },

  /**
   * Get notifications for a user based on role and filters
   */
  async getNotifications(user, queryParams = {}) {
    const { severity, module: filterModule, isRead, page = 1, limit = 50 } = queryParams;

    const rbacQuery = getQueryForRole(user);
    const filter = { ...rbacQuery };

    // Apply query parameters
    if (severity) {
      filter.severity = severity;
    }
    if (filterModule) {
      filter.module = filterModule;
    }
    if (isRead !== undefined) {
      if (isRead === 'true' || isRead === true) {
        filter['readBy.userId'] = user._id;
      } else {
        filter['readBy.userId'] = { $ne: user._id };
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const formatted = notifications.map(n => mapNotificationForUser(n, user._id));

    return {
      notifications: formatted,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  },

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(user) {
    const rbacQuery = getQueryForRole(user);
    const filter = {
      ...rbacQuery,
      'readBy.userId': { $ne: user._id }
    };

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    return notifications.map(n => mapNotificationForUser(n, user._id));
  },

  /**
   * Get single notification by ID
   */
  async getNotificationById(id, user) {
    const rbacQuery = getQueryForRole(user);
    const isObjectId = mongoose.isValidObjectId(id);
    const filter = {
      ...rbacQuery,
      $or: [
        { _id: isObjectId ? id : null },
        { notificationId: id }
      ]
    };

    const notif = await Notification.findOne(filter);
    if (!notif) {
      const error = new Error(`Notification not found or access unauthorized`);
      error.statusCode = 404;
      throw error;
    }

    return mapNotificationForUser(notif, user._id);
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(id, user, req) {
    const rbacQuery = getQueryForRole(user);
    const isObjectId = mongoose.isValidObjectId(id);
    const filter = {
      ...rbacQuery,
      $or: [
        { _id: isObjectId ? id : null },
        { notificationId: id }
      ]
    };

    const notif = await Notification.findOne(filter);
    if (!notif) {
      const error = new Error(`Notification not found or access unauthorized`);
      error.statusCode = 404;
      throw error;
    }

    // Add user to readBy array if not already present
    const alreadyRead = notif.readBy.some(r => r.userId.toString() === user._id.toString());
    if (!alreadyRead) {
      notif.readBy.push({
        userId: user._id,
        readAt: new Date()
      });
      await notif.save();

      // Emit Socket update
      try {
        const io = getIO();
        io.emit('notification:read', { notificationId: notif.notificationId, userId: user._id });
        io.emit('notification:update', mapNotificationForUser(notif, user._id));
      } catch (socketErr) {
        console.error(`[SOCKET-EMIT-ERROR] Failed to emit notification:read: ${socketErr.message}`);
      }

      // Audit Log
      try {
        const validModules = [
          'Authentication', 'TransitNode', 'Sensor', 'SensorData', 'Compliance',
          'Incident', 'Mitigation', 'Simulation', 'Risk', 'AutonomousAgent', 'Webhook'
        ];
        const auditModule = validModules.includes(notif.module) ? notif.module : 'Authentication';
        
        await auditService.logEvent({
          req,
          action: 'Notification Read',
          module: auditModule,
          description: `Notification marked as read: ${notif.title}`,
          severity: 'Info',
          metadata: { notificationId: notif.notificationId }
        });
      } catch (auditErr) {
        console.error(`[NOTIFICATION-AUDIT-ERROR] Failed to audit notification read: ${auditErr.message}`);
      }
    }

    return mapNotificationForUser(notif, user._id);
  },

  /**
   * Mark all visible unread notifications as read
   */
  async markAllAsRead(user, req) {
    const rbacQuery = getQueryForRole(user);
    const filter = {
      ...rbacQuery,
      'readBy.userId': { $ne: user._id }
    };

    const unread = await Notification.find(filter);
    let count = 0;

    for (const notif of unread) {
      notif.readBy.push({
        userId: user._id,
        readAt: new Date()
      });
      await notif.save();
      count++;
    }

    if (count > 0) {
      // Emit Socket update
      try {
        const io = getIO();
        io.emit('notification:read-all', { userId: user._id });
      } catch (socketErr) {
        console.error(`[SOCKET-EMIT-ERROR] Failed to emit notification:read-all: ${socketErr.message}`);
      }

      // Audit Log
      try {
        await auditService.logEvent({
          req,
          action: 'Notification Read All',
          module: 'Authentication',
          description: `Marked all (${count}) notifications as read`,
          severity: 'Info',
          metadata: { count }
        });
      } catch (auditErr) {
        console.error(`[NOTIFICATION-AUDIT-ERROR] Failed to audit mark-all-read: ${auditErr.message}`);
      }
    }

    return count;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id, user, req) {
    // Only Admin can delete notifications
    if (user.role !== 'Admin') {
      const error = new Error('Forbidden access. Only administrators can delete notifications.');
      error.statusCode = 403;
      throw error;
    }

    const isObjectId = mongoose.isValidObjectId(id);
    const notif = await Notification.findOneAndDelete({
      $or: [
        { _id: isObjectId ? id : null },
        { notificationId: id }
      ]
    });

    if (!notif) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    // Emit Socket delete event
    try {
      const io = getIO();
      io.emit('notification:delete', { notificationId: notif.notificationId });
    } catch (socketErr) {
      console.error(`[SOCKET-EMIT-ERROR] Failed to emit notification:delete: ${socketErr.message}`);
    }

    // Audit Log
    try {
      await auditService.logEvent({
        req,
        action: 'Notification Deleted',
        module: 'Authentication',
        description: `Deleted notification: ${notif.title}`,
        severity: 'Warning',
        metadata: { notificationId: notif.notificationId }
      });
    } catch (auditErr) {
      console.error(`[NOTIFICATION-AUDIT-ERROR] Failed to audit notification delete: ${auditErr.message}`);
    }

    return notif;
  },

  /**
   * Get notification statistics for dashboard
   */
  async getNotificationStats(user) {
    const rbacQuery = getQueryForRole(user);
    
    const totalNotifications = await Notification.countDocuments(rbacQuery);
    
    const unreadQuery = { ...rbacQuery, 'readBy.userId': { $ne: user._id } };
    const unreadNotifications = await Notification.countDocuments(unreadQuery);

    const criticalQuery = { ...unreadQuery, severity: 'Critical' };
    const criticalNotifications = await Notification.countDocuments(criticalQuery);

    const recent = await Notification.find(rbacQuery)
      .sort({ createdAt: -1 })
      .limit(5);

    const formattedRecent = recent.map(n => mapNotificationForUser(n, user._id));

    return {
      totalNotifications,
      unreadNotifications,
      criticalNotifications,
      recentNotifications: formattedRecent
    };
  }
};

export default notificationService;
