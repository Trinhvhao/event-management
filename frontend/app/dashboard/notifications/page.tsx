'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { notificationService } from '@/services/notificationService';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    Bell, CheckCheck, Calendar, Award, AlertCircle, Info,
    Trash2, ChevronLeft, ChevronRight, Inbox
} from 'lucide-react';
import { Notification } from '@/types';

const PAGE_SIZE = 15;

interface NotificationItem {
    id: number;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    sent_at: string;
    event_id?: number;
    event?: {
        id: number;
        title: string;
        start_time: string;
        location: string;
    };
}

function getNotificationIcon(type: string) {
    switch (type) {
        case 'event_reminder':
            return { Icon: Calendar, color: '#2563eb', bg: 'bg-blue-50' };
        case 'registration_confirm':
            return { Icon: CheckCheck, color: '#16a34a', bg: 'bg-green-50' };
        case 'points_awarded':
        case 'training_points_awarded':
            return { Icon: Award, color: '#d97706', bg: 'bg-orange-50' };
        case 'checkin_success':
            return { Icon: CheckCheck, color: '#059669', bg: 'bg-emerald-50' };
        case 'feedback_request':
            return { Icon: AlertCircle, color: '#ca8a04', bg: 'bg-yellow-50' };
        case 'event_cancelled':
            return { Icon: AlertCircle, color: '#dc2626', bg: 'bg-red-50' };
        case 'event_update':
            return { Icon: Bell, color: '#7c3aed', bg: 'bg-purple-50' };
        default:
            return { Icon: Info, color: '#6b7280', bg: 'bg-gray-50' };
    }
}

function NotificationSkeleton() {
    return (
        <div className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-[var(--border-default)] animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="h-5 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-16" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
            </div>
        </div>
    );
}

