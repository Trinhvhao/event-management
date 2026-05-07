import prisma from '../config/database';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../middleware/errorHandler';
import * as emailService from './email.service';
import * as notificationsService from './notifications.service';
import QRCode from 'qrcode';

// ─── SePay Configuration ───────────────────────────────────────────────────────

const getSePayConfig = () => ({
    webhookUrl: process.env.SEPAY_WEBHOOK_URL || '',
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
    bankName: process.env.SEPAY_BANK_NAME || '',
});

const PAYMENT_CODE_PREFIX = 'EVT';
const PAYMENT_CODE_EXPIRY_HOURS = 24;

function generatePaymentCode(registrationId: number, eventId: number): string {
    const timestamp = Math.floor(Date.now() / 1000) % 100000;
    return `${PAYMENT_CODE_PREFIX}${eventId}-${registrationId}-${timestamp}`;
}

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
    payment_code?: string;
}

function toRecord(p: {
    id: number; registration_id: number; user_id: number; event_id: number;
    amount: unknown; currency: string; status: PaymentStatus; method: PaymentMethod;
    payos_order_id: string | null; payos_payment_id: string | null; transaction_id: string | null;
    paid_at: Date | null; expires_at: Date | null; created_at: Date;
    event?: { id: number; title: string; start_time: Date; end_time: Date; location: string; training_points: number } | null;
    user?: { id: number; full_name: string; email: string } | null;
    payos_order_id_code?: string;
}): PaymentRecord {
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
        event: p.event ?? undefined,
        user: p.user ?? undefined,
        payment_code: p.payos_order_id_code ?? p.payos_order_id ?? undefined,
    };
}

// ─── Core Payment Service ─────────────────────────────────────────────────────

export const createPayment = async (params: CreatePaymentParams) => {
    const { userId, eventId, registrationId } = params;

    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
    });

    if (!registration) throw new NotFoundError('Dang ky khong ton tai');
    if (registration.user_id !== userId) throw new ForbiddenError('Ban khong co quyen thanh toan');
    if (registration.status === 'cancelled') throw new ConflictError('Dang ky da bi huy');
    if (registration.status === 'attended') throw new ConflictError('Sinh vien da tham du');

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundError('Su kien khong ton tai');
    if (event.deleted_at) throw new ValidationError('Su kien khong con ton tai');
    if (Number(event.event_cost) <= 0) throw new ValidationError('Su kien khong yeu cau thanh toan');

    const existing = await prisma.payment.findUnique({ where: { registration_id: registrationId } });
    if (existing) {
        if (existing.status === 'paid') throw new ConflictError('Thanh toan da xac nhan');
    }

    const paymentCode = generatePaymentCode(registrationId, eventId);
    const amount = Math.round(Number(event.event_cost));
    const expiresAt = new Date(Date.now() + PAYMENT_CODE_EXPIRY_HOURS * 60 * 60 * 1000);
    const sepayCfg = getSePayConfig();

    const payment = existing
        ? await prisma.payment.update({
            where: { id: existing.id },
            data: { amount, status: 'pending', method: 'bank_transfer', expires_at: expiresAt, payos_order_id: paymentCode },
        })
        : await prisma.payment.create({
            data: {
                registration_id: registrationId, user_id: userId, event_id: eventId,
                amount, currency: 'VND', status: 'pending', method: 'bank_transfer',
                payos_order_id: paymentCode, expires_at: expiresAt,
            },
        });

    return {
        paymentId: payment.id,
        paymentCode,
        expiresAt,
        bankAccountNumber: sepayCfg.accountNumber,
        bankName: sepayCfg.bankName,
        amount,
        transferNote: paymentCode,
    };
};

export const handleSePayWebhook = async (payload: {
    id?: number | string;
    gateway?: string;
    transactionDate?: string;
    accountNumber?: string;
    code?: string | null;
    content?: string;
    transferType?: string;
    transferAmount?: number;
    accumulated?: number;
    subAccount?: string | null;
    referenceCode?: string;
    description?: string;
}) => {
    if (payload.transferType !== 'in') return { success: true, message: 'Ignored: not incoming' };
    if (!payload.content || !payload.transferAmount) return { success: false, message: 'Missing fields' };

    const match = payload.content.match(/EVT(\d+)-(\d+)-(\d+)/);
    if (!match) return { success: true, message: 'No payment code in content' };

    const eventId = parseInt(match[1]);
    const registrationId = parseInt(match[2]);

    // Find payment by pattern in payos_order_id (status filter removed to catch already-paid payments)
    const payments = await prisma.payment.findMany({
        where: { event_id: eventId, registration_id: registrationId },
    });

    const payment = payments.find(p => p.payos_order_id?.startsWith(`EVT${eventId}-${registrationId}-`));
    if (!payment) return { success: true, message: 'Payment not found' };

    if (payment.status === 'paid') return { success: true, message: 'Already confirmed' };

    if (payment.status !== 'pending') return { success: false, message: `Payment status is ${payment.status}` };

    const expected = Number(payment.amount);
    if (Math.abs(payload.transferAmount - expected) > 100) {
        return { success: false, message: 'Amount mismatch' };
    }

    await confirmPayment(payment.id, String(payload.id ?? ''), {
        gateway: payload.gateway,
        transactionDate: payload.transactionDate,
        accountNumber: payload.accountNumber,
        referenceCode: payload.referenceCode,
    });

    return { success: true, message: 'Payment confirmed' };
};

