'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { paymentService, PaymentRecord } from '@/services/paymentService';
import { CheckCircle, XCircle, Clock, AlertCircle, CreditCard, ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CONFIG = {
    paid: { icon: CheckCircle, label: 'Thành công', color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    pending: { icon: Clock, label: 'Đang chờ', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    failed: { icon: XCircle, label: 'Thất bại', color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    cancelled: { icon: XCircle, label: 'Đã hủy', color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    expired: { icon: AlertCircle, label: 'Hết hạn', color: 'gray', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
    refunded: { icon: CheckCircle, label: 'Đã hoàn tiền', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
} as const;

type Status = keyof typeof STATUS_CONFIG;

function PaymentCard({ payment, onRetry }: { payment: PaymentRecord; onRetry?: () => void }) {
    const cfg = STATUS_CONFIG[payment.status as Status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;

    return (
        <div className="bg-white rounded-2xl border border-(--border-default) shadow-card overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${cfg.text}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-(--text-primary) truncate">{payment.event?.title || `Sự kiện #${payment.event_id}`}</p>
                        <p className="text-sm text-(--text-muted) mt-0.5">
                            {format(new Date(payment.created_at), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}
                        </p>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="font-extrabold text-(--color-brand-orange)">
                        {new Intl.NumberFormat('vi-VN').format(payment.amount)}đ
                    </p>
                    <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                        {cfg.label}
                    </span>
                </div>
            </div>

            {payment.status === 'paid' && payment.paid_at && (
                <div className="px-6 pb-4">
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-xl p-3">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        Thanh toán lúc {format(new Date(payment.paid_at), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}
                        {payment.transaction_id && <span className="font-mono">· {payment.transaction_id}</span>}
                    </div>
                </div>
            )}

            {(payment.status === 'pending' || payment.status === 'failed') && payment.expires_at && (
                <div className="px-6 pb-4 flex items-center justify-between">
                    <p className="text-xs text-(--text-muted)">
                        Hết hạn: {format(new Date(payment.expires_at), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}
                    </p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="text-sm font-semibold text-(--color-brand-navy) hover:underline"
                        >
                            Thử lại
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-(--bg-muted) flex items-center justify-center mb-4">
                <CreditCard className="w-10 h-10 text-(--text-muted)" />
            </div>
            <h3 className="text-lg font-bold text-(--text-primary) mb-2">Chưa có giao dịch</h3>
            <p className="text-(--text-muted) text-center max-w-sm">
                Bạn chưa thực hiện thanh toán nào cho các sự kiện có phí.
            </p>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-(--border-default) p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl skeleton-animate" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-48 rounded skeleton-animate" />
                            <div className="h-3 w-32 rounded skeleton-animate" />
                        </div>
                        <div className="space-y-2 text-right">
                            <div className="h-5 w-20 rounded skeleton-animate" />
                            <div className="h-5 w-16 rounded-full skeleton-animate" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function PaymentHistoryPage() {
    const router = useRouter();
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    const loadPayments = useCallback(async (pageNum = 1) => {
        try {
            if (pageNum === 1) setLoading(true);
            const data = await paymentService.getMyPayments(PAGE_SIZE, (pageNum - 1) * PAGE_SIZE);
            if (pageNum === 1) {
                setPayments(data.payments);
            } else {
                setPayments(prev => [...prev, ...data.payments]);
            }
            setTotal(data.total);
            setHasMore(data.has_more);
            setPage(pageNum);
        } catch (error) {
            console.error('Error loading payments:', error);
            toast.error('Không thể tải lịch sử thanh toán');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPayments(1);
    }, [loadPayments]);

    const handleRetry = (payment: PaymentRecord) => {
        router.push(`/dashboard/payment/checkout?reg_id=${payment.registration_id}&event_id=${payment.event_id}`);
    };

    const paidPayments = payments.filter(p => p.status === 'paid');
    const pendingPayments = payments.filter(p => ['pending', 'failed'].includes(p.status));

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
                {/* Header */}
                <div>
                    <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)] rounded-full mb-4" />
                    <h1 className="text-2xl font-extrabold text-(--text-primary)">Lịch sử thanh toán</h1>
                    <p className="text-(--text-muted) text-sm mt-0.5">
                        {total > 0 ? `${total} giao dịch` : 'Theo dõi các khoản thanh toán của bạn'}
                    </p>
                </div>

                {loading && page === 1 ? (
                    <LoadingSkeleton />
                ) : payments.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-8">
                        {/* Pending / Failed */}
                        {pendingPayments.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-(--text-muted) mb-3">
                                    Chờ thanh toán
                                </h2>
                                <div className="space-y-3">
                                    {pendingPayments.map(p => (
                                        <PaymentCard key={p.id} payment={p} onRetry={() => handleRetry(p)} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Successful */}
                        {paidPayments.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-(--text-muted) mb-3">
                                    Thành công
                                </h2>
                                <div className="space-y-3">
                                    {paidPayments.map(p => (
                                        <PaymentCard key={p.id} payment={p} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Load more */}
                        {hasMore && (
                            <div className="flex justify-center">
                                <button
                                    onClick={() => loadPayments(page + 1)}
                                    className="px-6 py-2.5 bg-white border border-(--border-default) rounded-xl text-(--text-secondary) font-semibold hover:bg-(--bg-muted) transition-colors"
                                >
                                    Xem thêm
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
