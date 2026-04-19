import { motion } from 'framer-motion';
import Link from 'next/link';
import type { EventStatus } from '@/types';

interface Event {
    id: number;
    title: string;
    location: string;
    status: EventStatus;
}

interface RecentEventsProps {
    events: Event[];
    delay?: number;
}

export default function RecentEvents({ events, delay = 0.7 }: RecentEventsProps) {
    const getStatusBadge = (status: EventStatus) => {
        const badges = {
            upcoming: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sắp tới' },
            ongoing: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đang diễn ra' },
            completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Hoàn thành' },
            pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Chờ duyệt' },
            approved: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Đã duyệt' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Đã hủy' },
        };
        return badges[status];
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-primary tracking-tight">Sự kiện gần đây</h2>
                <Link
                    href="/dashboard/events"
                    className="text-sm font-medium text-brandBlue hover:text-brandBlue/80 transition-colors"
                >
                    Xem tất cả →
                </Link>
            </div>

            <div className="space-y-3">
                {events && events.length > 0 ? (
                    events.map((event) => {
                        const badge = getStatusBadge(event.status);
                        return (
                            <Link
                                key={event.id}
                                href={`/dashboard/events/${event.id}`}
                                className="block p-4 rounded-xl border border-gray-200 hover:border-brandBlue/30 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-primary mb-1">{event.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-1">{event.location}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                        {badge.label}
                                    </span>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                        <p className="text-gray-500 text-sm">Chưa có sự kiện nào</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
