'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { eventService } from '@/services/eventService';
import { registrationService } from '@/services/registrationService';
import { Event } from '@/types';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    Calendar,
    Users,
    CheckCircle,
    Plus,
    ArrowRight,
    Clock,
    MapPin,
    Star,
    BarChart3,
    QrCode,
    Loader2,
    Eye,
} from 'lucide-react';

interface OrganizerStats {
    totalEvents: number;
    upcomingEvents: number;
    completedEvents: number;
    totalRegistrations: number;
    totalAttendees: number;
    avgAttendanceRate: number;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    approved: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-700', dot: 'bg-cyan-500' },
    upcoming: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
    ongoing: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    completed: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-600', dot: 'bg-slate-400' },
    cancelled: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', dot: 'bg-red-500' },
};

const statusLabels: Record<string, string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    upcoming: 'Sắp diễn ra',
    ongoing: 'Đang diễn ra',
    completed: 'Đã kết thúc',
    cancelled: 'Đã hủy',
};

function StatCard({ title, value, subtitle, icon, color, trend }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: { value: number; label: string };
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-(--border-default) shadow-card p-5 hover:shadow-card-hover transition-all"
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    {icon}
                </div>
                {trend && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend.value >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {trend.value >= 0 ? '+' : ''}{trend.value}%
                    </span>
                )}
            </div>
            <p className="text-2xl font-extrabold text-(--text-primary) mb-1">{value}</p>
            <p className="text-sm font-medium text-(--text-muted)">{title}</p>
            {subtitle && <p className="text-xs text-(--text-muted) mt-1">{subtitle}</p>}
        </motion.div>
    );
}

