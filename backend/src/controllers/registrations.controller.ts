import { Request, Response, NextFunction } from 'express';
import * as registrationsService from '../services/registrations.service';
import { successResponse } from '../utils/response.util';
import {
    getAuthenticatedUser,
    getQueryString,
    parsePositiveInt,
} from '../utils/request.util';

export const registerForEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getAuthenticatedUser(req).id;
        const { event_id } = req.body;
        const eventId = parsePositiveInt(event_id, 'event_id');

        const registration = await registrationsService.registerForEvent(userId, eventId);

        res.status(201).json(successResponse(registration, 'Đăng ký sự kiện thành công'));
    } catch (error) {
        next(error);
    }
};

export const getMyRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getAuthenticatedUser(req).id;
        const { status } = req.query;

        const registrations = await registrationsService.getMyRegistrations(userId, getQueryString(status));

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
        const { status } = req.query;
        const requester = getAuthenticatedUser(req);

        const registrations = await registrationsService.getEventRegistrations(
            eventId,
            getQueryString(status),
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
// Waitlist Controllers
// =====================

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
