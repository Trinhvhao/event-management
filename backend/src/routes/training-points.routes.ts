import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as trainingPointsController from '../controllers/training-points.controller';
import {
    validateAwardPoints,
    validateExportPointsQuery,
} from '../validators/training-points.validator';

const router = Router();

// Student routes
router.get('/my-points', authenticate, trainingPointsController.getMyPoints);
router.get(
    '/my-points/history',
    authenticate,
    trainingPointsController.getMyPointsHistory
);

// Public route
router.get('/current-semester', trainingPointsController.getCurrentSemester);

// Organizer/Admin routes
router.post(
    '/award',
    authenticate,
    authorize('organizer', 'admin'),
    validateAwardPoints,
    trainingPointsController.awardPoints
);

router.get(
    '/export',
    authenticate,
    authorize('organizer', 'admin'),
    validateExportPointsQuery,
    trainingPointsController.exportPoints
);

// Admin routes
router.get(
    '/user/:userId',
    authenticate,
    authorize('admin'),
    trainingPointsController.getUserPoints
);
router.get(
    '/statistics',
    authenticate,
    authorize('admin'),
    trainingPointsController.getStatistics
);

export default router;
