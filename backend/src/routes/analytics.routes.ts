import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';

const router = Router();

// Public analytics routes for dashboard charts.
router.get('/time-series', analyticsController.getTimeSeriesAnalytics);
router.get('/department-distribution', analyticsController.getDepartmentDistribution);

export default router;
