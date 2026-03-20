import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const submitFeedbackSchema = z.object({
    event_id: z.number().int().positive('Event ID phải là số dương'),
    rating: z
        .number()
        .int()
        .min(1, 'Rating tối thiểu là 1')
        .max(5, 'Rating tối đa là 5'),
    comment: z.string().max(1000, 'Comment tối đa 1000 ký tự').optional(),
    suggestions: z.string().max(1000, 'Suggestions tối đa 1000 ký tự').optional(),
    is_anonymous: z.boolean().optional().default(false),
});

export const validateSubmitFeedback = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        req.body = submitFeedbackSchema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: error.issues,
            });
            return;
        }
        next(error);
    }
};


