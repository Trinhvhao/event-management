import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';
import { ValidationError, AppError } from '../middleware/errorHandler';
import type { AuthRequest } from '../middleware/auth';

const isPayOSPayload = (body: any): boolean => {
    return !!(body.orderCode || body.paymentNo || body.signature);
};

export const handleWebhook = async (req: Request, res: Response) => {
    try {
        let result;
        if (isPayOSPayload(req.body)) {
            result = await paymentService.handlePayOSWebhook(req.body);
        } else {
            result = await paymentService.handleSePayWebhook(req.body);
        }
        res.status(200).json(result);
    } catch (error: unknown) {
        console.error('[Webhook] Error:', error);
        res.status(200).json({ success: false, message: 'Webhook processing error' });
    }
};

export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { event_id, registration_id } = req.body as { event_id?: unknown; registration_id?: unknown };

        if (!event_id || !registration_id) {
            throw new ValidationError('Thiếu event_id hoặc registration_id');
        }

        const result = await paymentService.createPayment({
            userId,
            eventId: Number(event_id),
            registrationId: Number(registration_id),
        });

        res.status(201).json({
            success: true,
            data: {
                paymentId: result.paymentId,
                paymentCode: result.paymentCode,
                expiresAt: result.expiresAt,
                bankAccountNumber: result.bankAccountNumber,
                bankName: result.bankName,
                amount: result.amount,
                transferNote: result.transferNote,
                vietQrUrl: result.vietQrUrl,
            },
        });
    } catch (error: unknown) {
        if (error instanceof AppError) { next(error); return; }
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi tạo thanh toán' },
        });
    }
};

export const getMyPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const limit = parseInt(String(req.query.limit || '20'));
        const offset = parseInt(String(req.query.offset || '0'));

        const result = await paymentService.getMyPayments(userId, limit, offset);

        res.json({ success: true, data: result });
    } catch (error: unknown) {
        if (error instanceof AppError) { next(error); return; }
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi lấy danh sách thanh toán' },
        });
    }
};

export const getPaymentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const paymentId = parseInt(String(req.params.id));

        const payment = await paymentService.getPaymentById(paymentId, userId);

        res.json({ success: true, data: payment });
    } catch (error: unknown) {
        if (error instanceof AppError) { next(error); return; }
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi lấy chi tiết thanh toán' },
        });
    }
};

export const cancelPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const paymentId = parseInt(String(req.params.id));

        await paymentService.cancelPayment(paymentId, userId);

        res.json({ success: true, message: 'Đã hủy thanh toán thành công' });
    } catch (error: unknown) {
        if (error instanceof AppError) { next(error); return; }
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi hủy thanh toán' },
        });
    }
};

export const pollPaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const paymentId = parseInt(String(req.params.id));

        await paymentService.getPaymentById(paymentId, userId);

        const result = await paymentService.pollPayOSPayment(paymentId);

        res.json({ success: true, data: result });
    } catch (error: unknown) {
        if (error instanceof AppError) { next(error); return; }
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi kiểm tra trạng thái thanh toán' },
        });
    }
};
