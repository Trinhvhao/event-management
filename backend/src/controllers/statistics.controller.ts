import { Request, Response, NextFunction } from 'express';
import { statisticsService } from '../services/statistics.service';
import { successResponse } from '../utils/response.util';
import { getAuthenticatedUser, parsePositiveInt } from '../utils/request.util';

export const statisticsController = {
    async getDashboard(_req: Request, res: Response, next: NextFunction) {
        try {
            const result = await statisticsService.getDashboardStats();
            res.json(successResponse(result));
        } catch (error) { next(error); }
    },
    async getEventStats(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = parsePositiveInt(req.params.id, 'id');
            const result = await statisticsService.getEventStats(eventId);
            res.json(successResponse(result));
        } catch (error) { next(error); }
    },
    async getOrganizerStats(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await statisticsService.getOrganizerStats(getAuthenticatedUser(req).id);
            res.json(successResponse(result));
        } catch (error) { next(error); }
    },
    async getStudentStats(_req: Request, res: Response, next: NextFunction) {
        try {
            const result = await statisticsService.getStudentStats();
            res.json(successResponse(result));
        } catch (error) { next(error); }
    },
    async getDepartmentStats(_req: Request, res: Response, next: NextFunction) {
        try {
            const result = await statisticsService.getDepartmentStats();
            res.json(successResponse(result));
        } catch (error) { next(error); }
    },
};
