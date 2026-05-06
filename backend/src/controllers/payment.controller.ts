import { Request, Response } from 'express';
import * as paymentService from '../services/payment.service';
import { ValidationError } from '../middleware/errorHandler';
import type { AuthRequest } from '../middleware/auth';

export const createPayment = async (req: AuthRequest, res: Response) => {
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
            data: result,
        });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi tạo thanh toán' },
        });
    }
};

export const getMyPayments = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const limit = parseInt(String(req.query.limit || '20'));
        const offset = parseInt(String(req.query.offset || '0'));

        const result = await paymentService.getMyPayments(userId, limit, offset);

        res.json({ success: true, data: result });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi lấy danh sách thanh toán' },
        });
    }
};

export const getPaymentById = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const paymentId = parseInt(String(req.params.id));

        const payment = await paymentService.getPaymentById(paymentId, userId);

        res.json({ success: true, data: payment });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi lấy chi tiết thanh toán' },
        });
    }
};

export const cancelPayment = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const paymentId = parseInt(String(req.params.id));

        await paymentService.cancelPayment(paymentId, userId);

        res.json({ success: true, message: 'Đã hủy thanh toán thành công' });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi hủy thanh toán' },
        });
    }
};

export const pollPaymentStatus = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const paymentId = parseInt(String(req.params.id));

        await paymentService.getPaymentById(paymentId, userId);

        const result = await paymentService.pollPayOSPayment(paymentId);

        res.json({ success: true, data: result });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi kiểm tra trạng thái thanh toán' },
        });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const body = req.body as { orderCode?: string; paymentNo?: string; amount?: number; status?: string; signature?: string };
        const result = await paymentService.handlePayOSWebhook({
            orderCode: String(body.orderCode || ''),
            paymentNo: String(body.paymentNo || ''),
            amount: Number(body.amount || 0),
            status: String(body.status || ''),
            signature: String(body.signature || ''),
        });
        res.json(result);
    } catch (error: unknown) {
        console.error('[Webhook] Error:', error);
        res.json({ success: false, message: 'Webhook processing error' });
    }
};