function EventStatusBadge({ status }: { status: string }) {
    const colors = statusColors[status] || statusColors.pending;
    const label = statusLabels[status] || status;
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${colors.bg} ${colors.text}`}>
            {label}
        </span>
    );
}

export default function OrganizerDashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isHydrated } = useAuthStore();
    const [events, setEvents] = useState<Event[]>([]);
    const [stats, setStats] = useState<OrganizerStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState<{ type: string; message: string; time: string }[]>([]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const myEvents = await eventService.getMyEvents();
            const eventList: Event[] = Array.isArray(myEvents) ? myEvents : [];

            // Calculate stats
            const total = eventList.length;
            const upcoming = eventList.filter(e => e.status === 'upcoming' || e.status === 'approved').length;
            const completed = eventList.filter(e => e.status === 'completed').length;
            const totalRegs = eventList.reduce((sum, e) => sum + (e.current_registrations || 0), 0);

            // Get attendance data for each event
            let totalCheckedIn = 0;
            const statsData = await Promise.allSettled(
                eventList.slice(0, 10).map(async (e) => {
                    try {
                        const regs = await registrationService.getEventRegistrations(e.id);
                        const attended = (regs as unknown as Array<{ attendance?: unknown }>).filter(r => r.attendance).length;
                        return { id: e.id, attended };
                    } catch {
                        return { id: e.id, attended: 0 };
                    }
                })
            );

            statsData.forEach(result => {
                if (result.status === 'fulfilled') {
                    totalCheckedIn += result.value.attended;
                }
            });

            setStats({
                totalEvents: total,
                upcomingEvents: upcoming,
                completedEvents: completed,
                totalRegistrations: totalRegs,
                totalAttendees: totalCheckedIn,
                avgAttendanceRate: totalRegs > 0 ? Math.round((totalCheckedIn / totalRegs) * 100) : 0,
            });

            // Simulate recent activity
            setRecentActivity([
                { type: 'registration', message: '5 sinh viên mới đăng ký sự kiện Workshop AI', time: '5 phút trước' },
                { type: 'checkin', message: '20 người đã check-in sự kiện Workshop AI', time: '1 giờ trước' },
                { type: 'feedback', message: 'Người dùng mới đánh giá 5★ sự kiện Workshop AI', time: '2 giờ trước' },
            ]);

            setEvents(eventList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (error) {
            console.error('Error loading organizer data:', error);
            toast.error('Không thể tải dữ liệu dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (user?.role !== 'organizer' && user?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        void loadData();
    }, [isHydrated, isAuthenticated, user?.role, router, loadData]);

    if (loading || !stats) {
        return (
            <DashboardLayout>
                <div className="p-6">
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-(--color-brand-navy)" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-extrabold text-(--text-primary)">
                                Chào mừng, {user?.full_name} 👋
                            </h1>
                            <p className="text-sm text-(--text-muted) mt-1">
                                Đây là trang quản lý dành cho người tổ chức sự kiện
                            </p>
                        </div>
                        <Link
                            href="/dashboard/events/create"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-brand-navy) text-white rounded-xl text-sm font-semibold shadow-brand hover:opacity-90 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Tạo sự kiện mới
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <StatCard
                        title="Tổng sự kiện"
                        value={stats.totalEvents}
                        subtitle={`${stats.upcomingEvents} đang diễn ra`}
                        icon={<Calendar className="w-5 h-5 text-(--color-brand-navy)" />}
                        color="bg-[color-mix(in_srgb,#00358F_10%,transparent)]"
                    />
                    <StatCard
                        title="Lượt đăng ký"
                        value={stats.totalRegistrations.toLocaleString('vi-VN')}
                        subtitle="Tổng tất cả sự kiện"
                        icon={<Users className="w-5 h-5 text-(--color-brand-orange)" />}
                        color="bg-[color-mix(in_srgb,#F26600_10%,transparent)]"
                    />
                    <StatCard
                        title="Đã tham dự"
                        value={stats.totalAttendees.toLocaleString('vi-VN')}
                        subtitle={`Tỷ lệ: ${stats.avgAttendanceRate}%`}
                        icon={<CheckCircle className="w-5 h-5 text-brand-green" />}
                        color="bg-[color-mix(in_srgb,#00A651_10%,transparent)]"
                    />
                    <StatCard
                        title="Sự kiện đã kết thúc"
                        value={stats.completedEvents}
                        subtitle="Tổng sự kiện hoàn thành"
                        icon={<Star className="w-5 h-5 text-amber-500" />}
                        color="bg-amber-50"
                    />
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Quick Actions */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-(--border-default) shadow-card p-6">
                        <h2 className="text-base font-bold text-(--text-primary) mb-4">Thao tác nhanh</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Link
                                href="/dashboard/events/create"
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-(--border-default) hover:border-(--color-brand-navy) hover:bg-[color-mix(in_srgb,#00358F_5%,transparent)] transition-all group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,#00358F_10%,transparent)] flex items-center justify-center group-hover:bg-[color-mix(in_srgb,#00358F_20%,transparent)]">
                                    <Plus className="w-5 h-5 text-(--color-brand-navy)" />
                                </div>
                                <span className="text-xs font-semibold text-(--text-secondary) text-center">Tạo sự kiện</span>
                            </Link>
                            <Link
                                href="/dashboard/checkin"
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-(--border-default) hover:border-brand-green hover:bg-[color-mix(in_srgb,#00A651_5%,transparent)] transition-all group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,#00A651_10%,transparent)] flex items-center justify-center group-hover:bg-[color-mix(in_srgb,#00A651_20%,transparent)]">
                                    <QrCode className="w-5 h-5 text-brand-green" />
                                </div>
                                <span className="text-xs font-semibold text-(--text-secondary) text-center">Check-in QR</span>
                            </Link>
                            <Link
                                href="/dashboard/organizer/events"
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-(--border-default) hover:border-(--color-brand-orange) hover:bg-[color-mix(in_srgb,#F26600_5%,transparent)] transition-all group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,#F26600_10%,transparent)] flex items-center justify-center group-hover:bg-[color-mix(in_srgb,#F26600_20%,transparent)]">
                                    <Calendar className="w-5 h-5 text-(--color-brand-orange)" />
                                </div>
                                <span className="text-xs font-semibold text-(--text-secondary) text-center">Quản lý sự kiện</span>
                            </Link>
                            <Link
                                href="/dashboard/statistics"
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-(--border-default) hover:border-amber-400 hover:bg-amber-50 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100">
                                    <BarChart3 className="w-5 h-5 text-amber-500" />
                                </div>
                                <span className="text-xs font-semibold text-(--text-secondary) text-center">Xem thống kê</span>
                            </Link>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-2xl border border-(--border-default) shadow-card p-6">
                        <h2 className="text-base font-bold text-(--text-primary) mb-4">Hoạt động gần đây</h2>
                        <div className="space-y-3">
                            {recentActivity.map((activity, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-(--bg-muted)">
                                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                                        activity.type === 'registration' ? 'bg-blue-500' :
                                        activity.type === 'checkin' ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`} />
                                    <div>
                                        <p className="text-xs font-medium text-(--text-primary)">{activity.message}</p>
                                        <p className="text-xs text-(--text-muted) mt-0.5">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* My Events List */}
                <div className="bg-white rounded-2xl border border-(--border-default) shadow-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-(--border-light) flex items-center justify-between">
                        <h2 className="text-base font-bold text-(--text-primary)">Sự kiện của tôi</h2>
                        <Link
                            href="/dashboard/organizer/events"
                            className="text-sm font-semibold text-(--color-brand-navy) hover:text-(--color-brand-orange) transition-colors inline-flex items-center gap-1"
                        >
                            Xem tất cả <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {events.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-(--bg-muted) flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-(--text-muted)" />
                            </div>
                            <h3 className="text-lg font-bold text-(--text-primary) mb-2">Chưa có sự kiện nào</h3>
                            <p className="text-sm text-(--text-muted) mb-4">Bắt đầu tạo sự kiện đầu tiên của bạn</p>
                            <Link
                                href="/dashboard/events/create"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-brand-navy) text-white rounded-xl text-sm font-semibold shadow-brand hover:opacity-90 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Tạo sự kiện mới
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-(--border-light)">
                            {events.slice(0, 5).map((event) => (
                                <div
                                    key={event.id}
                                    className="px-6 py-4 flex items-center gap-4 hover:bg-(--bg-muted) transition-colors cursor-pointer"
                                    onClick={() => router.push(`/dashboard/organizer/events/${event.id}`)}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-(--color-brand-navy) to-[#1a5fc8] flex items-center justify-center shrink-0">
                                        <Calendar className="w-6 h-6 text-white/70" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-bold text-(--text-primary) truncate">{event.title}</h3>
                                            <EventStatusBadge status={event.status} />
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-(--text-muted)">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(parseISO(event.start_time as unknown as string), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {event.location}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-(--color-brand-navy)">{event.current_registrations || 0}/{event.capacity}</p>
                                        <p className="text-xs text-(--text-muted)">Đăng ký</p>
                                    </div>
                                    <Eye className="w-4 h-4 text-(--text-muted) shrink-0" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
