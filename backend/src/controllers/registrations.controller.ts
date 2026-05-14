import { Request, Response, NextFunction } from 'express';
import * as registrationsService from '../services/registrations.service';
import { eventService } from '../services/events.service';
import { successResponse } from '../utils/response.util';
import {
    getAuthenticatedUser,
    getQueryString,
    parsePositiveInt,
} from '../utils/request.util';

export const registerForEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getAuthenticatedUser(req).id;
        const { event_id, reason, agreed } = req.body;
        const eventId = parsePositiveInt(event_id, 'event_id');

        const registration = await registrationsService.registerForEvent(userId, eventId, { reason, agreed });

        const message = registration.is_pending_approval
            ? 'Đăng ký thành công! Đang chờ duyệt từ Ban tổ chức.'
            : 'Đăng ký sự kiện thành công';

        res.status(201).json(successResponse(registration, message));
    } catch (error) {
        next(error);
    }
};

export const getMyRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getAuthenticatedUser(req).id;
        const { status, approval_status } = req.query;

        const registrations = await registrationsService.getMyRegistrations(
            userId,
            getQueryString(status),
            getQueryString(approval_status)
        );

        res.json(successResponse(registrations));
    } catch (error) {
        next(error);
    }
};

export const cancelRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getAuthenticatedUser(req).id;
        const registrationId = parsePositiveInt(req.params.id, 'id');

        await registrationsService.cancelRegistration(userId, registrationId);

        res.json(successResponse({ message: 'Hủy đăng ký thành công' }));
    } catch (error) {
        next(error);
    }
};

export const getEventRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventId = parsePositiveInt(req.params.eventId, 'eventId');
        const { status, approval_status } = req.query;
        const requester = getAuthenticatedUser(req);

        const registrations = await registrationsService.getEventRegistrations(
            eventId,
            getQueryString(status),
            getQueryString(approval_status),
            requester
        );

        res.json(successResponse(registrations));
    } catch (error) {
        next(error);
    }
};

export const getRegistrationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const registrationId = parsePositiveInt(req.params.id, 'id');
        const requester = getAuthenticatedUser(req);

        const registration = await registrationsService.getRegistrationByIdWithAccess(
            registrationId,
            requester
        );

        res.json(successResponse(registration));
    } catch (error) {
        next(error);
    }
};

export const getRegistrationQRCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const registrationId = parsePositiveInt(req.params.id, 'id');
        const requester = getAuthenticatedUser(req);

        const qrPayload = await registrationsService.getRegistrationQRCodeWithAccess(
            registrationId,
            requester
        );

        res.json(successResponse(qrPayload));
    } catch (error) {
        next(error);
    }
};

// =====================
// Approval Controllers
// =====================

export const approveRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requester = getAuthenticatedUser(req);
        const registrationId = parsePositiveInt(req.params.id, 'id');
        const { note } = req.body;

        const result = await registrationsService.approveRegistration(
            registrationId,
            requester,
            note
        );

        res.json(successResponse(result, 'Đã duyệt đăng ký thành công'));
    } catch (error) {
        next(error);
    }
};

export const rejectRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requester = getAuthenticatedUser(req);
        const registrationId = parsePositiveInt(req.params.id, 'id');
        const { note } = req.body;

        const result = await registrationsService.rejectRegistration(
            registrationId,
            requester,
            note
        );

        res.json(successResponse(result, 'Đã từ chối đăng ký'));
    } catch (error) {
        next(error);
    }
};

export const getPendingRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requester = getAuthenticatedUser(req);
        const { event_id } = req.query;

        const pending = await registrationsService.getPendingRegistrations(
            requester,
            event_id ? parsePositiveInt(event_id as string, 'event_id') : undefined
        );

        res.json(successResponse(pending));
    } catch (error) {
        next(error);
    }
};

// =====================
// Bulk Controllers
// =====================

export const bulkApproveRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requester = getAuthenticatedUser(req);
        const { registrationIds, note } = req.body;

        if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
            res.status(400).json({ success: false, message: 'registrationIds phải là mảng không rỗng' });
            return;
        }

        const ids = registrationIds.map((id: unknown) => parsePositiveInt(String(id), 'registrationId'));
        const results = await registrationsService.bulkApproveRegistrations(ids, requester, note);

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        res.json(successResponse(results, `Đã duyệt ${successCount}/${registrationIds.length} đăng ký. ${failCount > 0 ? `${failCount} thất bại.` : ''}`));
    } catch (error) {
        next(error);
    }
};

export const bulkRejectRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requester = getAuthenticatedUser(req);
        const { registrationIds, note } = req.body;

        if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
            res.status(400).json({ success: false, message: 'registrationIds phải là mảng không rỗng' });
            return;
        }

        const ids = registrationIds.map((id: unknown) => parsePositiveInt(String(id), 'registrationId'));
        const results = await registrationsService.bulkRejectRegistrations(ids, requester, note);

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        res.json(successResponse(results, `Đã từ chối ${successCount}/${registrationIds.length} đăng ký. ${failCount > 0 ? `${failCount} thất bại.` : ''}`));
    } catch (error) {
        next(error);
    }
};

// =====================
// Waitlist Controllers
// =====================

export const exportEventRegistrationsCsv = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventId = parsePositiveInt(req.params.eventId, 'eventId');
        const requester = getAuthenticatedUser(req);
        const { status, approval_status } = req.query;

        const csv = await registrationsService.exportEventRegistrationsCsv(eventId, requester, {
            status: typeof status === 'string' ? status : undefined,
            approvalStatus: typeof approval_status === 'string' ? approval_status : undefined,
        });

        const event = await eventService.getById(eventId);
        const filename = `danh-sach-dang-ky-${event.title.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '-')}-${Date.now()}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\ufeff' + csv); // UTF-8 BOM
    } catch (error) {
        next(error);
    }
};

export const joinWaitlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getAuthenticatedUser(req).id;
        const eventId = parsePositiveInt(req.params.eventId, 'eventId');

        const waitlistEntry = await registrationsService.joinWaitlist(userId, eventId);

        res.status(201).json(successResponse(waitlistEntry, 'Đã thêm vào danh sách chờ'));
    } catch (error) {
        next(error);
    }
};

export const leaveWaitlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getAuthenticatedUser(req).id;
        const eventId = parsePositiveInt(req.params.eventId, 'eventId');

        await registrationsService.leaveWaitlist(userId, eventId);

        res.json(successResponse({ message: 'Đã rời danh sách chờ' }));
    } catch (error) {
        next(error);
    }
};

export const getMyWaitlistPosition = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getAuthenticatedUser(req).id;
        const eventId = parsePositiveInt(req.params.eventId, 'eventId');

        const position = await registrationsService.getWaitlistPosition(userId, eventId);

        if (!position) {
            res.json(successResponse({ in_waitlist: false }));
            return;
        }

        res.json(successResponse({
            in_waitlist: true,
            ...position,
        }));
    } catch (error) {
        next(error);
    }
};

export const getEventWaitlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventId = parsePositiveInt(req.params.eventId, 'eventId');
        const requester = getAuthenticatedUser(req);

        const waitlist = await registrationsService.getEventWaitlist(eventId, requester);

        res.json(successResponse(waitlist));
    } catch (error) {
        next(error);
    }
};
