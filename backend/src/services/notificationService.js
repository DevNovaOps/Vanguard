import notificationRepository from '../repositories/notificationRepository.js';
import { getIO } from '../config/socket.js';
import auditService from './auditService.js';

// Helper to format/map a notification document for a specific user
const mapNotificationForUser = (notif, userId) => {
  if (!notif) return null;
  return {
    ...notif,
    id: notif.notificationId || notif._id
  };
};

export const notificationService = {
  create(data, req) {
    return this.createNotification(data, req);
  },

  /**
   * Create a notification
   */
  async createNotification(data, req) {
    const { title, message, type, severity, module, recipientRoles = [], recipientUsers = [], metadata = {} } = data;

    const notif = await notificationRepository.create({
      title,
      message,
      type,
      severity,
      module,
      recipientRoles,
      recipients: recipientUsers,
      metadata
    });

    console.log(`[NOTIFICATION-ENGINE] Notification ${notif.notificationId} created: ${title} (${severity})`);

    // Emit Socket.IO event to all connected clients
    try {
      const io = getIO();
      const payload = {
        ...notif,
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
    if (!user) {
      return { notifications: [], pagination: { page: 1, limit: 50, total: 0, pages: 1 } };
    }

    const { notifications, pagination } = await notificationRepository.findForUser(user, queryParams);
    const formatted = notifications.map(n => mapNotificationForUser(n, user._id));

    return { notifications: formatted, pagination };
  },

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(user) {
    if (!user) return [];
    const notifications = await notificationRepository.findUnreadForUser(user);
    return notifications.map(n => mapNotificationForUser(n, user._id));
  },

  /**
   * Get single notification by ID
   */
  async getNotificationById(id, user) {
    const notif = await notificationRepository.findById(id);
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
    const notif = await notificationRepository.findById(id);
    if (!notif) {
      const error = new Error(`Notification not found or access unauthorized`);
      error.statusCode = 404;
      throw error;
    }

    await notificationRepository.markAsRead(notif._id, user._id);
    const updatedNotif = await notificationRepository.findById(notif._id);

    // Emit Socket update
    try {
      const io = getIO();
      io.emit('notification:read', { notificationId: updatedNotif.notificationId, userId: user._id });
      io.emit('notification:update', mapNotificationForUser(updatedNotif, user._id));
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

    return mapNotificationForUser(updatedNotif, user._id);
  },

  /**
   * Mark all visible unread notifications as read
   */
  async markAllAsRead(user, req) {
    const count = await notificationRepository.markAllAsRead(user);

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
    const userRoleLower = (user?.role || '').toLowerCase();
    if (userRoleLower !== 'admin') {
      const error = new Error('Forbidden access. Only administrators can delete notifications.');
      error.statusCode = 403;
      throw error;
    }

    const notif = await notificationRepository.deleteById(id);
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
    const stats = await notificationRepository.getStatsForUser(user);
    
    // Recent 5 notifications
    const { notifications: recent } = await notificationRepository.findForUser(user, { page: 1, limit: 5 });
    
    // Critical notifications
    const { pagination: criticalStats } = await notificationRepository.findForUser(user, { severity: 'Critical', isRead: false, limit: 1 });

    const formattedRecent = recent.map(n => mapNotificationForUser(n, user._id));

    return {
      totalNotifications: stats.total,
      unreadNotifications: stats.unread,
      criticalNotifications: criticalStats.total,
      recentNotifications: formattedRecent
    };
  }
};

export default notificationService;
