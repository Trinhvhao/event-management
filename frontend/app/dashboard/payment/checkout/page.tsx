'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { paymentService } from '@/services/paymentService';
import { CreatePaymentResponse } from '@/services/paymentService';
import {
    Copy, CheckCircle, Loader2, Clock, AlertTriangle,
    ArrowRight, RefreshCw, ShieldCheck, Smartphone,
    CreditCard, Info, QrCode, BadgeCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
        } catch {
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
            toast.success('Đã sao chép thông tin');
            setTimeout(() => setCopied(null), 2000);
        });
    };

    if (loading || creating) {
        return (
            <DashboardLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full border-[5px] border-[#00358F]/20 border-t-[#00358F] animate-spin" />
                    </div>
                    <p className="text-gray-500 font-semibold text-base">
                        {creating ? 'Đang tạo mã thanh toán...' : 'Đang tải thông tin...'}
                    </p>
                    <p className="text-gray-400 text-sm">Vui lòng chờ trong giây lát</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!payment) {
        return (
            <DashboardLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-lg font-bold text-[#00358F] mb-2">Không tìm thấy thanh toán</h2>
                    <p className="text-gray-500 text-sm mb-6">Vui lòng thử lại hoặc liên hệ hỗ trợ</p>
                    <button
                        onClick={() => router.push('/dashboard/events')}
                        className="px-6 py-3 bg-[#00358F] text-white rounded-xl font-semibold hover:bg-[#00358F]/90 transition-all"
                    >
                        Quay về sự kiện
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const isExpired = status === 'expired' || status === 'cancelled';
    const isPaid = status === 'paid';

    return (
        <DashboardLayout>
            <div className="space-y-5">

                {/* ── Hero Banner ── */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00358F] to-[#002a6e] p-8 text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F26600]/20 rounded-full translate-y-1/2 -translate-x-1/2" />

                    {isPaid ? (
                        /* ── PAID STATE ── */
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                    <CheckCircle className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold mb-1">Thanh toán thành công!</h1>
                                    <p className="text-white/70 font-medium">Mã QR đã được gửi qua email và thông báo. Mang mã QR đến sự kiện để check-in.</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                                <button
                                    onClick={() => router.push('/dashboard/my-registrations')}
                                    className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                                >
                                    <QrCode className="w-5 h-5" />
                                    Xem mã QR
                                </button>
                                <button
                                    onClick={() => router.push(`/dashboard/events/${eventId}`)}
                                    className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
                                >
                                    Chi tiết sự kiện
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        /* ── PENDING / EXPIRED HERO ── */
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                            <div>
                                <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Thanh toán sự kiện</p>
                                <p className="text-4xl font-extrabold tracking-tight">
                                    {new Intl.NumberFormat('vi-VN').format(payment.amount)}
                                    <span className="text-2xl ml-1 font-bold text-white/80">đ</span>
                                </p>
                                <p className="text-white/50 text-sm mt-1">Mã thanh toán: <span className="font-mono font-bold text-white/80">{payment.paymentCode}</span></p>
                            </div>

                            {isExpired ? (
                                <div className="flex items-center gap-3 bg-red-500/20 border border-red-400/30 rounded-2xl px-6 py-4">
                                    <AlertTriangle className="w-6 h-6 text-red-300" />
                                    <div>
                                        <p className="text-red-200 font-bold text-sm">Mã thanh toán đã hết hạn</p>
                                        <button
                                            onClick={() => { setLoading(true); setCreating(false); void createPayment(); }}
                                            className="text-red-300 text-xs font-semibold hover:underline flex items-center gap-1 mt-0.5"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Tạo mã mới
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-right">
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/15 mb-2">
                                        <Clock className="w-4 h-4 text-white/60" />
                                        <span className="text-white/60 text-xs font-semibold">Hết hạn trong</span>
                                    </div>
                                    <p className="font-extrabold text-3xl font-mono tracking-widest text-white">{countdown}</p>
                                    <p className="text-white/40 text-xs mt-1">
                                        {format(new Date(payment.expiresAt), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Main Grid: QR + Bank Details ── */}
                {!isPaid && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                            {/* QR Code */}
                            {payment.vietQrUrl ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col items-center"
                                >
                                    <div className="flex items-center gap-2.5 mb-5 self-start">
                                        <div className="w-10 h-10 rounded-xl bg-[#00358F]/10 flex items-center justify-center">
                                            <Smartphone className="w-5 h-5 text-[#00358F]" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#00358F]">Quét mã QR</h3>
                                            <p className="text-xs text-gray-400">Mở app ngân hàng để quét</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm mb-4 hover:scale-[1.02] transition-transform duration-200">
                                        <img
                                            src={payment.vietQrUrl}
                                            alt="Mã QR thanh toán VietQR"
                                            className="w-52 h-52 object-contain"
                                            loading="lazy"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 text-center">
                                        Quét mã bằng app <strong className="text-[#00358F]">{payment.bankName}</strong> hoặc app ngân hàng bất kỳ
                                    </p>
                                </motion.div>
                            ) : (
                                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center min-h-[280px]">
                                    <QrCode className="w-12 h-12 text-gray-300 mb-3" />
                                    <p className="text-sm text-gray-400">Không có mã QR cho thanh toán này</p>
                                </div>
                            )}

                            {/* Right Column: Bank Details + Instructions */}
                            <div className="lg:col-span-3 flex flex-col gap-5">

                                {/* Bank Details */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 }}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                                >
                                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-10 h-10 rounded-xl bg-[#00358F]/10 flex items-center justify-center">
                                                <CreditCard className="w-5 h-5 text-[#00358F]" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-[#00358F]">Thông tin chuyển khoản</h3>
                                                <p className="text-xs text-gray-400">Sao chép và nhập vào app ngân hàng</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {/* Bank */}
                                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Ngân hàng</p>
                                                <p className="font-bold text-[#00358F] text-base">{payment.bankName}</p>
                                            </div>
                                            {/* Amount */}
                                            <div className="p-4 bg-[#00358F]/5 rounded-xl border border-[#00358F]/20">
                                                <p className="text-xs text-[#00358F]/60 font-semibold uppercase tracking-wide mb-1">Số tiền</p>
                                                <p className="font-extrabold text-[#F26600] text-base">
                                                    {new Intl.NumberFormat('vi-VN').format(payment.amount)}đ
                                                </p>
                                            </div>
                                        </div>

                                        {/* Account Number */}
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Số tài khoản</p>
                                                    <p className="font-mono font-bold text-[#00358F] text-lg tracking-wider">{payment.bankAccountNumber}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(payment.bankAccountNumber, 'acc')}
                                                    className="w-10 h-10 rounded-xl bg-[#00358F] flex items-center justify-center hover:bg-[#00358F]/90 transition-all text-white shadow-md shadow-[#00358F]/20 hover:scale-105"
                                                    aria-label="Sao chép số tài khoản"
                                                >
                                                    {copied === 'acc'
                                                        ? <CheckCircle className="w-5 h-5 text-emerald-300" />
                                                        : <Copy className="w-5 h-5" />
                                                    }
                                                </button>
                                            </div>
                                        </div>

                                        {/* Payment Code */}
                                        <div className="p-4 bg-[#00358F] rounded-xl text-white relative overflow-hidden">
                                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />
                                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Nội dung chuyển khoản</p>
                                            <div className="flex items-center justify-between">
                                                <p className="font-mono font-bold text-xl tracking-widest">{payment.paymentCode}</p>
                                                <button
                                                    onClick={() => handleCopy(payment.paymentCode, 'code')}
                                                    className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition-all"
                                                    aria-label="Sao chép nội dung"
                                                >
                                                    {copied === 'code'
                                                        ? <CheckCircle className="w-5 h-5 text-emerald-300" />
                                                        : <Copy className="w-5 h-5" />
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Instructions */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                                >
                                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-10 h-10 rounded-xl bg-[#F26600]/10 flex items-center justify-center">
                                                <Info className="w-5 h-5 text-[#F26600]" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-[#00358F]">Hướng dẫn thanh toán</h3>
                                                <p className="text-xs text-gray-400">Thực hiện theo 4 bước đơn giản</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {[
                                                {
                                                    step: 1,
                                                    title: 'Mở ứng dụng ngân hàng',
                                                    desc: `App ${payment.bankName} hoặc app bất kỳ hỗ trợ VietQR`,
                                                    color: 'from-blue-500 to-blue-600',
                                                    delay: '0ms',
                                                },
                                                {
                                                    step: 2,
                                                    title: 'Quét mã QR',
                                                    desc: 'Quét mã QR hoặc nhập thông tin bên trái',
                                                    color: 'from-purple-500 to-purple-600',
                                                    delay: '50ms',
                                                },
                                                {
                                                    step: 3,
                                                    title: `Chuyển khoản ${new Intl.NumberFormat('vi-VN').format(payment.amount)}đ`,
                                                    desc: `Nội dung: ${payment.paymentCode}`,
                                                    color: 'from-[#00358F] to-[#1a5fc8]',
                                                    delay: '100ms',
                                                    highlight: true,
                                                },
                                                {
                                                    step: 4,
                                                    title: 'Đợi xác nhận',
                                                    desc: 'Hệ thống tự xác nhận trong vài giây',
                                                    color: 'from-emerald-500 to-emerald-600',
                                                    delay: '150ms',
                                                },
                                            ].map(({ step, title, desc, color, highlight }) => (
                                                <motion.div
                                                    key={step}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.05 + step * 0.05 }}
                                                    className={`flex items-start gap-3 p-3.5 rounded-xl border ${highlight
                                                        ? 'bg-[#00358F] border-[#00358F]/20 shadow-md shadow-[#00358F]/10'
                                                        : 'bg-gray-50 border-gray-100'
                                                        }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0 text-white font-extrabold text-sm shadow-sm`}>
                                                        {highlight ? <BadgeCheck className="w-4 h-4" /> : step}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-bold ${highlight ? 'text-white' : 'text-[#00358F]'}`}>{title}</p>
                                                        <p className={`text-xs mt-0.5 ${highlight ? 'text-white/70' : 'text-gray-500'}`}>{desc}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* ── Polling Status ── */}
                        {!isExpired && (
                            <div className="flex items-center justify-center gap-3 py-3">
                                <div className="flex gap-1.5">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={i}
                                            className="w-1.5 h-1.5 rounded-full bg-[#00358F] animate-bounce"
                                            style={{ animationDelay: `${i * 0.2}s` }}
                                        />
                                    ))}
                                </div>
                                <span className="text-gray-400 text-sm">Hệ thống đang theo dõi thanh toán</span>
                                <button
                                    onClick={() => void fetchPaymentStatus()}
                                    className="flex items-center gap-1 text-[#00358F] text-sm font-semibold hover:underline ml-1"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Kiểm tra ngay
                                </button>
                            </div>
                        )}

                        {/* ── Security Note ── */}
                        <div className="flex items-center justify-center gap-2 pb-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs text-gray-400">
                                Thanh toán được xử lý qua cổng SePay · Không chia sẻ mã thanh toán cho người khác
                            </span>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
