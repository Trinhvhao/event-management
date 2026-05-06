import prisma from '../config/database';
import { PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../middleware/errorHandler';
import * as emailService from './email.service';
import * as notificationsService from './notifications.service';
import QRCode from 'qrcode';

// ─── PayOS Configuration ───────────────────────────────────────────────────────

interface PayOSConfig {
    clientId: string;
    apiKey: string;
    checksumKey: string;
    baseUrl: string;
}

const getPayOSConfig = (): PayOSConfig => ({
    clientId: process.env.PAYOS_CLIENT_ID || '',
    apiKey: process.env.PAYOS_API_KEY || '',
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
    baseUrl: process.env.PAYOS_BASE_URL || 'https://api.payos.vn',
});

const PAYMENT_EXPIRY_MINUTES = 15;
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:7777';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatePaymentParams {
    userId: number;
    eventId: number;
    registrationId: number;
}

export interface PaymentRecord {
    id: number;
    registration_id: number;
    user_id: number;
    event_id: number;
    amount: number;
    currency: string;
    status: PaymentStatus;
    method: PaymentMethod;
    payos_order_id: string | null;
    payos_payment_id: string | null;
    transaction_id: string | null;
    paid_at: Date | null;
    expires_at: Date | null;
    created_at: Date;
    event?: {
        id: number;
        title: string;
        start_time: Date;
        end_time: Date;
        location: string;
        training_points: number;
    };
    user?: {
        id: number;
        full_name: string;
        email: string;
    };
}

type PrismaPaymentWithRelations = Prisma.PaymentGetPayload<{
    include: {
        user: { select: { id: true; full_name: true; email: true } };
        event: { select: { id: true; title: true; start_time: true; end_time: true; location: true; training_points: true } };
    };
}>;

