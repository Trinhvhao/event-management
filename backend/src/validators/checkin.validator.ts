import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const checkinSchema = z.object({
    qr_code: z.string().min(1, 'QR code không được để trống'),
});

export const validateCheckin = (req: Request, res: Response, next: NextFunction) => {
    try {
        req.body = checkinSchema.parse(req.body);
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

