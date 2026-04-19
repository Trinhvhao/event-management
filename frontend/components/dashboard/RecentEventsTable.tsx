'use client';

import { useState } from 'react';
import { MoreVertical, Eye, Edit, CheckCircle, Link as LinkIcon, Clock, Users } from 'lucide-react';
import Link from 'next/link';

interface Event {
    id: string;
    title: string;
    organizer: string;
    startDate: string;
    status: 'pending' | 'approved' | 'ongoing' | 'completed';
    registrations: number;
    maxParticipants: number;
}

const MOCK_EVENTS: Event[] = [
    {
        id: '1',
        title: 'Workshop AI & Machine Learning',
        organizer: 'Khoa CNTT',
        startDate: '2026-03-25T14:00:00',
        status: 'approved',
        registrations: 150,
        maxParticipants: 200
    },
    {
        id: '2',
        title: 'Giải bóng đá sinh viên 2026',
        organizer: 'Đoàn trường',
        startDate: '2026-03-28T08:00:00',
        status: 'pending',
        registrations: 80,
        maxParticipants: 100
    },
    {
        id: '3',
        title: 'Hội thảo Khởi nghiệp',
        organizer: 'CLB Khởi nghiệp',
        startDate: '2026-03-30T09:00:00',
        status: 'approved',
        registrations: 120,
        maxParticipants: 150
    },
    {
        id: '4',
        title: 'Ngày hội Tình nguyện',
        organizer: 'Đoàn trường',
        startDate: '2026-04-05T07:00:00',
        status: 'ongoing',
        registrations: 200,
        maxParticipants: 200
    }
];

export default function RecentEventsTable() {
    const [events] = useState<Event[]>(MOCK_EVENTS);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const getStatusBadge = (status: string) => {
        const badges = {
            pending: { text: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
            approved: { text: 'Đã duyệt', class: 'bg-green-100 text-green-700 border-green-200' },
            ongoing: { text: 'Đang diễn ra', class: 'bg-blue-100 text-blue-700 border-blue-200' },
            completed: { text: 'Đã kết thúc', class: 'bg-gray-100 text-gray-700 border-gray-200' }
        };
        const badge = badges[status as keyof typeof badges];
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badge.class}`}>
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
            minute: '2-digit'
        });
    };

    const getProgressPercentage = (current: number, max: number) => {
        return Math.min((current / max) * 100, 100);
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
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
                        {events.map((event) => {
                            const progressPercentage = getProgressPercentage(event.registrations, event.maxParticipants);
                            return (
                                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                                {event.title.charAt(0)}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">{event.title}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{event.organizer}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <Clock className="w-4 h-4 mr-1" />
                                            {formatDate(event.startDate)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-700 font-medium">
                                                    {event.registrations}/{event.maxParticipants}
                                                </span>
                                                <span className="text-gray-500 text-xs">
                                                    {progressPercentage.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${getProgressColor(progressPercentage)}`}
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
                                                onClick={() => setOpenMenuId(openMenuId === event.id ? null : event.id)}
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
                                                        {event.status === 'pending' && (
                                                            <button
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                                Phê duyệt
                                                            </button>
                                                        )}
                                                        <button
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <LinkIcon className="w-4 h-4" />
                                                            Lấy link điểm danh
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
