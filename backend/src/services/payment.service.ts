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

// VietQR bank ID mapping
const BANK_ID_MAP: Record<string, string> = {
    'vietinbank': 'ICB',
    'ctg': 'ICB',
    'vietcombank': 'VCB',
    'vcb': 'VCB',
    'bidv': 'BID',
    'agribank': 'AGR',
    'mbbank': 'MB',
    'mb': 'MB',
    'acb': 'ACB',
    'techcombank': 'TCB',
    'tpbank': 'TPB',
    'vpbank': 'VPB',
    'shinhanbank': 'SHB',
    'ocb': 'OCB',
    'pvcombank': 'PVB',
    'sacombank': 'STB',
    'hdbank': 'HDB',
    'vietcapitalbank': 'VCCB',
    'seabank': 'MSB',
    'kienlongbank': 'KLB',
    'dongabank': 'DAB',
    'pgbank': 'PGB',
    'publicbank': 'BID',
    'baovietbank': 'BVB',
    'nama': 'NAMA',
};

function getBankId(bankName: string): string {
    const normalized = bankName.toLowerCase().replace(/\s+/g, '');
    return BANK_ID_MAP[normalized] || 'VCB'; // fallback to VCB
}

function buildVietQrUrl(accountNumber: string, bankName: string, amount: number, paymentCode: string): string {
    const bankId = getBankId(bankName);
    const template = 'compact2';
    const encodedAddInfo = encodeURIComponent(paymentCode);
    return `https://img.vietqr.io/image/${bankId}-${accountNumber}-${template}.png?amount=${amount}&addInfo=${encodedAddInfo}`;
}

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
    paymentCode?: string;
}

