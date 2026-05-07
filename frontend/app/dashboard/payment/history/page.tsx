'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { paymentService, PaymentRecord } from '@/services/paymentService';
import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    CreditCard,
    Loader2,
    X,
    AlertTriangle,
    RefreshCw,
    Search,
    ArrowUpRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG: Record<string, {
    icon: React.ElementType;
    label: string;
    bg: string;
    text: string;
    dot: string;
    badgeBg: string;
    badgeText: string;
}> = {
    paid: {
        icon: CheckCircle2,
        label: 'Thành công',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600',
        dot: 'bg-emerald-500',
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-700',
    },
    pending: {
        icon: Clock,
        label: 'Đang chờ',
        bg: 'bg-amber-500/10',
        text: 'text-amber-600',
        dot: 'bg-amber-500',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-700',
    },
    failed: {
        icon: XCircle,
        label: 'Thất bại',
        bg: 'bg-red-500/10',
        text: 'text-red-600',
        dot: 'bg-red-500',
        badgeBg: 'bg-red-50',
        badgeText: 'text-red-700',
    },
    cancelled: {
        icon: XCircle,
        label: 'Đã hủy',
        bg: 'bg-gray-500/10',
        text: 'text-gray-500',
        dot: 'bg-gray-500',
        badgeBg: 'bg-gray-50',
        badgeText: 'text-gray-600',
    },
    expired: {
        icon: AlertCircle,
        label: 'Hết hạn',
        bg: 'bg-orange-500/10',
        text: 'text-orange-600',
        dot: 'bg-orange-500',
        badgeBg: 'bg-orange-50',
        badgeText: 'text-orange-700',
    },
    refunded: {
        icon: CheckCircle2,
        label: 'Đã hoàn tiền',
        bg: 'bg-blue-500/10',
        text: 'text-blue-600',
        dot: 'bg-blue-500',
        badgeBg: 'bg-blue-50',
        badgeText: 'text-blue-700',
    },
};

type PaymentStatus = keyof typeof STATUS_CONFIG;
type TabKey = 'all' | 'pending' | 'paid' | 'cancelled';

interface PaymentCardProps {
    payment: PaymentRecord;
    onRetry?: (p: PaymentRecord) => void;
    onCancel?: (p: PaymentRecord) => void;
}

