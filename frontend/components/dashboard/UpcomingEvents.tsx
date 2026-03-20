'use client';

import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import Link from 'next/link';

interface Event {
    id: number;
    title: string;
    date: string;
    time: string;
    location: string;
    registered: number;
    capacity: number;
    category: string;
    color: string;
}

export default function UpcomingEvents() {
    const events: Event[] = [
        {
            id: 1,
            title: 'Workshop AI & Machine Learning',
            date: '25/03/2026',
            time: '14:00',
            location: 'Hội trường A',
            registered: 150,
            capacity: 200,
            category: 'Workshop',
            color: 'bg-blue-500'
        },
        {
            id: 2,
            title: 'Hội thảo Khởi nghiệp',
            date: '30/03/2026',
            time: '09:00',
            location: 'Phòng 301',
            registered: 120,
            capacity: 150,
            category: 'Hội thảo',
            color: 'bg-purple-500'
        },
        {
            id: 3,
            title: 'Ngày hội Tình nguyện',
            date: '05/04/2026',
            time: '07:00',
            location: 'Sân trường',
            registered: 200,
            capacity: 200,
            category: 'Hoạt động',
            color: 'bg-green-500'
        }
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Sự kiện sắp diễn ra</h3>
                    <p className="text-sm text-gray-500 mt-1">Đăng ký ngay để không bỏ lỡ</p>
                </div>
                <Calendar className="w-5 h-5 text-blue-500" />
            </div>

            <div className="space-y-4">
                {events.map((event) => {
                    const percentage = (event.registered / event.capacity) * 100;
                    return (
                        <div
                            key={event.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all hover:border-blue-300"
                        >
                            <div className="flex items-start gap-3">
                                {/* Color indicator */}
                                <div className={`w-1 h-16 ${event.color} rounded-full flex-shrink-0`} />

                                <div className="flex-1 min-w-0">
                                    {/* Title & Category */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
                                            {event.title}
                                        </h4>
                                        <span className={`text-xs px-2 py-1 rounded-full ${event.color} bg-opacity-10 text-gray-700 whitespace-nowrap`}>
                                            {event.category}
                                        </span>
                                    </div>

                                    {/* Date & Time */}
                                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {event.date}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {event.time}
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                                        <MapPin className="w-3 h-3" />
                                        {event.location}
                                    </div>

                                    {/* Registration Progress */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Users className="w-3 h-3" />
                                                <span>{event.registered}/{event.capacity} đã đăng ký</span>
                                            </div>
                                            <span className="font-medium text-gray-700">
                                                {percentage.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className={`h-full rounded-full ${event.color} transition-all`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6">
                <Link
                    href="/dashboard/events"
                    className="w-full block text-center py-2 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                    Xem tất cả sự kiện →
                </Link>
            </div>
        </div>
    );
}