function toRecord(p: {
    id: number; registration_id: number; user_id: number; event_id: number;
    amount: unknown; currency: string; status: PaymentStatus; method: PaymentMethod;
    payos_order_id: string | null; payos_payment_id: string | null; transaction_id: string | null;
    paid_at: Date | null; expires_at: Date | null; created_at: Date;
    event?: { id: number; title: string; start_time: Date; end_time: Date; location: string; training_points: number } | null;
    user?: { id: number; full_name: string; email: string } | null;
    paymentCode?: string;
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
        paymentCode: p.paymentCode ?? p.payos_order_id ?? undefined,
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
    const normalizedCode = paymentCode.replace(/-/g, ''); // strip dashes for webhook matching
    const amount = Math.round(Number(event.event_cost));
    const expiresAt = new Date(Date.now() + PAYMENT_CODE_EXPIRY_HOURS * 60 * 60 * 1000);
    const sepayCfg = getSePayConfig();
    if (!sepayCfg.accountNumber) throw new ValidationError('SEPAY chua duoc cau hinh');
    if (!sepayCfg.bankName) throw new ValidationError('SEPAY_BANK_NAME chua duoc cau hinh');
    const vietQrUrl = buildVietQrUrl(sepayCfg.accountNumber, sepayCfg.bankName, amount, paymentCode);

    const payment = existing
        ? await prisma.payment.update({
            where: { id: existing.id },
            data: { amount, status: 'pending', method: 'bank_transfer', expires_at: expiresAt, payos_order_id: paymentCode, normalized_code: normalizedCode },
        })
        : await prisma.payment.create({
            data: {
                registration_id: registrationId, user_id: userId, event_id: eventId,
                amount, currency: 'VND', status: 'pending', method: 'bank_transfer',
                payos_order_id: paymentCode, normalized_code: normalizedCode, expires_at: expiresAt,
            },
        });

    return {
        paymentId: payment.id,
        paymentCode: normalizedCode,
        expiresAt,
        bankAccountNumber: sepayCfg.accountNumber,
        bankName: sepayCfg.bankName,
        amount,
        transferNote: paymentCode,
        vietQrUrl,
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

    // Normalize: remove all dashes and spaces from content
    const normalizedContent = payload.content.replace(/[- ]/g, '');

    // 1. Try exact normalized_code lookup (new payments)
    let payment = await prisma.payment.findUnique({
        where: { normalized_code: normalizedContent },
    });

    // 2. Fallback: try matching by EVT code extraction
    // Content like "EVT162159531393 I2AHCQ54/13" -> extract "EVT162159531393"
    if (!payment) {
        const evtMatch = payload.content.match(/EVT(\d+)/i);
        if (evtMatch) {
            const evtCode = evtMatch[0].toUpperCase();
            payment = await prisma.payment.findFirst({
                where: {
                    payos_order_id: { contains: evtCode.replace('EVT', '') },
                    status: 'pending',
                },
            });
        }
    }

    // 3. Fallback: try matching by amount only (for auto-confirm by exact amount)
    if (!payment && payload.transferAmount) {
        const pendingPayments = await prisma.payment.findMany({
            where: {
                amount: String(payload.transferAmount),
                status: 'pending',
            },
            orderBy: { created_at: 'desc' },
            take: 1,
        });
        if (pendingPayments.length > 0) {
            payment = pendingPayments[0];
        }
    }

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
        return toRecord({ ...payment, paymentCode: payment.payos_order_id ?? undefined });
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

    const sepayCfg = getSePayConfig();
    const amount = Number(payment.amount);
    const paymentCode = payment.payos_order_id || '';
    const vietQrUrl = buildVietQrUrl(sepayCfg.accountNumber, sepayCfg.bankName, amount, paymentCode);

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
                metadata: { ...metadata, viet_qr_url: vietQrUrl },
            },
        }),
        prisma.registration.update({
            where: { id: payment.registration_id },
            data: { 
                qr_code: qrCodeDataUrl,
                approval_status: 'approved',
                status: 'registered', // Keep as registered (confirmed payment = approved)
            },
        }),
    ]);

    // Fire-and-forget: send email & notifications asynchronously
    // Do NOT await — webhook must respond quickly (< 3s for SePay)
    if (user && event) {
        const emailQrCode = await QRCode.toDataURL(JSON.stringify({
            registration_id: payment.registration_id,
            event_id: payment.event_id,
            user_id: payment.user_id,
            issued_at: new Date().toISOString(),
            expires_at: event.start_time.toISOString(),
        }));

        // Send email async (fire-and-forget)
        emailService.sendRegistrationConfirmation({
            email: user.email, fullName: user.full_name,
            eventTitle: event.title, eventLocation: event.location,
            eventStartTime: event.start_time, eventEndTime: event.end_time,
            trainingPoints: event.training_points, qrCodeDataUrl: emailQrCode,
            eventCost: Number(payment.amount),
        }).catch(e => console.error('[Payment] Email error:', e));

        // Send notification async (fire-and-forget)
        notificationsService.notifyRegistrationConfirm(
            payment.user_id, payment.event_id, event.title, event.location,
            event.start_time, event.end_time, event.training_points, emailQrCode, Number(payment.amount),
        ).catch(e => console.error('[Payment] Notification error:', e));
    }

    return toRecord({ ...updated, event, user, paymentCode: updated.payos_order_id ?? undefined });
};

export const getPaymentById = async (paymentId: number, userId: number) => {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Thanh toan khong ton tai');
    if (payment.user_id !== userId) throw new ForbiddenError('Ban khong co quyen xem thanh toan nay');

    const [user, event] = await Promise.all([
        prisma.user.findUnique({ where: { id: payment.user_id }, select: { id: true, full_name: true, email: true } }),
        prisma.event.findUnique({ where: { id: payment.event_id }, select: { id: true, title: true, start_time: true, end_time: true, location: true, training_points: true } }),
    ]);

    return toRecord({ ...payment, event, user, paymentCode: payment.payos_order_id ?? undefined });
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
            created_at: p.created_at, event: eventMap.get(p.event_id), paymentCode: p.payos_order_id,
        })),
        total, limit, offset, has_more: offset + limit < total,
    };
};

export const cancelPayment = async (paymentId: number, userId: number) => {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Thanh toan khong ton tai');
    if (payment.user_id !== userId) throw new ForbiddenError('Ban khong co quyen huy thanh toan nay');
    if (payment.status !== 'pending') throw new ConflictError('Chi co the huy thanh toan dang cho xu ly');
    
    // Chỉ hủi payment, KHÔNG hủi registration
    // User vẫn giữ nguyên đăng ký và có thể thanh toán lại sau
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
