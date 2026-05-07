'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { paymentService } from '@/services/paymentService';
import { CreatePaymentResponse } from '@/services/paymentService';
import { Copy, CheckCircle, Loader2, Clock, AlertTriangle, QrCode, ArrowRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PaymentCheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registrationId = searchParams.get('reg_id');
    const eventId = searchParams.get('event_id');

    const [payment, setPayment] = useState<CreatePaymentResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [status, setStatus] = useState<'pending' | 'paid' | 'expired' | 'cancelled'>('pending');
    const [countdown, setCountdown] = useState<string>('');
    const [creating, setCreating] = useState(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    const fetchPaymentStatus = useCallback(async () => {
        if (!payment?.paymentId) return;
        try {
            const result = await paymentService.pollPaymentStatus(payment.paymentId);
            if (result.status === 'paid') {
                setStatus('paid');
                toast.success('Thanh toán thành công!');
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                if (countdownRef.current) clearInterval(countdownRef.current);
            } else if (result.status === 'expired') {
                setStatus('expired');
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            } else if (result.status === 'cancelled') {
                setStatus('cancelled');
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            }
        } catch (e) {
            // silent poll
        }
    }, [payment?.paymentId]);

    const createPayment = useCallback(async () => {
        if (!registrationId || !eventId) {
            toast.error('Thiếu thông tin đăng ký');
            router.push('/dashboard/events');
            return;
        }
        setCreating(true);
        try {
            const data = await paymentService.createPayment({
                event_id: Number(eventId),
                registration_id: Number(registrationId),
            });
            setPayment(data);
            setStatus('pending');

            // Start polling
            pollIntervalRef.current = setInterval(fetchPaymentStatus, 3000);
        } catch (err: unknown) {
            const msg = (err && typeof err === 'object' && 'response' in err)
                ? ((err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || 'Không thể tạo thanh toán')
                : 'Không thể tạo thanh toán';
            toast.error(msg);
        } finally {
            setCreating(false);
            setLoading(false);
        }
    }, [registrationId, eventId, router, fetchPaymentStatus]);

    // Countdown timer
    useEffect(() => {
        if (!payment?.expiresAt) return;

        const update = () => {
            const diff = new Date(payment.expiresAt!).getTime() - Date.now();
            if (diff <= 0) {
                setCountdown('Đã hết hạn');
                setStatus('expired');
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                return;
            }
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };

        update();
        countdownRef.current = setInterval(update, 1000);
        return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }, [payment?.expiresAt]);

    useEffect(() => {
        if (status === 'paid') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        }
    }, [status]);

    useEffect(() => {
        void createPayment();
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(field);
            toast.success('Đã sao chép');
            setTimeout(() => setCopied(null), 2000);
        });
    };

    if (loading || creating) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-(--color-brand-navy) animate-spin mb-4" />
                    <p className="text-(--text-muted) font-semibold">
                        {creating ? 'Đang tạo thanh toán...' : 'Đang tải thông tin thanh toán...'}
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    if (!payment) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center py-20">
                    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-(--text-muted) font-semibold">Không tìm thấy thông tin thanh toán</p>
                    <button
                        onClick={() => router.push('/dashboard/events')}
                        className="mt-4 px-6 py-2 bg-(--color-brand-navy) text-white rounded-xl font-semibold"
                    >
                        Quay về sự kiện
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const isExpired = status === 'expired' || status === 'cancelled';

    return (
        <DashboardLayout>
            <div className="max-w-lg mx-auto py-8 px-4 space-y-5">

                {/* ── Back ── */}
                <button
                    onClick={() => router.push('/dashboard/my-registrations')}
                    className="flex items-center gap-2 text-(--text-muted) hover:text-(--text-primary) transition-colors text-sm font-semibold"
                >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Quay về danh sách đăng ký
                </button>

                {/* ── Paid? ── */}
                {status === 'paid' ? (
                    <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-extrabold text-emerald-700 mb-2">Thanh toán thành công!</h2>
                        <p className="text-emerald-600 text-sm mb-6">Bạn đã thanh toán thành công. Hãy mang mã QR đến sự kiện.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => router.push('/dashboard/my-registrations')}
                                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all"
                            >
                                Xem mã QR
                            </button>
                            <button
                                onClick={() => router.push(`/dashboard/events/${eventId}`)}
                                className="flex-1 px-6 py-3 bg-white border border-emerald-300 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-50 transition-all"
                            >
                                Chi tiết sự kiện
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── Countdown / Expiry ── */}
                        {isExpired ? (
                            <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-center">
                                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                                <h2 className="text-lg font-bold text-red-700 mb-2">Thanh toán đã hết hạn</h2>
                                <p className="text-red-600 text-sm mb-4">Mã thanh toán không còn hiệu lực. Bạn có thể tạo lại.</p>
                                <button
                                    onClick={() => { setLoading(true); setCreating(false); void createPayment(); }}
                                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
                                >
                                    Tạo lại thanh toán
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-amber-50 rounded-2xl border border-amber-200 px-5 py-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                    <span className="text-sm font-semibold text-amber-700">Thời gian còn lại</span>
                                </div>
                                <span className="text-xl font-extrabold font-mono text-amber-700">{countdown}</span>
                            </div>
                        )}

                        {/* ── Payment Card ── */}
                        <div className="bg-white rounded-2xl border border-(--border-default) shadow-card overflow-hidden">
                            <div className="px-6 py-5 border-b border-(--border-default)">
                                <h2 className="font-bold text-(--text-primary) flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-(--color-brand-navy)" />
                                    Thông tin chuyển khoản
                                </h2>
                            </div>
                            <div className="p-6 space-y-4">

                                {/* Amount */}
                                <div className="flex justify-between items-center py-3 border-b border-(--border-light)">
                                    <span className="text-(--text-muted) text-sm">Số tiền</span>
                                    <span className="font-extrabold text-2xl text-(--color-brand-orange)">
                                        {new Intl.NumberFormat('vi-VN').format(payment.amount)}đ
                                    </span>
                                </div>

                                {/* Bank */}
                                <div className="flex justify-between items-center py-3 border-b border-(--border-light)">
                                    <span className="text-(--text-muted) text-sm">Ngân hàng</span>
                                    <span className="font-semibold text-(--text-primary)">{payment.bankName}</span>
                                </div>

                                {/* Account Number */}
                                <div className="flex justify-between items-center py-3 border-b border-(--border-light)">
                                    <span className="text-(--text-muted) text-sm">Số tài khoản</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-semibold text-(--text-primary)">{payment.bankAccountNumber}</span>
                                        <button
                                            onClick={() => handleCopy(payment.bankAccountNumber, 'acc')}
                                            className="p-1 hover:bg-(--bg-muted) rounded transition-colors"
                                        >
                                            {copied === 'acc' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-(--text-muted)" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Payment Code (Nội dung CK) */}
                                <div className="flex justify-between items-center py-3 border-b border-(--border-light)">
                                    <span className="text-(--text-muted) text-sm">Nội dung CK</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-base text-(--color-brand-navy)">{payment.paymentCode}</span>
                                        <button
                                            onClick={() => handleCopy(payment.paymentCode, 'code')}
                                            className="p-1 hover:bg-(--bg-muted) rounded transition-colors"
                                        >
                                            {copied === 'code' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-(--text-muted)" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expiry */}
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-(--text-muted) text-sm">Hết hạn lúc</span>
                                    <span className="text-sm font-semibold text-(--text-secondary)">
                                        {format(new Date(payment.expiresAt), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── Instructions ── */}
                        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5 space-y-2">
                            <h3 className="font-bold text-blue-700 text-sm mb-3">📋 Hướng dẫn thanh toán</h3>
                            <p className="text-sm text-blue-800">1. Mở app ngân hàng {payment.bankName}</p>
                            <p className="text-sm text-blue-800">2. Chuyển khoản <strong>{new Intl.NumberFormat('vi-VN').format(payment.amount)}đ</strong> vào tài khoản trên</p>
                            <p className="text-sm text-blue-800">3. <strong>Nhập đúng nội dung:</strong> <span className="font-mono font-bold">{payment.paymentCode}</span></p>
                            <p className="text-sm text-blue-800">4. Sau khi chuyển khoản, hệ thống sẽ tự động xác nhận trong vài giây</p>
                        </div>

                        {/* ── Auto-poll indicator ── */}
                        <div className="flex items-center justify-center gap-2 text-(--text-muted) text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang kiểm tra tự động...
                            <button
                                onClick={() => void fetchPaymentStatus()}
                                className="ml-2 text-(--color-brand-navy) font-semibold hover:underline"
                            >
                                Kiểm tra ngay
                            </button>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
