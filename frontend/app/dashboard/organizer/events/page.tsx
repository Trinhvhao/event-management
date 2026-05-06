'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { eventService } from '@/services/eventService';
import { Event } from '@/types';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Search,
    Plus,
    Filter,
    ChevronDown,
    Clock,
    MapPin,
    Users,
    Award,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    X,
    QrCode,
    Loader2,
    LayoutGrid,
    List,
    Ticket,
    BarChart3,
    CheckCircle,
    XCircle,
    AlertCircle,
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'pending' | 'approved' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<StatusFilter, { label: string; color: string; bg: string; border: string }> = {
    all: { label: 'Tất cả', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
    pending: { label: 'Chờ duyệt', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    approved: { label: 'Đã duyệt', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
    upcoming: { label: 'Sắp diễn ra', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    ongoing: { label: 'Đang diễn ra', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    completed: { label: 'Đã kết thúc', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
    cancelled: { label: 'Đã hủy', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status as StatusFilter] || STATUS_CONFIG.all;
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.color} ${config.border}`}>
            {config.label}
        </span>
    );
}

function getRegPercent(event: Event) {
    if (!event.capacity) return 0;
    return Math.min(Math.round(((event.current_registrations || 0) / event.capacity) * 100), 100);
}

export default function OrganizerEventsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isHydrated } = useAuthStore();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [showFilters, setShowFilters] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const loadEvents = useCallback(async () => {
        try {
            setLoading(true);
            const myEvents = await eventService.getMyEvents();
            const eventList: Event[] = Array.isArray(myEvents) ? myEvents : [];
            setEvents(eventList);
        } catch (error) {
            console.error('Error loading events:', error);
            toast.error('Không thể tải danh sách sự kiện');
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
        void loadEvents();
    }, [isHydrated, isAuthenticated, user?.role, router, loadEvents]);

    const filteredEvents = events.filter(event => {
        // Search filter
        if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        // Status filter
        if (statusFilter !== 'all' && event.status !== statusFilter) {
            return false;
        }
        return true;
    });

    const sortedEvents = [...filteredEvents].sort((a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

    const statusCounts = events.reduce((acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-6">
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-navy)]" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Quản lý sự kiện</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Quản lý và theo dõi tất cả sự kiện của bạn
                        </p>
                    </div>
                    <Link
                        href="/dashboard/events/create"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-brand-navy)] text-white rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Tạo sự kiện mới
                    </Link>
                </div>

                {/* Stats Bar */}
                <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-xs)] mb-6 overflow-x-auto">
                    {(Object.keys(STATUS_CONFIG) as StatusFilter[]).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                                statusFilter === status
                                    ? 'bg-[var(--color-brand-navy)] text-white shadow-sm'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }`}
                        >
                            {STATUS_CONFIG[status].label}
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                                statusFilter === status ? 'bg-white/20' : 'bg-[var(--bg-muted)]'
                            }`}>
                                {status === 'all' ? events.length : (statusCounts[status] || 0)}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search & View Toggle */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm sự kiện..."
                            className="w-full h-11 pl-10 pr-4 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-navy)] transition-colors"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                            showFilters
                                ? 'bg-[var(--color-brand-navy)] text-white border-[var(--color-brand-navy)]'
                                : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] bg-white'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        Bộ lọc
                    </button>
                    <div className="flex items-center border-2 border-[var(--border-default)] rounded-xl overflow-hidden">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-[var(--color-brand-navy)] text-white' : 'bg-white text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-[var(--color-brand-navy)] text-white' : 'bg-white text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Results Count */}
                <p className="text-sm font-medium text-[var(--text-muted)] mb-4">
                    Hiển thị <span className="font-bold text-[var(--text-primary)]">{sortedEvents.length}</span> sự kiện
                </p>

                {/* Events List */}
                {sortedEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center mx-auto mb-5">
                            <Calendar className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                            {searchQuery ? 'Không tìm thấy sự kiện nào' : 'Chưa có sự kiện nào'}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                            {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Bắt đầu tạo sự kiện đầu tiên của bạn'}
                        </p>
                        {!searchQuery && (
                            <Link
                                href="/dashboard/events/create"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-brand-navy)] text-white rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Tạo sự kiện mới
                            </Link>
                        )}
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[var(--bg-muted)]">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Sự kiện</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Ngày</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Địa điểm</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Phí</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Đăng ký</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Trạng thái</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-light)]">
                                    {sortedEvents.map((event) => (
                                        <tr key={event.id} className="hover:bg-[var(--bg-muted)] transition-colors">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shrink-0">
                                                        <Calendar className="w-5 h-5 text-white/60" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">{event.title}</p>
                                                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                                            <Award className="w-3 h-3" />+{event.training_points} ĐRL
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <p className="text-xs font-medium text-[var(--text-secondary)]">
                                                    {format(parseISO(event.start_time as unknown as string), 'dd/MM/yyyy', { locale: vi })}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {format(parseISO(event.start_time as unknown as string), 'HH:mm', { locale: vi })} - {format(parseISO(event.end_time as unknown as string), 'HH:mm', { locale: vi })}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <p className="text-xs font-medium text-[var(--text-secondary)] line-clamp-1 max-w-[150px]">{event.location}</p>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {Number(event.event_cost) > 0 ? (
                                                    <span className="text-xs font-bold text-[var(--color-brand-orange)]">
                                                        {new Intl.NumberFormat('vi-VN').format(Number(event.event_cost))}đ
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-emerald-600">Miễn phí</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                getRegPercent(event) >= 90 ? 'bg-red-500' :
                                                                getRegPercent(event) >= 70 ? 'bg-orange-400' :
                                                                'bg-[var(--color-brand-navy)]'
                                                            }`}
                                                            style={{ width: `${getRegPercent(event)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">
                                                        {event.current_registrations || 0}/{event.capacity}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <StatusBadge status={event.status} />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/dashboard/events/${event.id}`}
                                                        className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye className="w-4 h-4 text-[var(--text-muted)]" />
                                                    </Link>
                                                    <Link
                                                        href={`/dashboard/checkin?event=${event.id}`}
                                                        className="p-2 rounded-lg hover:bg-emerald-50 transition-colors"
                                                        title="Check-in"
                                                    >
                                                        <QrCode className="w-4 h-4 text-emerald-600" />
                                                    </Link>
                                                    {event.status !== 'completed' && event.status !== 'cancelled' && (
                                                        <Link
                                                            href={`/dashboard/events/${event.id}/edit`}
                                                            className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Edit className="w-4 h-4 text-blue-600" />
                                                        </Link>
                                                    )}
                                                    <Link
                                                        href={`/dashboard/organizer/events/${event.id}/team`}
                                                        className="p-2 rounded-lg hover:bg-purple-50 transition-colors"
                                                        title="Quản lý Team"
                                                    >
                                                        <Users className="w-4 h-4 text-purple-600" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {sortedEvents.map((event, idx) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden hover:shadow-[var(--shadow-card-hover)] transition-all"
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <StatusBadge status={event.status} />
                                        <div className="flex items-center gap-1">
                                            <Link
                                                href={`/dashboard/checkin?event=${event.id}`}
                                                className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                                                title="Check-in"
                                            >
                                                <QrCode className="w-4 h-4 text-emerald-600" />
                                            </Link>
                                            <Link
                                                href={`/dashboard/events/${event.id}/edit`}
                                                className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                                title="Chỉnh sửa"
                                            >
                                                <Edit className="w-4 h-4 text-blue-600" />
                                            </Link>
                                        </div>
                                    </div>
                                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-3 line-clamp-2">{event.title}</h3>
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                            {format(parseISO(event.start_time as unknown as string), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                            <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                            {event.location}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                            <Award className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                            +{event.training_points} ĐRL
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border-light)]">
                                        <div>
                                            {Number(event.event_cost) > 0 ? (
                                                <span className="text-sm font-bold text-[var(--color-brand-orange)]">
                                                    {new Intl.NumberFormat('vi-VN').format(Number(event.event_cost))}đ
                                                </span>
                                            ) : (
                                                <span className="text-sm font-bold text-emerald-600">Miễn phí</span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-[var(--text-primary)]">{event.current_registrations || 0}/{event.capacity}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">Đăng ký</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
