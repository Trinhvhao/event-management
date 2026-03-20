import { Request, Response, NextFunction } from 'express';
import * as registrationsService from '../services/registrations.service';
import { successResponse } from '../utils/response.util';

export const registerForEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { event_id } = req.body;

        const registration = await registrationsService.registerForEvent(userId, event_id);

        res.status(201).json(successResponse(registration, 'Đăng ký sự kiện thành công'));
    } catch (error) {
        next(error);
    }
};

export const getMyRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { status } = req.query;

        const registrations = await registrationsService.getMyRegistrations(userId, status as string);

        res.json(successResponse(registrations));
    } catch (error) {
        next(error);
    }
};

export const cancelRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const registrationId = parseInt(req.params.id as string);

        await registrationsService.cancelRegistration(userId, registrationId);

        res.json(successResponse({ message: 'Hủy đăng ký thành công' }));
    } catch (error) {
        next(error);
    }
};

export const getEventRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const eventId = parseInt(req.params.eventId as string);
        const { status } = req.query;

        const registrations = await registrationsService.getEventRegistrations(eventId, status as string);

        res.json(successResponse(registrations));
    } catch (error) {
        next(error);
    }
};

export const getRegistrationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const registrationId = parseInt(req.params.id as string);

        const registration = await registrationsService.getRegistrationById(registrationId);

        res.json(successResponse(registration));
    } catch (error) {
        next(error);
    }
};
