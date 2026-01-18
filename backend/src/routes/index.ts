import { Router } from 'express';

const router = Router();

// Import route modules
import authRoutes from './auth.routes';
import eventRoutes from './events.routes';

// Mount routes
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    message: 'Event Management API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      events: '/api/events',
    },
  });
});

export default router;
