'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import Link from 'next/link';

interface Notification {
    id: string;
    type: 'event_pending' | 'system_alert' | 'event_approved' | 'registration';
    title: string;
    message: string;
    time: string;
    read: boolean;
}

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // TODO: Fetch from API
        const mockNotifications: Notification[] = [
            {
                id: '1',
                type: 'event_pending',
                title: 'Sự kiện chờ duyệt',
                message: 'Workshop AI đang chờ phê duyệt',
                time: '5 phút trước',
                read: false
            },
            {
                id: '2',
                type: 'system_alert',
                title: 'Cảnh báo hệ thống',
                message: 'Hệ thống sẽ bảo trì vào 2h sáng',
                time: '1 giờ trước',
                read: false
            },
            {
                id: '3',
                type: 'registration',
                title: 'Đăng ký mới',
                message: '15 sinh viên vừa đăng ký sự kiện',
                time: '2 giờ trước',
                read: true
            }
        ];
        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter(n => !n.read).length);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const getNotificationIcon = (type: string) => {
        const colors = {
            event_pending: 'bg-yellow-100 text-yellow-600',
            system_alert: 'bg-red-100 text-red-600',
            event_approved: 'bg-green-100 text-green-600',
            registration: 'bg-blue-100 text-blue-600'
        };
        return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-600';
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
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
                        {notifications.length > 0 ? (
                            <ul className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <li
                                        key={notification.id}
                                        className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationIcon(notification.type)}`}>
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
                                                            {notification.time}
                                                        </p>
                                                    </div>
                                                    {!notification.read && (
                                                        <button
                                                            onClick={() => markAsRead(notification.id)}
                                                            className="text-blue-600 hover:text-blue-700"
                                                            title="Đánh dấu đã đọc"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                Không có thông báo mới
                            </div>
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
