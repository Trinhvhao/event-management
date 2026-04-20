'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { eventService } from '@/services/eventService';
import { notificationService } from '@/services/notificationService';
import { useAuthStore } from '@/store/authStore';
import type { Event, EventStatus } from '@/types';

type ActivityType = 'event' | 'notification' | 'system';

interface ActivityItem {
    id: string;
    type: ActivityType;
    actor: string;
    action: string;
    target: string;
    timestamp: string;
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
    return `${diffDay} ngày trước`;
}

function mapEventStatus(status: EventStatus): string {
    const statusLabel = {
        pending: 'chờ duyệt',
        approved: 'đã duyệt',
        upcoming: 'sắp diễn ra',
        ongoing: 'đang diễn ra',
        completed: 'đã kết thúc',
        cancelled: 'đã hủy',
    };

    return statusLabel[status] || status;
}

export default function ActivityLog() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<ActivityItem[]>([]);

    const getActivityIcon = (type: ActivityType) => {
        switch (type) {
            case 'event':
                return <FileText className="w-5 h-5 text-blue-500" />;
            case 'notification':
                return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'system':
                return <AlertCircle className="w-5 h-5 text-orange-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const loadActivities = useCallback(async () => {
        try {
            setLoading(true);

            const [notificationResult, events] = await Promise.all([
                notificationService
                    .getAll({ limit: 6, offset: 0 })
                    .catch(() => ({ notifications: [], total: 0, limit: 0, offset: 0, has_more: false, message: '' })),
                user?.role === 'organizer'
                    ? eventService.getMyEvents().then((data) => data.slice(0, 6))
                    : eventService.getAll({ page: 1, limit: 6 }).then((data) => data.data.items || []),
            ]);

            const fromNotifications: ActivityItem[] = (notificationResult.notifications || []).map((item) => ({
                id: `notif-${item.id}`,
                type: 'notification',
                actor: 'Hệ thống',
                action: 'gửi thông báo',
                target: item.title,
                timestamp: item.sent_at,
            }));

            const fromEvents: ActivityItem[] = (events as Event[]).map((event) => ({
                id: `event-${event.id}`,
                type: 'event',
                actor: event.organizer?.full_name || 'Ban tổ chức',
                action: 'cập nhật sự kiện',
                target: `${event.title} (${mapEventStatus(event.status)})`,
                timestamp: event.updated_at,
            }));

            const merged = [...fromNotifications, ...fromEvents]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 8);

            setActivities(merged);
        } catch (error) {
            console.error('Failed to load activity log:', error);
            setActivities([]);
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        loadActivities();
    }, [loadActivities]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Hoạt động hệ thống</h3>

            {loading ? (
                <div className="py-8 text-center text-gray-500">Đang tải hoạt động gần đây...</div>
            ) : activities.length === 0 ? (
                <div className="py-8 text-center text-gray-500">Chưa có hoạt động nào gần đây.</div>
            ) : (
                <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                    <div className="space-y-6">
                        {activities.map((activity) => (
                            <div key={activity.id} className="relative flex gap-4">
                                <div className="relative z-10 shrink-0 w-12 h-12 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center">
                                    {getActivityIcon(activity.type)}
                                </div>

                                <div className="flex-1 pt-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-900">
                                                <span className="font-medium">{activity.actor}</span>
                                                {' '}
                                                {activity.action}
                                                {' '}
                                                <span className="font-medium text-blue-600">{activity.target}</span>
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {formatRelativeTime(activity.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
                <Link href="/dashboard/notifications" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Xem tất cả hoạt động →
                </Link>
            </div>
        </div>
    );
}