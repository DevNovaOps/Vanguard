import notificationService from '../services/notificationService.js';

/**
 * Get notifications for the authenticated user based on role and query parameters
 */
export const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getNotifications(req.user, req.query);
    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result.notifications,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get only unread notifications for the authenticated user
 */
export const getUnreadNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.user);
    res.status(200).json({
      success: true,
      message: 'Unread notifications retrieved successfully',
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification statistics for dashboards
 */
export const getNotificationStats = async (req, res, next) => {
  try {
    const stats = await notificationService.getNotificationStats(req.user);
    res.status(200).json({
      success: true,
      message: 'Notification statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single notification by its database ID or human-readable notificationId
 */
export const getNotificationById = async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Notification retrieved successfully',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user, req);
    res.status(200).json({
      success: true,
      message: 'Notification marked as read successfully',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all matching unread notifications as read
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const count = await notificationService.markAllAsRead(req.user, req);
    res.status(200).json({
      success: true,
      message: `Successfully marked ${count} notifications as read`,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notification (restricted to Admins in service layer)
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.deleteNotification(req.params.id, req.user, req);
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};