export const confirmPayment = async (
    paymentId: number,
    transactionId?: string,
    extraData?: { gateway?: string; transactionDate?: string; accountNumber?: string; referenceCode?: string },
) => {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Thanh toan khong ton tai');
    if (payment.status === 'paid') {
        return toRecord({ ...payment, payos_order_id_code: payment.payos_order_id ?? undefined });
    }

    const [user, event] = await Promise.all([
        prisma.user.findUnique({ where: { id: payment.user_id }, select: { id: true, full_name: true, email: true } }),
        prisma.event.findUnique({ where: { id: payment.event_id }, select: { id: true, title: true, start_time: true, end_time: true, location: true, training_points: true } }),
    ]);

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({
        registration_id: payment.registration_id,
        event_id: payment.event_id,
        user_id: payment.user_id,
        issued_at: new Date().toISOString(),
        expires_at: event?.start_time.toISOString(),
    }));

    const metadata: Record<string, string | number | boolean | null> = { method: 'sepay' };
    if (extraData?.gateway) metadata.gateway = extraData.gateway;
    if (extraData?.transactionDate) metadata.transaction_date = extraData.transactionDate;
    if (extraData?.accountNumber) metadata.bank_account = extraData.accountNumber;
    if (extraData?.referenceCode) metadata.reference_code = extraData.referenceCode;

    const [updated] = await prisma.$transaction([
        prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: 'paid', paid_at: new Date(),
                transaction_id: transactionId || `SE-${paymentId}-${Date.now()}`,
                payos_payment_id: String(transactionId || paymentId),
                metadata,
            },
        }),
        prisma.registration.update({
            where: { id: payment.registration_id },
            data: { qr_code: qrCodeDataUrl },
        }),
    ]);

    if (user && event) {
        try {
            await emailService.sendRegistrationConfirmation({
                email: user.email, fullName: user.full_name,
                eventTitle: event.title, eventLocation: event.location,
                eventStartTime: event.start_time, eventEndTime: event.end_time,
                trainingPoints: event.training_points, qrCodeDataUrl,
                eventCost: Number(payment.amount),
            });
        } catch (e) { console.error('[Payment] Email error:', e); }
        try {
            await notificationsService.notifyRegistrationConfirm(
                payment.user_id, payment.event_id, event.title, event.location,
                event.start_time, event.end_time, event.training_points, qrCodeDataUrl, Number(payment.amount),
            );
        } catch (e) { console.error('[Payment] Notification error:', e); }
    }

    return toRecord({ ...updated, event, user, payos_order_id_code: updated.payos_order_id ?? undefined });
};

export const getPaymentById = async (paymentId: number, userId: number) => {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Thanh toan khong ton tai');
    if (payment.user_id !== userId) throw new ForbiddenError('Ban khong co quyen xem thanh toan nay');

    const [user, event] = await Promise.all([
        prisma.user.findUnique({ where: { id: payment.user_id }, select: { id: true, full_name: true, email: true } }),
        prisma.event.findUnique({ where: { id: payment.event_id }, select: { id: true, title: true, start_time: true, end_time: true, location: true, training_points: true } }),
    ]);

    return toRecord({ ...payment, event, user, payos_order_id_code: payment.payos_order_id ?? undefined });
};

export const getMyPayments = async (userId: number, limit = 20, offset = 0) => {
    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: limit, skip: offset,
        }),
        prisma.payment.count({ where: { user_id: userId } }),
    ]);

    const eventIds = [...new Set(payments.map(p => p.event_id))];
    const events = await prisma.event.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, title: true, start_time: true, location: true },
    });
    const eventMap = new Map(events.map(e => [e.id, e]));

    return {
        payments: payments.map(p => ({
            id: p.id, registration_id: p.registration_id, user_id: p.user_id, event_id: p.event_id,
            amount: Number(p.amount), currency: p.currency, status: p.status, method: p.method,
            payos_order_id: p.payos_order_id, payos_payment_id: p.payos_payment_id,
            transaction_id: p.transaction_id, paid_at: p.paid_at, expires_at: p.expires_at,
            created_at: p.created_at, event: eventMap.get(p.event_id), payment_code: p.payos_order_id,
        })),
        total, limit, offset, has_more: offset + limit < total,
    };
};

export const cancelPayment = async (paymentId: number, userId: number) => {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Thanh toan khong ton tai');
    if (payment.user_id !== userId) throw new ForbiddenError('Ban khong co quyen huy thanh toan nay');
    if (payment.status !== 'pending') throw new ConflictError('Chi co the huy thanh toan dang cho xu ly');
    await prisma.payment.update({ where: { id: paymentId }, data: { status: 'cancelled' } });
};

export const expireStalePayments = async () => {
    const r = await prisma.payment.updateMany({
        where: { status: 'pending', expires_at: { lt: new Date() } },
        data: { status: 'expired' },
    });
    return r.count;
};

export const pollPayOSPayment = async (paymentId: number) => {
    const p = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!p) throw new NotFoundError('Thanh toan khong ton tai');
    return { status: p.status };
};

export const handlePayOSWebhook = async (payload: {
    orderCode?: string; paymentNo?: string; amount?: number; status?: string; signature?: string;
}) => handleSePayWebhook({
    id: payload.paymentNo, content: payload.orderCode,
    transferAmount: payload.amount, transferType: 'in', referenceCode: payload.orderCode,
});
