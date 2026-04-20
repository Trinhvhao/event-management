import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as checkinController from '../controllers/checkin.controller';
import * as checkinValidator from '../validators/checkin.validator';

const router = Router();

// Scan QR check-in (Organizer/Admin)
router.post(
    '/scan',
    authenticate,
    authorize('organizer', 'admin'),
    checkinValidator.validateCheckin,
    checkinController.scanCheckin
);

// Manual check-in by registration id or student id (Organizer/Admin)
router.post(
    '/manual',
    authenticate,
    authorize('organizer', 'admin'),
    checkinValidator.validateManualCheckin,
    checkinController.manualCheckin
);

// Backward-compatible scan endpoint
router.post(
    '/',
    authenticate,
    authorize('organizer', 'admin'),
    checkinValidator.validateCheckin,
    checkinController.scanCheckin
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
