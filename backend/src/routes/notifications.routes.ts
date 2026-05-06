import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as notificationsController from '../controllers/notifications.controller';
import * as notificationPreferencesController from '../controllers/notification-preferences.controller';

const router = Router();

// All routes require authentication
router.get('/', authenticate, notificationsController.getMyNotifications);
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);
router.put('/:id/read', authenticate, notificationsController.markAsRead);
router.put('/read-all', authenticate, notificationsController.markAllAsRead);
router.put('/mark-all-read', authenticate, notificationsController.markAllAsRead);
router.delete('/:id', authenticate, notificationsController.deleteNotification);

// Notification preferences
router.get('/preferences', authenticate, notificationPreferencesController.getPreferences);
router.put('/preferences', authenticate, notificationPreferencesController.updatePreferences);

export default router;
