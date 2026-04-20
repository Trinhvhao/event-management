import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as checkinController from '../controllers/checkin.controller';
import * as checkinValidator from '../validators/checkin.validator';

const router = Router();

// POST /checkin/scan — Quét QR check-in
router.post(
    '/scan',
    authenticate,
    authorize('organizer', 'admin'),
    checkinValidator.validateCheckin,
    checkinController.scanCheckin
);

// POST /checkin/manual — Check-in thủ công bằng MSSV hoặc registration_id
router.post(
    '/manual',
    authenticate,
    authorize('organizer', 'admin'),
    checkinValidator.validateManualCheckin,
    checkinController.manualCheckin
);

// POST /checkin/ — Backward-compatible alias
router.post(
    '/',
    authenticate,
    authorize('organizer', 'admin'),
    checkinValidator.validateCheckin,
    checkinController.scanCheckin
);

// GET /checkin/event/:eventId — Danh sách điểm danh của sự kiện
router.get(
    '/event/:eventId',
    authenticate,
    authorize('organizer', 'admin'),
    checkinController.getEventAttendances
);

// GET /checkin/event/:eventId/stats — Thống kê điểm danh
router.get(
    '/event/:eventId/stats',
    authenticate,
    authorize('organizer', 'admin'),
    checkinController.getAttendanceStats
);

// GET /checkin/:attendanceId — Lấy chi tiết 1 bản ghi điểm danh
router.get(
    '/:attendanceId',
    authenticate,
    authorize('organizer', 'admin'),
    checkinController.getAttendanceById
);

// POST /checkin/:attendanceId/checkout — Check-out sinh viên
router.post(
    '/:attendanceId/checkout',
    authenticate,
    authorize('organizer', 'admin'),
    checkinController.checkoutAttendance
);

// DELETE /checkin/:attendanceId — Hủy bản ghi điểm danh (undo)
router.delete(
    '/:attendanceId',
    authenticate,
    authorize('organizer', 'admin'),
    checkinController.undoAttendance
);

export default router;
