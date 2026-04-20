import { Router } from 'express';
import { statisticsController } from '../controllers/statistics.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// Analytics routes (charts data) - Public endpoints, no auth required
router.get('/analytics/time-series', analyticsController.getTimeSeriesAnalytics);
router.get('/analytics/department-distribution', analyticsController.getDepartmentDistribution);

// Protected routes - require authentication
router.use(authenticate);

// Admin/Organizer routes
router.get('/dashboard', authorize('organizer', 'admin'), statisticsController.getDashboard);
router.get('/my', authorize('organizer', 'admin'), statisticsController.getOrganizerStats);
router.get('/events/:id', authorize('organizer', 'admin'), statisticsController.getEventStats);
router.get('/students', authorize('admin'), statisticsController.getStudentStats);
router.get('/departments', authorize('admin'), statisticsController.getDepartmentStats);

export default router;