function toPaymentRecord(p: PrismaPaymentWithRelations): PaymentRecord {
    return {
        id: p.id,
        registration_id: p.registration_id,
        user_id: p.user_id,
        event_id: p.event_id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        method: p.method,
        payos_order_id: p.payos_order_id,
        payos_payment_id: p.payos_payment_id,
        transaction_id: p.transaction_id,
        paid_at: p.paid_at,
        expires_at: p.expires_at,
        created_at: p.created_at,
        event: p.event ? {
            id: p.event.id,
            title: p.event.title,
            start_time: p.event.start_time,
            end_time: p.event.end_time,
            location: p.event.location,
            training_points: p.event.training_points,
        } : undefined,
        user: p.user ? {
            id: p.user.id,
            full_name: p.user.full_name,
            email: p.user.email,
        } : undefined,
    };
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function hmacSha256(data: string, key: string): string {
    const crypto = require('crypto') as typeof import('crypto');
    return crypto.createHmac('sha256', key).update(data).digest('hex');
}

function buildPayOSSignatureString(data: Record<string, string | number>): string {
    const sorted = Object.keys(data)
        .filter(k => data[k] !== undefined && data[k] !== null && data[k] !== '')
        .sort()
        .map(k => `${k}=${data[k]}`)
        .join('&');
    return sorted;
}

// ─── Core Payment Service ────────────────────────────────────────────────────

/**
 * Creates a pending payment record for a registration and returns
 * a PayOS payment link URL for the user to complete payment.
 */
export const createPayment = async (params: CreatePaymentParams): Promise<{
    paymentId: number;
    checkoutUrl: string;
    payosOrderId: string;
    expiresAt: Date;
}> => {
    const { userId, eventId, registrationId } = params;

    // Verify registration belongs to user and is in pending_payment status
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    event_cost: true,
                    start_time: true,
                    status: true,
                    deleted_at: true,
                },
            },
            user: {
                select: { id: true, full_name: true, email: true },
            },
        },
    });

    if (!registration) {
        throw new NotFoundError('Đăng ký không tồn tại');
    }

    if (registration.user_id !== userId) {
        throw new ForbiddenError('Bạn không có quyền thanh toán đăng ký này');
    }

    if (registration.event.deleted_at) {
        throw new ValidationError('Sự kiện không còn tồn tại');
    }

    if (Number(registration.event.event_cost) <= 0) {
        throw new ValidationError('Sự kiện này không yêu cầu thanh toán');
    }

    if (registration.status === 'cancelled') {
        throw new ConflictError('Đăng ký đã bị hủy');
    }

    if (registration.status === 'attended') {
        throw new ConflictError('Sinh viên đã tham dự sự kiện này');
    }

    // Check for existing pending payment
    const existingPayment = await prisma.payment.findUnique({
        where: { registration_id: registrationId },
    });

    if (existingPayment && existingPayment.status === 'paid') {
        throw new ConflictError('Thanh toán đã được xác nhận');
    }

    if (existingPayment && existingPayment.status === 'pending') {
        // If there's an existing pending payment that hasn't expired, reuse it
        if (existingPayment.expires_at && existingPayment.expires_at > new Date()) {
            return {
                paymentId: existingPayment.id,
                checkoutUrl: buildPayOSCheckoutUrl(existingPayment.payos_order_id || '', registration.event.title, Number(registration.event.event_cost), existingPayment.id),
                payosOrderId: existingPayment.payos_order_id || '',
                expiresAt: existingPayment.expires_at,
            };
        }
        // Expire the old one
        if (existingPayment.status === 'pending') {
            await prisma.payment.update({
                where: { id: existingPayment.id },
                data: { status: 'expired' },
            });
        }
    }

    // Create PayOS order
    const amount = Math.round(Number(registration.event.event_cost));
    const orderCode = Math.floor(Date.now() / 1000) + registrationId * 1000 + userId;
    const description = `Thanh toan su kien: ${registration.event.title}`;
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000);
    const cancelUrl = `${FRONTEND_URL}/dashboard/events/${eventId}`;
    const returnUrl = `${FRONTEND_URL}/dashboard/payment/success?payment_id=${registrationId}`;

    // Build signature for PayOS
    const signatureData: Record<string, string | number> = {
        amount,
        cancelUrl,
        clientId: getPayOSConfig().clientId,
        description,
        orderCode,
        returnUrl,
    };
    const signatureString = buildPayOSSignatureString(signatureData);
    const signature = hmacSha256(signatureString, getPayOSConfig().checksumKey);

    // Call PayOS API to create payment link
    const payosBody = {
        clientId: getPayOSConfig().clientId,
        apiKey: getPayOSConfig().apiKey,
        amount,
        cancelUrl,
        description,
        orderCode,
        returnUrl,
        signature,
        buyerName: registration.user.full_name,
        buyerEmail: registration.user.email,
    };

    let payosCheckoutUrl: string;
    let payosPaymentId: string | null = null;

    try {
        const payosResponse = await fetch(`${getPayOSConfig().baseUrl}/v1/payment-window`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payosBody),
        });

        if (!payosResponse.ok) {
            const errorText = await payosResponse.text();
            console.error('[PayOS] Failed to create payment:', errorText);
            throw new ValidationError('Không thể tạo liên kết thanh toán. Vui lòng thử lại.');
        }

        const payosData = await payosResponse.json() as { checkoutUrl?: string; id?: string; error?: string };
        if (!payosData.checkoutUrl) {
            throw new ValidationError(payosData.error || 'PayOS không trả về liên kết thanh toán');
        }
        payosCheckoutUrl = payosData.checkoutUrl;
        payosPaymentId = payosData.id ? String(payosData.id) : null;
    } catch (err) {
        if (err instanceof ValidationError) throw err;
        console.error('[PayOS] Network error:', err);
        throw new ValidationError('Không thể kết nối với cổng thanh toán PayOS. Vui lòng thử lại sau.');
    }

    // Create or update payment record
    const payment = existingPayment
        ? await prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
                amount: amount,
                status: 'pending',
                method: 'payos',
                payos_order_id: String(orderCode),
                payos_payment_id: payosPaymentId,
                expires_at: expiresAt,
            },
        })
        : await prisma.payment.create({
            data: {
                registration_id: registrationId,
                user_id: userId,
                event_id: eventId,
                amount,
                currency: 'VND',
                status: 'pending',
                method: 'payos',
                payos_order_id: String(orderCode),
                payos_payment_id: payosPaymentId,
                expires_at: expiresAt,
            },
        });

    return {
        paymentId: payment.id,
        checkoutUrl: payosCheckoutUrl,
        payosOrderId: String(orderCode),
        expiresAt,
    };
};

