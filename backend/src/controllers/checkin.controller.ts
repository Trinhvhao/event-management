import { Request, Response, NextFunction } from 'express';
import * as checkinService from '../services/checkin.service';
import { successResponse } from '../utils/response.util';

export const checkin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { qr_code } = req.body;
        const checkedBy = req.user!.id;
        const userRole = req.user!.role;

        const attendance = await checkinService.checkinWithQR(qr_code, checkedBy, userRole);

        res.status(201).json(successResponse({
            attendance,
            student: attendance.registration.user,
            event: attendance.registration.event,
        }, 'Check-in thành công'));
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
        const eventId = parseInt(req.params.eventId as string);

        const attendances = await checkinService.getAttendanceByEvent(eventId);

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
        const eventId = parseInt(req.params.eventId as string);

        const stats = await checkinService.getAttendanceStats(eventId);

        res.json(successResponse(stats));
    } catch (error) {
        next(error);
    }
};
