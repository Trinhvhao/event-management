'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, ChevronLeft, ChevronRight, BellRing, Calendar } from 'lucide-react';
import Link from 'next/link';
import { notificationService } from '@/services/notificationService';
import { NotificationType } from '@/types';

interface BellNotification {
    id: number;
    type: NotificationType | string;
    title: string;
    message: string;
    sent_at: string;
    is_read: boolean;
    event_id?: number;
}

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const PAGE_SIZE = 8;

function formatRelativeTime(dateString: string): string {
    const diffMs = Math.max(Date.now() - new Date(dateString).getTime(), 0);
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
    registration_confirm: { color: 'text-[var(--color-brand-navy)]', bg: 'bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)]', icon: '📋' },
    event_reminder:      { color: 'text-[var(--color-brand-orange)]', bg: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,transparent)]', icon: '⏰' },
    event_update:        { color: 'text-[#06b6d4]',                  bg: 'bg-[color-mix(in_srgb,#06b6d4_10%,transparent)]',                  icon: '🔔' },
    event_cancelled:     { color: 'text-[var(--color-brand-red)]',  bg: 'bg-[color-mix(in_srgb,var(--color-brand-red)_10%,transparent)]',  icon: '❌' },
    checkin_success:      { color: 'text-[var(--color-brand-green)]', bg: 'bg-[color-mix(in_srgb,var(--color-brand-green)_10%,transparent)]', icon: '✅' },
    points_awarded:       { color: 'text-[var(--color-brand-gold)]',  bg: 'bg-[color-mix(in_srgb,var(--color-brand-gold)_10%,transparent)]',  icon: '⭐' },
    feedback_request:     { color: 'text-[#8b5cf6]',                 bg: 'bg-[color-mix(in_srgb,#8b5cf6_10%,transparent)]',                  icon: '💬' },
};

function NotificationItem({ notification, onMarkRead }: { notification: BellNotification; onMarkRead: (id: number) => void }) {
    const cfg = TYPE_CONFIG[notification.type] || { color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-muted)]', icon: '📌' };

    return (
        <div className={`flex gap-3 p-4 transition-colors ${!notification.is_read ? 'bg-[color-mix(in_srgb,var(--color-brand-navy)_4%,transparent)]' : 'hover:bg-[var(--bg-muted)]'}`}>
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base ${cfg.bg}`}>
                <span className={cfg.color}>{cfg.icon}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                            {notification.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed line-clamp-2">
                            {notification.message}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 font-medium">
                            {formatRelativeTime(notification.sent_at)}
                        </p>
                    </div>

                    {/* Unread indicator + mark as read */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                        {!notification.is_read && (
                            <button
                                onClick={() => onMarkRead(notification.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] text-[var(--color-brand-navy)] hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_16%,transparent)] transition-colors"
                                title="Đánh dấu đã đọc"
                            >
                                <Check className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {notification.is_read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-light)]" />
                        )}
                    </div>
                </div>

                {notification.event_id && (
                    <Link
                        href={`/dashboard/events/${notification.event_id}`}
                        className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-[var(--color-brand-navy)] hover:underline"
                    >
                        <Calendar className="w-3 h-3" />
                        Xem sự kiện liên quan
                    </Link>
                )}
            </div>
        </div>
    );
}

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<BellNotification[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async (page: number) => {
        try {
            setLoading(true);
            const offset = (page - 1) * PAGE_SIZE;
            const [listResponse, unread] = await Promise.all([
                notificationService.getAll({ limit: PAGE_SIZE, offset }),
                notificationService.getUnreadCount(),
            ]);

            setNotifications(listResponse.notifications || []);
            setUnreadCount(unread);
            setPagination((prev) => ({
                ...prev,
                page,
                limit: PAGE_SIZE,
                total: listResponse.total || 0,
                totalPages: Math.ceil((listResponse.total || 0) / PAGE_SIZE),
            }));
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) fetchNotifications(1);
    }, [isOpen, fetchNotifications]);

    // Refresh unread count periodically
    useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(async () => {
            try {
                const unread = await notificationService.getUnreadCount();
                setUnreadCount(unread);
            } catch { /* silent */ }
        }, 30000);
        return () => clearInterval(timer);
    }, [isOpen]);

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAsRead = async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((prev) => Math.max(prev - 1, 0));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;
        fetchNotifications(newPage);
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--color-brand-navy)] hover:bg-[var(--bg-muted)] transition-all duration-200"
                aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-red)] text-[10px] font-extrabold text-white shadow-md">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-[420px] bg-white rounded-2xl shadow-[var(--shadow-xl)] border border-[var(--border-default)] z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--bg-muted)]/50 to-transparent">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                                <BellRing className="w-4 h-4 text-[var(--color-brand-navy)]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">Thông báo</h3>
                                {unreadCount > 0 && (
                                    <p className="text-[10px] text-[var(--color-brand-navy)] font-semibold">{unreadCount} chưa đọc</p>
                                )}
                            </div>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs font-semibold text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] transition-colors"
                            >
                                Đánh dấu đã đọc
                            </button>
                        )}
                    </div>

                    {/* Notification list */}
                    <div className="max-h-[420px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center gap-3 py-12">
                                <div className="w-6 h-6 rounded-full border-2 border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                <span className="text-sm text-[var(--text-muted)] font-medium">Đang tải thông báo...</span>
                            </div>
                        ) : notifications.length > 0 ? (
                            <>
                                <div className="divide-y divide-[var(--border-light)]">
                                    {notifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onMarkRead={markAsRead}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {pagination.totalPages > 1 && (
                                    <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-default)] bg-[var(--bg-muted)]/30">
                                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                            Trang {pagination.page} / {pagination.totalPages}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                disabled={pagination.page <= 1}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-default)] bg-white text-[var(--text-muted)] transition-colors hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label="Trang trước"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                disabled={pagination.page >= pagination.totalPages}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-default)] bg-white text-[var(--text-muted)] transition-colors hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label="Trang sau"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-14 gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                    <Bell className="w-7 h-7 text-[var(--text-muted)]" />
                                </div>
                                <p className="text-sm font-semibold text-[var(--text-secondary)]">Không có thông báo mới</p>
                                <p className="text-xs text-[var(--text-muted)]">Bạn sẽ nhận thông báo khi có cập nhật</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-[var(--border-default)]">
                        <Link
                            href="/dashboard/notifications"
                            onClick={() => setIsOpen(false)}
                            className="block text-center text-sm font-bold text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] transition-colors"
                        >
                            Xem tất cả thông báo →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
