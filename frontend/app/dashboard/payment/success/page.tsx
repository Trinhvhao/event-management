'use client';

import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { paymentService } from '@/services/paymentService';
import { PaymentRecord } from '@/services/paymentService';
import { CheckCircle, XCircle, Clock, AlertCircle, CreditCard, Loader2, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CONFIG = {
    paid: {
        icon: CheckCircle,
        label: 'Thanh toán thành công',
        color: 'emerald',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        desc: 'Thanh toán của bạn đã được xác nhận. Bạn sẽ nhận được email xác nhận kèm mã QR.',
    },
    pending: {
        icon: Clock,
        label: 'Đang chờ thanh toán',
        color: 'amber',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        desc: 'Đơn hàng đang chờ bạn hoàn tất thanh toán. Vui lòng không đóng trình duyệt.',
    },
    failed: {
        icon: XCircle,
        label: 'Thanh toán thất bại',
        color: 'red',
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        desc: 'Thanh toán không thành công. Vui lòng thử lại.',
    },
    cancelled: {
        icon: XCircle,
        label: 'Đã hủy',
        color: 'red',
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        desc: 'Đơn hàng đã bị hủy.',
    },
    expired: {
        icon: AlertCircle,
        label: 'Đã hết hạn',
        color: 'gray',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        desc: 'Đơn hàng đã hết hạn. Bạn có thể đăng ký lại.',
    },
    refunded: {
        icon: CheckCircle,
        label: 'Đã hoàn tiền',
        color: 'blue',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        desc: 'Thanh toán đã được hoàn tiền.',
    },
};

type PaymentStatus = keyof typeof STATUS_CONFIG;

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20 rounded-full border-[5px] border-[#00358F]/20 border-t-[#00358F] animate-spin" />
                    <p className="text-gray-500 font-semibold text-base">Đang tải...</p>
                </div>
            </DashboardLayout>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}

function PaymentSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registrationId = searchParams.get('reg_id');
    const paymentId = searchParams.get('payment_id');

    const [payment, setPayment] = useState<PaymentRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [polling, setPolling] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchPayment = useCallback(async (showLoading = false) => {
        if (!registrationId && !paymentId) {
            setLoading(false);
            return;
        }
        if (showLoading) setLoading(true);
        try {
            // Try to find payment by registration_id or paymentId
            const data = await paymentService.getMyPayments(50, 0);
            let found: PaymentRecord | undefined;

            if (registrationId) {
                found = data.payments.find(p => p.registration_id === Number(registrationId));
            } else if (paymentId) {
                found = await paymentService.getPaymentById(Number(paymentId));
            }

            if (found) {
                setPayment(found);
                setPaymentStatus(found.status as PaymentStatus);
            } else if (!registrationId) {
                // No payment found and no registrationId means user came directly
                setPaymentStatus('pending');
            }
        } catch (error) {
            console.error('Error fetching payment:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [registrationId, paymentId]);

    const pollPayment = useCallback(async () => {
        if (!payment?.id) return;
        setPolling(true);
        try {
            const result = await paymentService.pollPaymentStatus(payment.id);
            setPaymentStatus(result.status as PaymentStatus);
            if (result.status === 'paid') {
                await fetchPayment();
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                toast.success('Thanh toán thành công!');
            }
        } catch (error) {
            console.error('Poll error:', error);
        } finally {
            setPolling(false);
        }
    }, [payment?.id, fetchPayment]);

    useEffect(() => {
        fetchPayment(true);
    }, [fetchPayment]);

    // Auto-poll every 3 seconds while pending
    useEffect(() => {
        if (paymentStatus === 'pending' && payment?.id) {
            pollIntervalRef.current = setInterval(pollPayment, 3000);
        } else {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [paymentStatus, payment?.id, pollPayment]);

    const statusConfig = STATUS_CONFIG[paymentStatus];
    const StatusIcon = statusConfig.icon;

    const handleRetryPayment = () => {
        if (payment?.registration_id) {
            router.push(`/dashboard/payment/checkout?reg_id=${payment.registration_id}&event_id=${payment.event_id}`);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto py-10 px-4">
                {/* Back link */}
                <button
                    onClick={() => router.push('/dashboard/my-registrations')}
                    className="flex items-center gap-2 text-(--text-muted) hover:text-(--text-primary) transition-colors mb-6 text-sm font-semibold"
                >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Quay về danh sách đăng ký
                </button>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-(--color-brand-navy) animate-spin mb-4" />
                        <p className="text-(--text-muted) font-semibold">Đang tải thông tin thanh toán...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className={`${statusConfig.bg} rounded-2xl border ${statusConfig.border} p-8 text-center`}>
                            <div className={`w-20 h-20 rounded-full bg-${statusConfig.color}-100 flex items-center justify-center mx-auto mb-4`}>
                                <StatusIcon className={`w-10 h-10 ${statusConfig.text}`} />
                            </div>
                            <h1 className={`text-2xl font-extrabold ${statusConfig.text} mb-2`}>
                                {statusConfig.label}
                            </h1>
                            <p className="text-(--text-secondary) leading-relaxed">
                                {statusConfig.desc}
                            </p>
                        </div>

                        {/* Payment Details */}
                        {payment && (
                            <div className="bg-white rounded-2xl border border-(--border-default) shadow-card overflow-hidden">
                                <div className="px-6 py-5 border-b border-(--border-default)">
                                    <h2 className="font-bold text-(--text-primary) flex items-center gap-2">
                                        <CreditCard className="w-5 h-5 text-(--color-brand-navy)" />
                                        Chi tiết thanh toán
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-(--border-light)">
                                        <span className="text-(--text-muted) text-sm">Sự kiện</span>
                                        <span className="font-semibold text-(--text-primary)">{payment.event?.title}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-(--border-light)">
                                        <span className="text-(--text-muted) text-sm">Số tiền</span>
                                        <span className="font-extrabold text-xl text-(--color-brand-orange)">
                                            {new Intl.NumberFormat('vi-VN').format(payment.amount)}đ
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-(--border-light)">
                                        <span className="text-(--text-muted) text-sm">Mã giao dịch</span>
                                        <span className="font-mono text-sm text-(--text-secondary)">{payment.transaction_id || payment.payos_order_id || '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-(--border-light)">
                                        <span className="text-(--text-muted) text-sm">Ngày tạo</span>
                                        <span className="text-sm text-(--text-secondary)">
                                            {format(new Date(payment.created_at), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}
                                        </span>
                                    </div>
                                    {payment.paid_at && (
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-(--text-muted) text-sm">Thời gian thanh toán</span>
                                            <span className="text-sm text-emerald-600 font-semibold">
                                                {format(new Date(payment.paid_at), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {paymentStatus === 'pending' && (
                                <button
                                    onClick={handleRetryPayment}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-md"
                                >
                                    <CreditCard className="w-5 h-5" />
                                    Thanh toán ngay
                                </button>
                            )}
                            {paymentStatus === 'paid' && (
                                <button
                                    onClick={() => router.push(`/dashboard/events/${payment?.event_id}`)}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[var(--color-brand-navy)] to-[#1a5fc8] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-brand"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                    Xem chi tiết sự kiện
                                </button>
                            )}
                            {paymentStatus === 'failed' && (
                                <button
                                    onClick={handleRetryPayment}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-md"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Thử lại thanh toán
                                </button>
                            )}
                            <button
                                onClick={() => router.push('/dashboard/my-registrations')}
                                className="px-6 py-3 bg-white border border-(--border-default) text-(--text-secondary) rounded-xl font-semibold hover:bg-(--bg-muted) transition-all flex items-center justify-center gap-2"
                            >
                                Danh sách đăng ký
                            </button>
                        </div>

                        {/* Polling indicator */}
                        {paymentStatus === 'pending' && (
                            <div className="flex items-center justify-center gap-2 text-(--text-muted) text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang kiểm tra trạng thái thanh toán...
                                <button
                                    onClick={pollPayment}
                                    disabled={polling}
                                    className="ml-2 text-(--color-brand-navy) font-semibold hover:underline disabled:opacity-50"
                                >
                                    Kiểm tra ngay
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
