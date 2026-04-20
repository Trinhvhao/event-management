import { Request, Response, NextFunction } from 'express';
import * as checkinService from '../services/checkin.service';
import { successResponse } from '../utils/response.util';
import { getAuthenticatedUser, parsePositiveInt } from '../utils/request.util';

const sendCheckinSuccess = (res: Response, attendance: Awaited<ReturnType<typeof checkinService.checkinWithQR>>) => {
    res.status(201).json(
        successResponse(
            {
                attendance,
                student: attendance.registration.user,
                event: attendance.registration.event,
            },
            'Check-in thành công'
        )
    );
};

export const scanCheckin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { qr_code } = req.body;
        const user = getAuthenticatedUser(req);

        const attendance = await checkinService.checkinWithQR(qr_code, user.id, user.role);
        sendCheckinSuccess(res, attendance);
    } catch (error) {
        next(error);
    }
};

export const checkin = scanCheckin;

export const manualCheckin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = getAuthenticatedUser(req);
        const eventId = parsePositiveInt(req.body.event_id, 'event_id');

        const registrationId =
            req.body.registration_id === undefined || req.body.registration_id === null || req.body.registration_id === ''
                ? undefined
                : parsePositiveInt(req.body.registration_id, 'registration_id');

        const studentId =
            typeof req.body.student_id === 'string' ? req.body.student_id.trim() : undefined;

        const attendance = await checkinService.checkinManual(
            {
                eventId,
                registrationId,
                studentId,
            },
            user.id,
            user.role
        );

        sendCheckinSuccess(res, attendance);
    } catch (error) {
        next(error);
    }
};

export const getEventAttendances = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const eventId = parsePositiveInt(req.params.eventId, 'eventId');
        const requester = getAuthenticatedUser(req);

        const attendances = await checkinService.getAttendanceByEvent(eventId, requester);

        res.json(successResponse(attendances));
    } catch (error) {
        next(error);
    }
};

export const getAttendanceStats = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const eventId = parsePositiveInt(req.params.eventId, 'eventId');
        const requester = getAuthenticatedUser(req);

        const stats = await checkinService.getAttendanceStats(eventId, requester);

        res.json(successResponse(stats));
    } catch (error) {
        next(error);
    }
};
