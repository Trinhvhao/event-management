'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Bell, CheckCheck, Calendar, Award, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { notificationService } from '@/services/notificationService';
import { toast } from 'sonner';

interface Notification {
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

export default function NotificationsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchNotifications();
    }, [router]);

    const fetchNotifications = async () => {
        try {
            const response = await notificationService.getAll({ limit: 50 });
            setNotifications(response.notifications || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Không thể tải thông báo');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev =>
                prev.map(notif => notif.id === id ? { ...notif, is_read: true } : notif)
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev =>
                prev.map(notif => ({ ...notif, is_read: true }))
            );
            toast.success('Đã đánh dấu tất cả là đã đọc');
        } catch (error) {
            console.error('Error marking all as read:', error);
            toast.error('Không thể đánh dấu đã đọc');
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'event_reminder':
                return { Icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' };
            case 'registration_success':
                return { Icon: CheckCheck, color: 'text-green-600', bg: 'bg-green-50' };
            case 'points_awarded':
                return { Icon: Award, color: 'text-secondary', bg: 'bg-orange-50' };
            case 'checkin_success':
                return { Icon: CheckCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' };
            case 'feedback_request':
                return { Icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' };
            case 'event_cancelled':
                return { Icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' };
            default:
                return { Icon: Info, color: 'text-gray-600', bg: 'bg-gray-50' };
        }
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.is_read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-primary mb-2">Thông báo</h1>
                        <p className="text-gray-600">
                            {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : 'Không có thông báo mới'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="px-4 py-2 text-brandBlue hover:bg-brandLightBlue/10 rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                            <CheckCheck className="w-5 h-5" />
                            Đánh dấu tất cả đã đọc
                        </button>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 border-b border-gray-200">
                    {[
                        { key: 'all', label: 'Tất cả', count: notifications.length },
                        { key: 'unread', label: 'Chưa đọc', count: unreadCount },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key as 'all' | 'unread')}
                            className={`px-6 py-3 font-semibold transition-colors relative ${filter === tab.key
                                ? 'text-brandBlue'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${filter === tab.key
                                    ? 'bg-brandBlue text-white'
                                    : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                            {filter === tab.key && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brandBlue"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Notifications List */}
                <div className="space-y-3">
                    {filteredNotifications.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium mb-2">Không có thông báo</p>
                            <p className="text-gray-400 text-sm">
                                {filter === 'unread' ? 'Bạn đã đọc tất cả thông báo' : 'Chưa có thông báo nào'}
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map((notification, index) => {
                            const { Icon, color, bg } = getNotificationIcon(notification.type);

                            return (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 * index }}
                                    onClick={() => {
                                        if (!notification.is_read) markAsRead(notification.id);
                                        if (notification.event_id) {
                                            router.push(`/dashboard/events/${notification.event_id}`);
                                        }
                                    }}
                                    className={`bg-white rounded-xl p-5 border-2 transition-all cursor-pointer group ${notification.is_read
                                        ? 'border-gray-200 hover:border-gray-300'
                                        : 'border-brandBlue/30 bg-brandLightBlue/5 hover:border-brandBlue/50'
                                        }`}
                                >
                                    <div className="flex gap-4">
                                        {/* Icon */}
                                        <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <Icon className={`w-6 h-6 ${color}`} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-1">
                                                <h3 className={`font-bold ${notification.is_read ? 'text-gray-700' : 'text-primary'}`}>
                                                    {notification.title}
                                                </h3>
                                                {!notification.is_read && (
                                                    <div className="w-2.5 h-2.5 bg-brandBlue rounded-full flex-shrink-0 mt-1.5"></div>
                                                )}
                                            </div>
                                            <p className={`text-sm mb-2 ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(notification.sent_at).toLocaleString('vi-VN', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
