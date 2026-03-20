import { Router } from 'express';

const router = Router();

// Import route modules
import authRoutes from './auth.routes';
import eventRoutes from './events.routes';
import registrationRoutes from './registrations.routes';
import checkinRoutes from './checkin.routes';
import trainingPointRoutes from './training-points.routes';
import feedbackRoutes from './feedback.routes';
import notificationRoutes from './notifications.routes';
import statisticsRoutes from './statistics.routes';
import adminRoutes from './admin.routes';
import searchRoutes from './search.routes';

// Mount routes
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/checkin', checkinRoutes);
router.use('/training-points', trainingPointRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/notifications', notificationRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/admin', adminRoutes);
router.use('/search', searchRoutes);

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    message: 'Event Management API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      events: '/api/events',
      registrations: '/api/registrations',
      checkin: '/api/checkin',
      trainingPoints: '/api/training-points',
      feedback: '/api/feedback',
      notifications: '/api/notifications',
      statistics: '/api/statistics',
      admin: '/api/admin',
      search: '/api/search',
    },
  });
});

export default router;
