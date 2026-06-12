import express from 'express';
import {
  getNotifications,
  getUnreadNotifications,
  getNotificationStats,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticateUser);

router.get('/', getNotifications);
router.get('/unread', getUnreadNotifications);
router.get('/dashboard', getNotificationStats);
router.get('/stats', getNotificationStats); // alias for consistency
router.get('/:id', getNotificationById);

router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

router.delete('/:id', deleteNotification);

export default router;