function buildPayOSCheckoutUrl(orderCode: string, _title: string, amount: number, _paymentId: number): string {
    return `${getPayOSConfig().baseUrl}/checkout/${orderCode}?amount=${amount}`;
}

/**
 * Handles PayOS webhook callback to confirm payment.
 * Called by the PayOS API when a payment is completed.
 */
export const handlePayOSWebhook = async (payload: {
    orderCode: string;
    paymentNo: string;
    amount: number;
    status: string;
    signature: string;
}): Promise<{ success: boolean; message: string }> => {
    const { orderCode, paymentNo, amount, status, signature } = payload;

    // Verify signature
    const signatureData: Record<string, string | number> = {
        amount,
        orderCode,
        paymentNo,
        status,
    };
    const expectedSig = hmacSha256(buildPayOSSignatureString(signatureData), getPayOSConfig().checksumKey);

    if (signature !== expectedSig) {
        console.warn('[Payment] Invalid webhook signature:', { orderCode, paymentNo });
        return { success: false, message: 'Invalid signature' };
    }

    // Find payment by payos_order_id
    const payment = await prisma.payment.findUnique({
        where: { payos_order_id: String(orderCode) },
        include: {
            user: { select: { id: true, full_name: true, email: true } },
            event: { select: { id: true, title: true, start_time: true, end_time: true, location: true, training_points: true } },
        },
    });

    if (!payment) {
        return { success: false, message: 'Payment not found' };
    }

    if (payment.status === 'paid') {
        return { success: true, message: 'Already confirmed' };
    }

    if (status === 'PAID' || status === 'success' || status === '00') {
        await confirmPayment(payment.id, paymentNo);
        return { success: true, message: 'Payment confirmed' };
    }

    if (status === 'CANCELLED' || status === 'FAILED') {
        await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'failed', failure_reason: `PayOS status: ${status}` },
        });
        return { success: true, message: 'Payment marked as failed' };
    }

    return { success: true, message: 'Status processed' };
};

/**
 * Confirm a payment after webhook or manual verification.
 * Creates registration + sends confirmation email.
 */
export const confirmPayment = async (paymentId: number, transactionId?: string): Promise<PaymentRecord> => {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
            user: { select: { id: true, full_name: true, email: true } },
            event: { select: { id: true, title: true, start_time: true, end_time: true, location: true, training_points: true } },
        },
    });

    if (!payment) {
        throw new NotFoundError('Thanh toán không tồn tại');
    }

    if (payment.status === 'paid') {
        return toPaymentRecord(payment);
    }

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({
        registration_id: payment.registration_id,
        event_id: payment.event_id,
        user_id: payment.user_id,
        issued_at: new Date().toISOString(),
        expires_at: payment.event.start_time.toISOString(),
    }));

    const [updatedPayment] = await prisma.$transaction([
        prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'paid',
                paid_at: new Date(),
                transaction_id: transactionId || payment.payos_payment_id || `PAYO-${paymentId}-${Date.now()}`,
            },
        }),
        prisma.registration.update({
            where: { id: payment.registration_id },
            data: { qr_code: qrCodeDataUrl },
        }),
    ]);

    // Send confirmation email with QR code
    try {
        await emailService.sendRegistrationConfirmation({
            email: payment.user.email,
            fullName: payment.user.full_name,
            eventTitle: payment.event.title,
            eventLocation: payment.event.location,
            eventStartTime: payment.event.start_time,
            eventEndTime: payment.event.end_time,
            trainingPoints: payment.event.training_points,
            qrCodeDataUrl,
            eventCost: Number(payment.amount),
        });
    } catch (emailError) {
        console.error('[Payment] Failed to send confirmation email:', emailError);
    }

    // Send in-app notification
    try {
        await notificationsService.notifyRegistrationConfirm(
            payment.user_id,
            payment.event_id,
            payment.event.title,
            payment.event.location,
            payment.event.start_time,
            payment.event.end_time,
            payment.event.training_points,
            qrCodeDataUrl,
            Number(payment.amount)
        );
    } catch (notifError) {
        console.error('[Payment] Failed to send notification:', notifError);
    }

    return updatedPayment as unknown as PaymentRecord;
};

