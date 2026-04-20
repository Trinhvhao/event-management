'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check } from 'lucide-react';
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

function formatRelativeTime(dateString: string): string {
    const target = new Date(dateString).getTime();
    const now = Date.now();
    const diffMs = Math.max(now - target, 0);
    const diffMin = Math.floor(diffMs / (1000 * 60));

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} ngày trước`;

    return new Date(dateString).toLocaleDateString('vi-VN');
}

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<BellNotification[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchBellData = useCallback(async () => {
        try {
            setLoading(true);
            const [listResponse, unread] = await Promise.all([
                notificationService.getAll({ limit: 10, offset: 0 }),
                notificationService.getUnreadCount(),
            ]);

            setNotifications((listResponse.notifications || []) as BellNotification[]);
            setUnreadCount(unread);
        } catch (error) {
            console.error('Failed to fetch notifications for bell:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBellData();
        const timer = setInterval(fetchBellData, 60000);
        return () => clearInterval(timer);
    }, [fetchBellData]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications((prev) =>
                prev.map((notification) =>
                    notification.id === id ? { ...notification, is_read: true } : notification
                )
            );
            setUnreadCount((prev) => Math.max(prev - 1, 0));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        const colors = {
            registration_confirm: 'bg-blue-100 text-blue-600',
            event_reminder: 'bg-indigo-100 text-indigo-600',
            event_update: 'bg-cyan-100 text-cyan-600',
            event_cancelled: 'bg-red-100 text-red-600',
            checkin_success: 'bg-emerald-100 text-emerald-600',
            points_awarded: 'bg-amber-100 text-amber-600',
            feedback_request: 'bg-purple-100 text-purple-600',
        };

        return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-600';
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-700"
                            >
                                Đánh dấu đã đọc
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Đang tải thông báo...</div>
                        ) : notifications.length > 0 ? (
                            <ul className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <li
                                        key={notification.id}
                                        className={`p-4 hover:bg-gray-50 transition-colors ${
                                            !notification.is_read ? 'bg-blue-50' : ''
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getNotificationIcon(
                                                    notification.type
                                                )}`}
                                            >
                                                <Bell className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900 text-sm">
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {formatRelativeTime(notification.sent_at)}
                                                        </p>
                                                    </div>
                                                    {!notification.is_read && (
                                                        <button
                                                            onClick={() => markAsRead(notification.id)}
                                                            className="text-blue-600 hover:text-blue-700"
                                                            title="Đánh dấu đã đọc"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                {notification.event_id && (
                                                    <Link
                                                        href={`/dashboard/events/${notification.event_id}`}
                                                        className="inline-block mt-2 text-xs text-brandBlue hover:underline"
                                                    >
                                                        Xem sự kiện liên quan
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-gray-500">Không có thông báo mới</div>
                        )}
                    </div>

                    <div className="p-3 border-t border-gray-200">
                        <Link
                            href="/dashboard/notifications"
                            className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Xem tất cả thông báo
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}