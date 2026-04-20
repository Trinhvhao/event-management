'use client';

import { useCallback, useEffect, useState } from 'react';
import { MoreVertical, Eye, Edit, CheckCircle, Link as LinkIcon, Clock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { eventService } from '@/services/eventService';
import { useAuthStore } from '@/store/authStore';
import type { Event, EventStatus } from '@/types';

export default function RecentEventsTable() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [approvingId, setApprovingId] = useState<number | null>(null);

    const loadEvents = useCallback(async () => {
        try {
            setLoading(true);
            if (user?.role === 'organizer') {
                const myEvents = await eventService.getMyEvents();
                setEvents(myEvents.slice(0, 5));
                return;
            }

            const response = await eventService.getAll({ page: 1, limit: 5 });
            setEvents(response.data.items || []);
        } catch (error) {
            console.error('Failed to load recent events:', error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const getStatusBadge = (status: EventStatus) => {
        const badges = {
            pending: { text: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
            approved: { text: 'Đã duyệt', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
            upcoming: { text: 'Sắp diễn ra', className: 'bg-blue-100 text-blue-700 border-blue-200' },
            ongoing: { text: 'Đang diễn ra', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            completed: { text: 'Đã kết thúc', className: 'bg-gray-100 text-gray-700 border-gray-200' },
            cancelled: { text: 'Đã hủy', className: 'bg-red-100 text-red-700 border-red-200' },
        };

        const badge = badges[status] || badges.upcoming;
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
                {badge.text}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getProgressPercentage = (current: number, max: number) => {
        if (max <= 0) return 0;
        return Math.min((current / max) * 100, 100);
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getOrganizerLabel = (event: Event) => {
        return event.organizer?.full_name || event.department?.name || 'Chưa xác định';
    };

    const handleApprove = async (eventId: number) => {
        try {
            setApprovingId(eventId);
            await eventService.approveEvent(eventId);
            toast.success('Đã phê duyệt sự kiện');
            setOpenMenuId(null);
            await loadEvents();
        } catch (error) {
            console.error('Failed to approve event:', error);
            toast.error('Không thể phê duyệt sự kiện');
        } finally {
            setApprovingId(null);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Sự kiện gần đây</h3>
                    <Link
                        href="/dashboard/events"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Xem tất cả →
                    </Link>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tên sự kiện
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Đơn vị tổ chức
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Thời gian
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Đăng ký
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Trạng thái
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Thao tác
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td className="px-6 py-8 text-center text-gray-500" colSpan={6}>
                                    Đang tải dữ liệu sự kiện...
                                </td>
                            </tr>
                        ) : events.length === 0 ? (
                            <tr>
                                <td className="px-6 py-8 text-center text-gray-500" colSpan={6}>
                                    Chưa có sự kiện nào.
                                </td>
                            </tr>
                        ) : (
                            events.map((event) => {
                                const progressPercentage = getProgressPercentage(
                                    event.current_registrations,
                                    event.capacity
                                );

                                return (
                                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                                    {event.title.charAt(0)}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900 line-clamp-1">
                                                        {event.title}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{getOrganizerLabel(event)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Clock className="w-4 h-4 mr-1" />
                                                {formatDate(event.start_time)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-700 font-medium">
                                                        {event.current_registrations}/{event.capacity}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">
                                                        {progressPercentage.toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
                                                            progressPercentage
                                                        )}`}
                                                        style={{ width: `${progressPercentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(event.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() =>
                                                        setOpenMenuId((prev) => (prev === event.id ? null : event.id))
                                                    }
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    <MoreVertical className="w-5 h-5 text-gray-500" />
                                                </button>

                                                {openMenuId === event.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                                        <div className="py-1">
                                                            <Link
                                                                href={`/dashboard/events/${event.id}`}
                                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                Xem chi tiết
                                                            </Link>
                                                            <Link
                                                                href={`/dashboard/events/${event.id}/edit`}
                                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Chỉnh sửa
                                                            </Link>
                                                            {event.status === 'pending' && user?.role === 'admin' && (
                                                                <button
                                                                    onClick={() => handleApprove(event.id)}
                                                                    disabled={approvingId === event.id}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 disabled:opacity-60"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    {approvingId === event.id ? 'Đang phê duyệt...' : 'Phê duyệt'}
                                                                </button>
                                                            )}
                                                            <Link
                                                                href={`/dashboard/checkin?eventId=${event.id}`}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                                            >
                                                                <LinkIcon className="w-4 h-4" />
                                                                Đi đến check-in
                                                            </Link>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}