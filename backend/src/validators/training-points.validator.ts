import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const optionalPositiveInt = z.preprocess(
    (value) => {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }

        if (typeof value === 'string') {
            return Number.parseInt(value, 10);
        }

        return value;
    },
    z.number().int().positive().optional()
);

const optionalSemester = z.preprocess(
    (value) => {
        if (value === undefined || value === null) {
            return undefined;
        }

        if (typeof value !== 'string') {
            return value;
        }

        const normalized = value.trim();
        return normalized.length > 0 ? normalized : undefined;
    },
    z.string().optional()
);

const awardPointsSchema = z.object({
    user_id: z.coerce.number().int().positive('user_id phải là số nguyên dương'),
    event_id: z.coerce.number().int().positive('event_id phải là số nguyên dương'),
    points: optionalPositiveInt,
    semester: optionalSemester,
});

const exportPointsQuerySchema = z.object({
    semester: optionalSemester,
    event_id: optionalPositiveInt,
    user_id: optionalPositiveInt,
    format: z
        .preprocess((value) => {
            if (value === undefined || value === null || value === '') {
                return 'json';
            }

            if (typeof value !== 'string') {
                return value;
            }

            return value.trim().toLowerCase();
        }, z.enum(['json', 'csv']))
        .optional(),
});

const handleValidationError = (error: unknown, res: Response, next: NextFunction) => {
    if (error instanceof z.ZodError) {
        res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: error.issues,
        });
        return;
    }

    next(error);
};

export const validateAwardPoints = (req: Request, res: Response, next: NextFunction) => {
    try {
        req.body = awardPointsSchema.parse(req.body);
        next();
    } catch (error) {
        handleValidationError(error, res, next);
    }
};

export const validateExportPointsQuery = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const parsed = exportPointsQuerySchema.parse(req.query);
        res.locals.exportPointsQuery = parsed;
        next();
    } catch (error) {
        handleValidationError(error, res, next);
    }
};