export default function NotificationsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

    const refreshUnreadCount = useCallback(async () => {
        try {
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch {
            setUnreadCount(0);
        }
    }, []);

    const fetchNotifications = useCallback(async (reset = true) => {
        try {
            if (reset) {
                setLoading(true);
                setPage(1);
            }

            const response = await notificationService.getAll({
                limit: PAGE_SIZE,
                offset: reset ? 0 : (page - 1) * PAGE_SIZE,
                unread_only: filter === 'unread',
            });

            const rows = response.notifications || [];
            const total = response.total || 0;

            setNotifications(rows);
            setTotalItems(total);
            setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
            await refreshUnreadCount();
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Không thể tải thông báo');
        } finally {
            setLoading(false);
        }
    }, [filter, page, refreshUnreadCount]);

    useEffect(() => {
        void fetchNotifications(true);
    }, [filter]);

    useEffect(() => {
        if (page > 1) {
            void fetchNotifications(false);
        }
    }, [page]);

    const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (processingIds.has(id)) return;

        setProcessingIds(prev => new Set(prev).add(id));
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            await refreshUnreadCount();
        } catch {
            toast.error('Không thể đánh dấu đã đọc');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            await refreshUnreadCount();
            toast.success('Đã đánh dấu tất cả là đã đọc');
        } catch {
            toast.error('Không thể đánh dấu đã đọc');
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (processingIds.has(id)) return;

        setProcessingIds(prev => new Set(prev).add(id));
        try {
            await notificationService.delete(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setTotalItems(prev => prev - 1);
            await refreshUnreadCount();
            toast.success('Đã xóa thông báo');
        } catch {
            toast.error('Không thể xóa thông báo');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleNotificationClick = (notification: NotificationItem) => {
        if (!notification.is_read) {
            void handleMarkAsRead(notification.id);
        }
        if (notification.event_id) {
            router.push(`/dashboard/events/${notification.event_id}`);
        }
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                pages.push(i);
            }
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }

        return (
            <div className="flex items-center justify-center gap-2 mt-8">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="w-10 h-10 rounded-xl border-2 border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)]">
                            ...
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => setPage(p as number)}
                            className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                                page === p
                                    ? 'bg-[var(--color-brand-navy)] text-white shadow-[var(--shadow-brand)]'
                                    : 'border-2 border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)]'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="w-10 h-10 rounded-xl border-2 border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-5 max-w-screen-2xl mx-auto">

                {/* ── PAGE HEADER ── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[var(--color-brand-navy)] opacity-[0.03] pointer-events-none" />
                    <div className="px-6 pt-6 pb-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                                    <Bell className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Notifications</p>
                                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">Thông báo</h1>
                                    <p className="text-sm text-[var(--text-muted)]">
                                        {unreadCount > 0
                                            ? `Bạn có ${unreadCount} thông báo chưa đọc`
                                            : 'Tất cả thông báo đã được đọc'}
                                    </p>
                                </div>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all text-sm font-semibold bg-white shadow-sm"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                    Đánh dấu tất cả đã đọc
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── FILTER TABS ── */}
                <div className="flex items-center gap-1.5 p-1.5 bg-[var(--bg-muted)] rounded-2xl w-fit">
                    {[
                        { key: 'all', label: 'Tất cả', count: totalItems },
                        { key: 'unread', label: 'Chưa đọc', count: unreadCount },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key as 'all' | 'unread')}
                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                                filter === tab.key
                                    ? 'bg-white text-[var(--color-brand-navy)] shadow-[var(--shadow-xs)]'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    filter === tab.key
                                        ? 'bg-[var(--color-brand-navy)] text-white'
                                        : 'bg-white text-[var(--text-muted)] border border-[var(--border-default)]'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── NOTIFICATIONS LIST ── */}
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <NotificationSkeleton key={i} />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-20 text-center shadow-[var(--shadow-card)]">
                        <div className="w-20 h-20 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center mx-auto mb-6">
                            <Inbox className="w-10 h-10 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Không có thông báo nào</h3>
                        <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
                            {filter === 'unread'
                                ? 'Bạn đã đọc tất cả thông báo. Quay lại tab "Tất cả" để xem lịch sử.'
                                : 'Hiện tại chưa có thông báo nào được gửi đến bạn.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {notifications.map((notification, index) => {
                                const { Icon, color, bg } = getNotificationIcon(notification.type);
                                const isProcessing = processingIds.has(notification.id);

                                return (
                                    <motion.div
                                        key={notification.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.04, duration: 0.3 }}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer group ${
                                            notification.is_read
                                                ? 'border-[var(--border-default)] bg-white hover:border-slate-300 hover:shadow-[var(--shadow-card-hover)]'
                                                : 'border-[color-mix(in_srgb,var(--color-brand-navy)_20%,transparent)] bg-white hover:border-[var(--color-brand-navy)] hover:shadow-[var(--shadow-card-hover)]'
                                        }`}
                                    >
                                        {!notification.is_read && (
                                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-brand-navy)] to-[var(--color-brand-orange)] rounded-l-2xl" />
                                        )}

                                        <div className="flex items-start gap-4 p-5 pl-6">
                                            {/* Icon */}
                                            <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                                                <Icon className="w-5 h-5" style={{ color }} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className={`text-sm font-bold leading-snug ${notification.is_read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                                                            {notification.title}
                                                        </h3>
                                                        <p className={`text-sm mt-1 leading-relaxed ${notification.is_read ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-[11px] text-[var(--text-muted)] mt-2 font-medium">
                                                            {format(new Date(notification.sent_at), "EEEE, dd/MM/yyyy • HH:mm", { locale: vi })}
                                                        </p>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {!notification.is_read && (
                                                            <button
                                                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                                disabled={isProcessing}
                                                                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-brand-navy)] hover:bg-blue-50 transition-all disabled:opacity-50"
                                                                title="Đánh dấu đã đọc"
                                                            >
                                                                <CheckCheck className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => handleDelete(notification.id, e)}
                                                            disabled={isProcessing}
                                                            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                            title="Xóa thông báo"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* ── PAGINATION ── */}
                        {renderPagination()}

                        {/* Results info */}
                        {totalItems > 0 && (
                            <p className="text-center text-sm text-[var(--text-muted)]">
                                Hiển thị <span className="font-bold text-[var(--text-primary)]">{notifications.length}</span> trong{' '}
                                <span className="font-bold text-[var(--text-primary)]">{totalItems}</span> thông báo
                            </p>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