function PaymentCard({ payment, onRetry, onCancel }: PaymentCardProps) {
    const cfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    const isActionable = ['pending', 'failed'].includes(payment.status);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#00358F]/20 transition-all duration-300 overflow-hidden"
        >
            <div className="p-6">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${cfg.text}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-[#00358F] text-lg leading-tight line-clamp-1">
                                {payment.event?.title || `Sự kiện #${payment.event_id}`}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                                    {cfg.label}
                                </span>
                                {payment.paymentCode && payment.status === 'pending' && (
                                    <span className="text-xs font-mono font-semibold text-[#00358F] bg-[#00358F]/10 px-2.5 py-1 rounded-lg">
                                        Mã CK: <span className="font-bold">{payment.paymentCode}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xl font-extrabold text-[#F26600]">
                            {new Intl.NumberFormat('vi-VN').format(payment.amount)}đ
                        </p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-5">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-[#00358F]/10 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-[#00358F]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-gray-400 font-medium">Tạo lúc</p>
                            <p className="font-semibold text-gray-700 truncate">
                                {format(new Date(payment.created_at), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                            </p>
                        </div>
                    </div>

                    {payment.paid_at && (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-emerald-400 font-medium">Thanh toán lúc</p>
                                <p className="font-semibold text-emerald-700 truncate">
                                    {format(new Date(payment.paid_at), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                                </p>
                            </div>
                        </div>
                    )}

                    {!payment.paid_at && payment.expires_at && (
                        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-amber-400 font-medium">Hết hạn</p>
                                <p className="font-semibold text-amber-700 truncate">
                                    {format(new Date(payment.expires_at), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                                </p>
                            </div>
                        </div>
                    )}

                    {payment.transaction_id && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <CreditCard className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-medium">Mã giao dịch</p>
                                <p className="font-mono font-semibold text-gray-600 truncate text-xs">
                                    {payment.transaction_id}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {isActionable && (
                    <div className="flex flex-wrap gap-3 pt-1">
                        {onRetry && (
                            <button
                                onClick={() => onRetry(payment)}
                                className="px-5 py-2.5 bg-[#00358F] text-white rounded-xl hover:bg-[#00358F]/90 transition-all font-semibold flex items-center gap-2 text-sm shadow-md shadow-[#00358F]/20 hover:scale-105"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Thử lại
                            </button>
                        )}
                        {onCancel && (
                            <button
                                onClick={() => onCancel(payment)}
                                className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors font-semibold text-sm"
                            >
                                Hủy thanh toán
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function PaymentSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse">
            <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-start gap-4 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-gray-200" />
                        <div className="flex-1 space-y-2">
                            <div className="h-5 w-48 rounded-lg bg-gray-200" />
                            <div className="h-6 w-24 rounded-lg bg-gray-200" />
                        </div>
                    </div>
                    <div className="h-7 w-24 rounded-lg bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="h-14 bg-gray-50 rounded-xl" />
                    <div className="h-14 bg-gray-50 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

function EmptyState({ tab }: { tab: TabKey }) {
    const messages: Record<TabKey, { title: string; desc: string }> = {
        all: { title: 'Chưa có giao dịch nào', desc: 'Bạn chưa thực hiện thanh toán nào cho các sự kiện có phí.' },
        pending: { title: 'Không có giao dịch chờ xử lý', desc: 'Tất cả các khoản thanh toán đã được xử lý.' },
        paid: { title: 'Chưa có giao dịch thành công', desc: 'Bạn chưa thanh toán thành công sự kiện nào.' },
        cancelled: { title: 'Không có giao dịch bị hủy', desc: 'Rất tốt, không có khoản thanh toán nào bị hủy.' },
    };
    const { title, desc } = messages[tab];

    return (
        <div className="bg-gray-50 rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-[#00358F]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CreditCard className="w-10 h-10 text-[#00358F]" />
            </div>
            <h3 className="text-xl font-bold text-[#00358F] mb-2">{title}</h3>
            <p className="text-gray-500 max-w-sm mx-auto">{desc}</p>
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
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [cancelModal, setCancelModal] = useState<PaymentRecord | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [searchQuery, setSearchQuery] = useState('');

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

    const handleOpenCancel = (payment: PaymentRecord) => {
        setCancelModal(payment);
    };

    const handleConfirmCancel = async () => {
        if (!cancelModal) return;
        setCancellingId(cancelModal.id);
        try {
            await paymentService.cancelPayment(cancelModal.id);
            toast.success('Đã hủy thanh toán');
            setCancelModal(null);
            await loadPayments(1);
        } catch (err: unknown) {
            const msg = (err && typeof err === 'object' && 'response' in err)
                ? ((err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || 'Hủy thất bại')
                : 'Hủy thất bại';
            toast.error(msg);
        } finally {
            setCancellingId(null);
        }
    };

    const filteredPayments = payments.filter(p => {
        const matchesSearch = (p.event?.title || '').toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        switch (activeTab) {
            case 'pending': return ['pending', 'failed', 'expired'].includes(p.status);
            case 'paid': return p.status === 'paid';
            case 'cancelled': return ['cancelled', 'refunded'].includes(p.status);
            default: return true;
        }
    });

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'all', label: 'Tất cả' },
        { key: 'pending', label: 'Đang chờ' },
        { key: 'paid', label: 'Thành công' },
        { key: 'cancelled', label: 'Đã hủy' },
    ];

    const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const totalPending = payments.filter(p => ['pending', 'failed'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00358F] to-[#002a6e] p-8 text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F26600]/20 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Lịch sử thanh toán</h1>
                            <p className="text-white/70 font-medium">
                                Theo dõi các khoản thanh toán của bạn
                            </p>
                            {total > 0 && (
                                <div className="flex items-center gap-4 mt-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-sm">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span className="text-sm font-medium">
                                            <span className="text-white/60">Đã thanh toán:</span>{' '}
                                            <span className="font-bold text-emerald-300">
                                                {new Intl.NumberFormat('vi-VN').format(totalPaid)}đ
                                            </span>
                                        </span>
                                    </div>
                                    {totalPending > 0 && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-sm">
                                            <Clock className="w-4 h-4 text-amber-400" />
                                            <span className="text-sm font-medium">
                                                <span className="text-white/60">Đang chờ:</span>{' '}
                                                <span className="font-bold text-amber-300">
                                                    {new Intl.NumberFormat('vi-VN').format(totalPending)}đ
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="relative shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm giao dịch..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full md:w-72 pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#F26600] focus:border-transparent transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                {total > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Tổng giao dịch', value: total, icon: CreditCard, color: 'from-[#00358F] to-[#1a5fc8]' },
                            { label: 'Thành công', value: payments.filter(p => p.status === 'paid').length, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-600' },
                            { label: 'Đang chờ', value: payments.filter(p => ['pending', 'failed'].includes(p.status)).length, icon: Clock, color: 'from-amber-500 to-amber-600' },
                            { label: 'Đã hủy', value: payments.filter(p => ['cancelled', 'refunded', 'expired'].includes(p.status)).length, icon: XCircle, color: 'from-gray-400 to-gray-500' },
                        ].map((stat) => (
                            <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-gray-500 font-medium">{stat.label}</span>
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                        <stat.icon className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <p className="text-2xl font-extrabold text-gray-800">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab Bar */}
                <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 inline-flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                activeTab === tab.key
                                    ? 'bg-[#00358F] text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {tab.label}
                            {total > 0 && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                                    activeTab === tab.key
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {tab.key === 'all' ? total
                                        : tab.key === 'pending' ? payments.filter(p => ['pending', 'failed'].includes(p.status)).length
                                        : tab.key === 'paid' ? payments.filter(p => p.status === 'paid').length
                                        : payments.filter(p => ['cancelled', 'refunded', 'expired'].includes(p.status)).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading && page === 1 ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <PaymentSkeleton key={i} />)}
                    </div>
                ) : filteredPayments.length === 0 ? (
                    <EmptyState tab={activeTab} />
                ) : (
                    <>
                        <div className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {filteredPayments.map(p => (
                                    <PaymentCard
                                        key={p.id}
                                        payment={p}
                                        onRetry={handleRetry}
                                        onCancel={handleOpenCancel}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>

                        {hasMore && (
                            <div className="text-center pt-4">
                                <button
                                    onClick={() => loadPayments(page + 1)}
                                    className="px-8 py-3 bg-white border-2 border-[#00358F] text-[#00358F] rounded-xl font-semibold hover:bg-[#00358F] hover:text-white transition-all"
                                >
                                    Xem thêm giao dịch
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Cancel Confirmation Modal */}
                <AnimatePresence>
                    {cancelModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            onClick={(e) => e.target === e.currentTarget && setCancelModal(null)}
                        >
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ duration: 0.2 }}
                                className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-orange-500" />
                                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-red-500" />
                                        </div>
                                        <p className="text-base font-bold text-[#00358F]">Xác nhận hủy thanh toán</p>
                                    </div>
                                    <button
                                        onClick={() => setCancelModal(null)}
                                        className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-gray-600 mb-4">
                                        Bạn có chắc muốn hủy thanh toán cho sự kiện{' '}
                                        <span className="font-bold text-[#00358F]">{cancelModal.event?.title}</span>?
                                    </p>
                                    <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            <div className="text-xs text-amber-700">
                                                <p className="font-semibold">Thanh toán đang chờ xử lý</p>
                                                <p className="mt-1">Sau khi hủy, bạn có thể đăng ký lại sự kiện này.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setCancelModal(null)}
                                            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-[#00358F] hover:text-[#00358F] transition-all"
                                        >
                                            Không
                                        </button>
                                        <button
                                            onClick={handleConfirmCancel}
                                            disabled={cancellingId !== null}
                                            className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {cancellingId !== null && <RefreshCw className="w-4 h-4 animate-spin" />}
                                            Hủy thanh toán
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
