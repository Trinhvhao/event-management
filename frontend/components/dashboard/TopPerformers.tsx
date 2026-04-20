'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, TrendingUp, MessageSquare } from 'lucide-react';
import { feedbackService, TopRatedEvent } from '@/services/feedbackService';
import { toast } from 'sonner';

export default function TopPerformers() {
    const [events, setEvents] = useState<TopRatedEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadTopRated = async () => {
            try {
                setIsLoading(true);
                const data = await feedbackService.getTopRatedEvents(5);
                setEvents(data);
            } catch {
                toast.error('Không thể tải danh sách sự kiện được đánh giá cao');
            } finally {
                setIsLoading(false);
            }
        };

        loadTopRated();
    }, []);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Top Rated Events</h3>
                    <p className="text-sm text-gray-500 mt-1">Sự kiện có phản hồi tích cực nhất</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                    <Star className="w-5 h-5 text-yellow-600" />
                </div>
            </div>

            {isLoading ? (
                <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
            ) : (
                <div className="space-y-3">
                    {events.map((event, index) => (
                        <Link
                            key={event.id}
                            href={`/dashboard/events/${event.id}`}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-brandBlue text-white flex items-center justify-center text-xs font-semibold">
                                #{index + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                                <p className="text-xs text-gray-500">
                                    {new Date(event.start_time).toLocaleDateString('vi-VN')}
                                </p>
                            </div>

                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1 text-sm font-bold text-amber-600">
                                    <Star className="w-4 h-4 fill-amber-500" />
                                    {event.average_rating.toFixed(1)}
                                </div>
                                <p className="text-xs text-gray-500 inline-flex items-center gap-1 justify-end">
                                    <MessageSquare className="w-3 h-3" />
                                    {event.feedback_count} phản hồi
                                </p>
                            </div>
                        </Link>
                    ))}
                    {events.length === 0 && (
                        <p className="text-sm text-gray-500">Chưa có dữ liệu đánh giá sự kiện.</p>
                    )}
                </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
                <Link
                    href="/dashboard/events"
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2"
                >
                    Xem danh sách sự kiện
                    <TrendingUp className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
