import { Request, Response, NextFunction } from 'express';
import * as trainingPointsService from '../services/training-points.service';
import { successResponse } from '../utils/response.util';

export const getMyPoints = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

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
        const userId = req.user!.id;
        const { semester, limit, offset } = req.query;

        const history = await trainingPointsService.getMyPointsHistory(
            userId,
            semester as string,
            limit ? parseInt(limit as string) : 50,
            offset ? parseInt(offset as string) : 0
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
        const userId = parseInt(req.params.userId as string);

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

