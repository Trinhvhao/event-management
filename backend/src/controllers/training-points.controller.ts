import { Request, Response, NextFunction } from 'express';
import * as trainingPointsService from '../services/training-points.service';
import { successResponse } from '../utils/response.util';
import {
    getAuthenticatedUser,
    getQueryString,
    parseOptionalPositiveInt,
    parsePositiveInt,
    parseQueryInt,
} from '../utils/request.util';

type ExportRecord = {
    user_id: number;
    student_id: string | null;
    full_name: string;
    event_id: number;
    event_title: string;
    points: number;
    semester: string;
    earned_at: Date;
};

const toCsvCell = (value: string | number | null) => {
    const normalized = value === null ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
};

const toExportCsv = (rows: ExportRecord[]) => {
    const headers = [
        'user_id',
        'student_id',
        'full_name',
        'event_id',
        'event_title',
        'points',
        'semester',
        'earned_at',
    ];

    const csvRows = rows.map((row) =>
        [
            row.user_id,
            row.student_id,
            row.full_name,
            row.event_id,
            row.event_title,
            row.points,
            row.semester,
            row.earned_at.toISOString(),
        ]
            .map(toCsvCell)
            .join(',')
    );

    return [headers.map(toCsvCell).join(','), ...csvRows].join('\n');
};

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

export const awardPoints = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requester = getAuthenticatedUser(req);
        const { user_id, event_id, points, semester } = req.body;

        const awardedPoint = await trainingPointsService.awardTrainingPoints(
            {
                userId: parsePositiveInt(user_id, 'user_id'),
                eventId: parsePositiveInt(event_id, 'event_id'),
                points: parseOptionalPositiveInt(points, 'points'),
                semester: getQueryString(semester),
            },
            requester
        );

        res.status(201).json(successResponse(awardedPoint, 'Cộng điểm rèn luyện thành công'));
    } catch (error) {
        next(error);
    }
};

export const exportPoints = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requester = getAuthenticatedUser(req);
        const validatedQuery = (res.locals.exportPointsQuery || req.query) as {
            semester?: unknown;
            event_id?: unknown;
            user_id?: unknown;
            format?: unknown;
        };
        const { semester, event_id, user_id, format } = validatedQuery;

        const payload = await trainingPointsService.exportTrainingPoints(
            {
                semester: getQueryString(semester),
                eventId: parseOptionalPositiveInt(event_id, 'event_id'),
                userId: parseOptionalPositiveInt(user_id, 'user_id'),
            },
            requester
        );

        if (getQueryString(format) === 'csv') {
            const csv = toExportCsv(payload.records as ExportRecord[]);
            const fileName = `training-points-${new Date().toISOString().slice(0, 10)}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.status(200).send(`\ufeff${csv}`);
            return;
        }

        res.json(successResponse(payload, 'Xuất dữ liệu điểm rèn luyện thành công'));
    } catch (error) {
        next(error);
    }
};

