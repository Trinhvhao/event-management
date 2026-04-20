'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { MoreVertical, Eye, Edit, CheckCircle, Link as LinkIcon, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { eventService } from '@/services/eventService';
import { useAuthStore } from '@/store/authStore';
import type { Event, EventStatus } from '@/types';

// Brand-aligned status config
const STATUS_CONFIG: Record<EventStatus, { label: string; bgClass: string; textClass: string; dotClass: string }> = {
    pending:   { label: 'Chờ duyệt',    bgClass: 'bg-[color-mix(in_srgb,#FFB800_12%,transparent)]', textClass: 'text-[#92700c]', dotClass: 'bg-[#FFB800]' },
    approved:  { label: 'Đã duyệt',     bgClass: 'bg-[color-mix(in_srgb,#00358F_12%,transparent)]', textClass: 'text-[#00358F]', dotClass: 'bg-[#00358F]' },
    upcoming:  { label: 'Sắp diễn ra', bgClass: 'bg-[color-mix(in_srgb,#00358F_10%,transparent)]', textClass: 'text-[#00358F]', dotClass: 'bg-[#00358F]' },
    ongoing:   { label: 'Đang diễn ra', bgClass: 'bg-[color-mix(in_srgb,#00A651_12%,transparent)]', textClass: 'text-[#00A651]', dotClass: 'bg-[#00A651]' },
    completed: { label: 'Đã kết thúc', bgClass: 'bg-[var(--bg-muted)]',                         textClass: 'text-[var(--text-muted)]', dotClass: 'bg-[var(--text-muted)]' },
    cancelled: { label: 'Đã hủy',      bgClass: 'bg-[color-mix(in_srgb,#FF4000_12%,transparent)]', textClass: 'text-[#FF4000]', dotClass: 'bg-[#FF4000]' },
};

function StatusBadge({ status }: { status: EventStatus }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bgClass} ${cfg.textClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
            {cfg.label}
        </span>
    );
}

export default function RecentEventsTable() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [approvingId, setApprovingId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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

    // Close menu when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const normalizeCount = (value: unknown) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-[var(--color-brand-red)]';
        if (percentage >= 70) return 'bg-[#FFB800]';
        return 'bg-[var(--color-brand-green)]';
    };

    const handleApprove = async (eventId: number) => {
        try {
            setApprovingId(eventId);
            await eventService.approveEvent(eventId);
            toast.success('Đã phê duyệt sự kiện');
            setOpenMenuId(null);
            await loadEvents();
        } catch {
            toast.error('Không thể phê duyệt sự kiện');
        } finally {
            setApprovingId(null);
        }
    };

    const tableHeaderClass = 'px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]';

    return (
        <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--bg-muted)]/50 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                        <FileText className="w-4.5 h-4.5 text-[var(--color-brand-navy)]" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">Sự kiện gần đây</h3>
                        <p className="text-xs text-[var(--text-muted)]">{events.length} sự kiện được cập nhật</p>
                    </div>
                </div>
                <Link
                    href="/dashboard/events"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-[var(--color-brand-navy)] bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_14%,transparent)] transition-colors"
                >
                    Xem tất cả
                    <span className="text-[var(--color-brand-orange)]">→</span>
                </Link>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[var(--bg-muted)]">
                        <tr>
                            <th className={tableHeaderClass}>Tên sự kiện</th>
                            <th className={`${tableHeaderClass} hidden md:table-cell`}>Đơn vị</th>
                            <th className={tableHeaderClass}>Thời gian</th>
                            <th className={tableHeaderClass}>Đăng ký</th>
                            <th className={tableHeaderClass}>Trạng thái</th>
                            <th className={`${tableHeaderClass} text-right`}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)]">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center">
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-6 h-6 rounded-full border-2 border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                        <span className="text-sm text-[var(--text-muted)] font-medium">Đang tải dữ liệu sự kiện...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : events.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                            <Calendar className="w-6 h-6 text-[var(--text-muted)]" />
                                        </div>
                                        <p className="text-sm font-semibold text-[var(--text-secondary)]">Chưa có sự kiện nào</p>
                                        <p className="text-xs text-[var(--text-muted)]">Hãy tạo sự kiện đầu tiên.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            events.map((event) => {
                                const currentReg = normalizeCount(event.current_registrations ?? event._count?.registrations);
                                const capacity = normalizeCount(event.capacity);
                                const progress = capacity > 0 ? Math.min((currentReg / capacity) * 100, 100) : 0;

                                return (
                                    <tr key={event.id} className="hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors duration-150 group">
                                        {/* Event name */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
                                                    style={{ background: 'linear-gradient(135deg, var(--color-brand-navy), var(--color-brand-orange))' }}
                                                >
                                                    {event.title.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1 max-w-[160px]">
                                                    {event.title}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Organizer */}
                                        <td className="px-5 py-4 hidden md:table-cell">
                                            <span className="text-sm text-[var(--text-secondary)]">
                                                {event.organizer?.full_name || event.department?.name || '—'}
                                            </span>
                                        </td>

                                        {/* Time */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span>{formatDate(event.start_time)}</span>
                                            </div>
                                        </td>

                                        {/* Registration progress */}
                                        <td className="px-5 py-4">
                                            <div className="space-y-1.5 min-w-[100px]">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-[var(--text-secondary)]">{currentReg}/{capacity}</span>
                                                    <span className="text-[var(--text-muted)]">{progress.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-4">
                                            <StatusBadge status={event.status} />
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-4 text-right">
                                            <div className="relative" ref={menuRef}>
                                                <button
                                                    onClick={() => setOpenMenuId((prev) => prev === event.id ? null : event.id)}
                                                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                                                    aria-label="Mở menu thao tác"
                                                >
                                                    <MoreVertical className="w-4.5 h-4.5" />
                                                </button>

                                                {openMenuId === event.id && (
                                                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-[var(--shadow-xl)] border border-[var(--border-default)] z-20 py-1 overflow-hidden">
                                                        <Link
                                                            href={`/dashboard/events/${event.id}`}
                                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
                                                            onClick={() => setOpenMenuId(null)}
                                                        >
                                                            <Eye className="w-4 h-4 text-[var(--color-brand-navy)]" />
                                                            Xem chi tiết
                                                        </Link>
                                                        <Link
                                                            href={`/dashboard/events/${event.id}/edit`}
                                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
                                                            onClick={() => setOpenMenuId(null)}
                                                        >
                                                            <Edit className="w-4 h-4 text-[var(--color-brand-orange)]" />
                                                            Chỉnh sửa
                                                        </Link>
                                                        {event.status === 'pending' && user?.role === 'admin' && (
                                                            <button
                                                                onClick={() => handleApprove(event.id)}
                                                                disabled={approvingId === event.id}
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-brand-green)] hover:bg-[color-mix(in_srgb,var(--color-brand-green)_8%,transparent)] transition-colors disabled:opacity-60"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                                {approvingId === event.id ? 'Đang phê duyệt...' : 'Phê duyệt'}
                                                            </button>
                                                        )}
                                                        <div className="border-t border-[var(--border-light)] my-1" />
                                                        <Link
                                                            href={`/dashboard/checkin?eventId=${event.id}`}
                                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
                                                            onClick={() => setOpenMenuId(null)}
                                                        >
                                                            <LinkIcon className="w-4 h-4 text-[var(--color-brand-navy)]" />
                                                            Đi đến check-in
                                                        </Link>
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