/**
 * Get payment by ID with related data.
 */
export const getPaymentById = async (paymentId: number, userId: number): Promise<PaymentRecord> => {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
            user: { select: { id: true, full_name: true, email: true } },
            event: { select: { id: true, title: true, start_time: true, end_time: true, location: true, training_points: true } },
        },
    });

    if (!payment) {
        throw new NotFoundError('Thanh toán không tồn tại');
    }

    if (payment.user_id !== userId) {
        throw new ForbiddenError('Bạn không có quyền xem thanh toán này');
    }

    return toPaymentRecord(payment);
};

/**
 * Get all payments for a user.
 */
export const getMyPayments = async (userId: number, limit = 20, offset = 0) => {
    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where: { user_id: userId },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        start_time: true,
                        location: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.payment.count({ where: { user_id: userId } }),
    ]);

    return {
        payments: payments.map(p => ({
            id: p.id,
            registration_id: p.registration_id,
            user_id: p.user_id,
            event_id: p.event_id,
            amount: Number(p.amount),
            currency: p.currency,
            status: p.status,
            method: p.method,
            payos_order_id: p.payos_order_id,
            payos_payment_id: p.payos_payment_id,
            transaction_id: p.transaction_id,
            paid_at: p.paid_at,
            expires_at: p.expires_at,
            created_at: p.created_at,
            event: p.event,
        })),
        total,
        limit,
        offset,
        has_more: offset + limit < total
    };
};

/**
 * Cancel a pending payment (user-initiated).
 */
export const cancelPayment = async (paymentId: number, userId: number): Promise<void> => {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
    });

    if (!payment) {
        throw new NotFoundError('Thanh toán không tồn tại');
    }

    if (payment.user_id !== userId) {
        throw new ForbiddenError('Bạn không có quyền hủy thanh toán này');
    }

    if (payment.status !== 'pending') {
        throw new ConflictError('Chỉ có thể hủy thanh toán đang chờ xử lý');
    }

    await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'cancelled' },
    });
};

/**
 * Check and expire stale pending payments (called by scheduler or on demand).
 */
export const expireStalePayments = async (): Promise<number> => {
    const result = await prisma.payment.updateMany({
        where: {
            status: 'pending',
            expires_at: { lt: new Date() },
        },
        data: { status: 'expired' },
    });
    return result.count;
};

/**
 * Poll PayOS for payment status (fallback if webhook fails).
 */
export const pollPayOSPayment = async (paymentId: number): Promise<{ status: PaymentStatus; checkoutUrl?: string }> => {
    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
    });

    if (!payment) {
        throw new NotFoundError('Thanh toán không tồn tại');
    }

    if (!payment.payos_order_id) {
        throw new ValidationError('Không tìm thấy mã PayOS');
    }

    if (payment.status === 'paid' || payment.status === 'failed' || payment.status === 'cancelled') {
        return { status: payment.status };
    }

    // Call PayOS API to check status
    const signatureData: Record<string, string | number> = {
        clientId: getPayOSConfig().clientId,
        apiKey: getPayOSConfig().apiKey,
        orderCode: Number(payment.payos_order_id),
    };
    const signature = hmacSha256(buildPayOSSignatureString(signatureData), getPayOSConfig().checksumKey);

    try {
        const url = `${getPayOSConfig().baseUrl}/v1/payment-window/${payment.payos_order_id}/status`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'X-Payment-Id': getPayOSConfig().clientId,
                'X-Api-Key': getPayOSConfig().apiKey,
                'X-Signature': signature,
            },
        });

        if (response.ok) {
            const data = await response.json() as { status?: string };
            if (data.status === 'PAID' || data.status === 'success') {
                await confirmPayment(paymentId);
                return { status: 'paid' };
            }
            if (data.status === 'CANCELLED' || data.status === 'FAILED') {
                await prisma.payment.update({
                    where: { id: paymentId },
                    data: { status: 'failed' },
                });
                return { status: 'failed' };
            }
        }
    } catch (err) {
        console.error('[Payment] Poll error:', err);
    }

    return { status: payment.status };
};
