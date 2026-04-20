import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const checkinSchema = z.object({
    qr_code: z.string().min(1, 'QR code không được để trống'),
});

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

const optionalStudentId = z.preprocess(
    (value) => {
        if (value === undefined || value === null) {
            return undefined;
        }

        if (typeof value !== 'string') {
            return value;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().min(1).optional()
);

const manualCheckinSchema = z
    .object({
        event_id: z.coerce.number().int().positive('event_id phải là số nguyên dương'),
        registration_id: optionalPositiveInt,
        student_id: optionalStudentId,
    })
    .refine((data) => data.registration_id !== undefined || data.student_id !== undefined, {
        message: 'Cần cung cấp registration_id hoặc student_id',
        path: ['registration_id'],
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

export const validateCheckin = (req: Request, res: Response, next: NextFunction) => {
    try {
        req.body = checkinSchema.parse(req.body);
        next();
    } catch (error) {
        handleValidationError(error, res, next);
    }
};

export const validateManualCheckin = (req: Request, res: Response, next: NextFunction) => {
    try {
        req.body = manualCheckinSchema.parse(req.body);
        next();
    } catch (error) {
        handleValidationError(error, res, next);
    }
};

