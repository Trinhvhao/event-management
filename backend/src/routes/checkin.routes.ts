import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as checkinController from '../controllers/checkin.controller';
import * as checkinValidator from '../validators/checkin.validator';

const router = Router();

// Student self check-in (any authenticated user can check-in with their own QR)
router.post(
    '/',
    authenticate,
    checkinValidator.validateCheckin,
    checkinController.checkin
);

router.get(
    '/event/:eventId',
    authenticate,
    authorize('organizer', 'admin'),
    checkinController.getEventAttendances
);

router.get(
    '/event/:eventId/stats',
    authenticate,
    authorize('organizer', 'admin'),
    checkinController.getAttendanceStats
);

export default router;
