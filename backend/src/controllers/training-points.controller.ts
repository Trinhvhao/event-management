import { Request, Response, NextFunction } from 'express';
import * as trainingPointsService from '../services/training-points.service';
import { successResponse } from '../utils/response.util';
import {
    getAuthenticatedUser,
    getQueryString,
    parsePositiveInt,
    parseQueryInt,
} from '../utils/request.util';

export const getMyPoints = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getAuthenticatedUser(req).id;

        const points = await trainingPointsService.getMyTrainingPoints(userId);

        res.json(successResponse(points, 'Lấy điểm rèn luyện thành công'));
    } catch (error) {
        next(error);
    }
};

export const getMyPointsHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = getAuthenticatedUser(req).id;
        const { semester, limit, offset } = req.query;

        const history = await trainingPointsService.getMyPointsHistory(
            userId,
            getQueryString(semester),
            parseQueryInt(limit, 50, 'limit', { min: 1 }),
            parseQueryInt(offset, 0, 'offset', { min: 0 })
        );

        res.json(successResponse(history, 'Lấy lịch sử điểm rèn luyện thành công'));
    } catch (error) {
        next(error);
    }
};

export const getUserPoints = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = parsePositiveInt(req.params.userId, 'userId');

        const points = await trainingPointsService.getUserTrainingPoints(userId);

        res.json(successResponse(points, 'Lấy điểm rèn luyện thành công'));
    } catch (error) {
        next(error);
    }
};

export const getStatistics = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const stats = await trainingPointsService.getTrainingPointsStatistics();

        res.json(successResponse(stats, 'Lấy thống kê thành công'));
    } catch (error) {
        next(error);
    }
};

export const getCurrentSemester = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const semester = trainingPointsService.getCurrentSemester();

        res.json(successResponse({ semester }, 'Lấy học kỳ hiện tại thành công'));
    } catch (error) {
        next(error);
    }
};

