'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { eventService } from '@/services/eventService';
import { Event, Department } from '@/types';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckSquare,
    Calendar,
    MapPin,
    Clock,
    Users,
    ChevronDown,
    Search,
    ArrowUpDown,
    X,
    Check,
    AlertCircle,
    Building2,
    Tag,
    FileText,
    Square,
    CheckSquare as CheckSquareFilled,
    Trash2,
} from 'lucide-react';

function getApiErrorMessage(error: unknown, fallback: string): string {
    if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
            ?.message === 'string'
    ) {
        return (error as { response?: { data?: { error?: { message?: string } } } }).response!.data!
            .error!.message!;
    }
    return fallback;
}

interface RejectModalProps {
    event: Event;
    onClose: () => void;
    onConfirm: (reason: string | undefined) => void;
    processing: boolean;
}

function RejectModal({ event, onClose, onConfirm, processing }: RejectModalProps) {
    const [reason, setReason] = useState('');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-[3px] bg-gradient-to-r from-red-500 via-red-400 to-red-300" />
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Từ chối sự kiện</h3>
                            <p className="text-xs text-[var(--text-muted)]">Hành động này không thể hoàn tác</p>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-[var(--bg-muted)] rounded-xl">
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Sự kiện:</p>
                        <p className="text-sm text-[var(--text-secondary)] font-medium">{event.title}</p>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                            Lý do từ chối <span className="text-[var(--text-muted)] font-normal">(không bắt buộc)</span>
                        </label>
                        <textarea
                            className="w-full px-4 py-3 border-2 border-[var(--border-default)] rounded-xl resize-none focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-sm"
                            rows={3}
                            placeholder="VD: Thông tin sự kiện không chính xác, trùng lịch với sự kiện khác..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={processing}
                        />
                    </div>

                    <div className="flex gap-3 mt-5">
                        <button
                            onClick={onClose}
                            disabled={processing}
                            className="flex-1 px-4 py-2.5 border-2 border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-muted)] transition-all disabled:opacity-50 text-sm"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={() => onConfirm(reason.trim() || undefined)}
                            disabled={processing}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[var(--shadow-brand)] text-sm"
                        >
                            {processing ? (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : null}
                            Xác nhận từ chối
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

interface BulkRejectModalProps {
    count: number;
    onClose: () => void;
    onConfirm: (reason: string | undefined) => void;
    processing: boolean;
}

function BulkRejectModal({ count, onClose, onConfirm, processing }: BulkRejectModalProps) {
    const [reason, setReason] = useState('');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-[3px] bg-gradient-to-r from-red-500 via-red-400 to-red-300" />
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Từ chối nhiều sự kiện</h3>
                            <p className="text-xs text-[var(--text-muted)]">Hành động này không thể hoàn tác</p>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-[var(--bg-muted)] rounded-xl">
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Sẽ từ chối:</p>
                        <p className="text-sm text-[var(--text-secondary)] font-medium">{count} sự kiện</p>
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                            Lý do từ chối <span className="text-[var(--text-muted)] font-normal">(áp dụng cho tất cả)</span>
                        </label>
                        <textarea
                            className="w-full px-4 py-3 border-2 border-[var(--border-default)] rounded-xl resize-none focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-sm"
                            rows={3}
                            placeholder="VD: Thông tin sự kiện không chính xác, trùng lịch với sự kiện khác..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={processing}
                        />
                    </div>

                    <div className="flex gap-3 mt-5">
                        <button
                            onClick={onClose}
                            disabled={processing}
                            className="flex-1 px-4 py-2.5 border-2 border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-muted)] transition-all disabled:opacity-50 text-sm"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={() => onConfirm(reason.trim() || undefined)}
                            disabled={processing}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[var(--shadow-brand)] text-sm"
                        >
                            {processing ? (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : null}
                            Xác nhận từ chối ({count})
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                    <div className="h-[3px] bg-slate-200 animate-pulse" />
                    <div className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1 space-y-3">
                                <div className="h-6 bg-slate-100 rounded-lg animate-pulse w-3/4" />
                                <div className="flex flex-wrap gap-3">
                                    <div className="h-4 bg-slate-100 rounded animate-pulse w-32" />
                                    <div className="h-4 bg-slate-100 rounded animate-pulse w-40" />
                                    <div className="h-4 bg-slate-100 rounded animate-pulse w-28" />
                                </div>
                                <div className="h-3 bg-slate-100 rounded animate-pulse w-48" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-10 w-24 bg-slate-100 rounded-xl animate-pulse" />
                                <div className="h-10 w-20 bg-slate-100 rounded-xl animate-pulse" />
                                <div className="h-10 w-24 bg-slate-100 rounded-xl animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function PendingEventsPage() {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [rejectTarget, setRejectTarget] = useState<Event | null>(null);
    const [bulkRejectTarget, setBulkRejectTarget] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
    const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await eventService.getPending({ limit: 50 });
            setEvents(response.data.items || []);

            if (departments.length === 0) {
                const deptRes = await eventService.getDepartments();
                setDepartments(deptRes || []);
            }
        } catch {
            toast.error('Không thể tải danh sách sự kiện chờ duyệt');
        } finally {
            setLoading(false);
        }
    }, [departments.length]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async (event: Event) => {
        try {
            setProcessingId(event.id);
            await eventService.approveEvent(event.id);
            setEvents((prev) => prev.filter((item) => item.id !== event.id));
            setSelectedEvents((prev) => {
                const next = new Set(prev);
                next.delete(event.id);
                return next;
            });
            toast.success(`Đã duyệt: ${event.title}`);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Không thể duyệt sự kiện'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (event: Event) => {
        setRejectTarget(event);
    };

    const handleRejectConfirm = async (reason: string | undefined) => {
        if (!rejectTarget) return;
        try {
            setProcessingId(rejectTarget.id);
            await eventService.rejectEvent(rejectTarget.id, reason);
            setEvents((prev) => prev.filter((item) => item.id !== rejectTarget.id));
            setSelectedEvents((prev) => {
                const next = new Set(prev);
                next.delete(rejectTarget.id);
                return next;
            });
            toast.success(`Đã từ chối: ${rejectTarget.title}`);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Không thể từ chối sự kiện'));
        } finally {
            setProcessingId(null);
            setRejectTarget(null);
        }
    };

    const toggleEventSelection = (eventId: number) => {
        setSelectedEvents((prev) => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
            }
            return next;
        });
    };

    const selectAllOnPage = () => {
        setSelectedEvents(new Set(filteredAndSortedEvents.map((e) => e.id)));
    };

    const clearSelection = () => {
        setSelectedEvents(new Set());
    };

    const handleBulkApprove = async () => {
        if (selectedEvents.size === 0) return;

        setBulkProcessing(true);
        const ids = Array.from(selectedEvents);

        try {
            const results = await Promise.allSettled(
                ids.map((id) => eventService.approveEvent(id))
            );

            const successCount = results.filter((r) => r.status === 'fulfilled').length;
            const failedCount = results.filter((r) => r.status === 'rejected').length;

            if (successCount > 0) {
                setEvents((prev) => prev.filter((e) => !selectedEvents.has(e.id) || results[ids.indexOf(e.id)]?.status === 'rejected'));
                const successIds = ids.filter((_, i) => results[i].status === 'fulfilled');
                setSelectedEvents((prev) => {
                    const next = new Set(prev);
                    successIds.forEach((id) => next.delete(id));
                    return next;
                });
            }

            if (failedCount > 0) {
                toast.error(`Đã duyệt ${successCount}/${ids.length} sự kiện. ${failedCount} thất bại.`);
            } else {
                toast.success(`Đã duyệt ${successCount} sự kiện thành công`);
            }
        } catch {
            toast.error('Có lỗi xảy ra khi duyệt sự kiện');
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleBulkReject = () => {
        if (selectedEvents.size === 0) return;
        setBulkRejectTarget(Array.from(selectedEvents));
    };

    const handleBulkRejectConfirm = async (reason: string | undefined) => {
        if (bulkRejectTarget.length === 0) return;

        setBulkProcessing(true);
        const ids = bulkRejectTarget;

        try {
            const results = await Promise.allSettled(
                ids.map((id) => eventService.rejectEvent(id, reason))
            );

            const successCount = results.filter((r) => r.status === 'fulfilled').length;
            const failedCount = results.filter((r) => r.status === 'rejected').length;

            if (successCount > 0) {
                setEvents((prev) => prev.filter((e) => !bulkRejectTarget.includes(e.id) || results[bulkRejectTarget.indexOf(e.id)]?.status === 'rejected'));
                const successIds = ids.filter((_, i) => results[i].status === 'fulfilled');
                setSelectedEvents((prev) => {
                    const next = new Set(prev);
                    successIds.forEach((id) => next.delete(id));
                    return next;
                });
            }

            if (failedCount > 0) {
                toast.error(`Đã từ chối ${successCount}/${ids.length} sự kiện. ${failedCount} thất bại.`);
            } else {
                toast.success(`Đã từ chối ${successCount} sự kiện thành công`);
            }
        } catch {
            toast.error('Có lỗi xảy ra khi từ chối sự kiện');
        } finally {
            setBulkProcessing(false);
            setBulkRejectTarget([]);
        }
    };

    const filteredAndSortedEvents = useMemo(() => {
        let result = [...events];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter((e) => e.title.toLowerCase().includes(query));
        }

        if (selectedDepartment) {
            result = result.filter((e) => e.department_id === selectedDepartment);
        }

        result.sort((a, b) => {
            const dateA = parseISO(a.created_at).getTime();
            const dateB = parseISO(b.created_at).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [events, searchQuery, sortOrder, selectedDepartment]);

    const isAllSelectedOnPage = filteredAndSortedEvents.length > 0 &&
        filteredAndSortedEvents.every((e) => selectedEvents.has(e.id));

    return (
        <DashboardLayout>
            <div className="space-y-5 max-w-screen-2xl mx-auto">
                {/* PAGE HEADER */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[var(--color-brand-navy)] opacity-[0.03] pointer-events-none" />
                    <div className="px-6 pt-6 pb-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                                    <CheckSquare className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Admin</p>
                                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">Phê duyệt sự kiện</h1>
                                    <p className="text-sm text-[var(--text-muted)]">Rà soát và phê duyệt các sự kiện mới được tạo</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold">
                                    {events.length} sự kiện chờ duyệt
                                </span>
                                <Link
                                    href="/dashboard/events"
                                    className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-muted)] transition-all text-sm"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Danh sách sự kiện
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SEARCH & FILTER BAR */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="px-5 pt-4 pb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            {/* Search */}
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none z-10" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo tên sự kiện..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 h-11 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] transition-all shadow-[var(--shadow-xs)]"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Sort by date */}
                            <div className="relative shrink-0">
                                <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1">Sắp xếp</label>
                                <div className="relative">
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                        className="h-11 rounded-xl border-2 border-[var(--border-default)] bg-white pl-4 pr-10 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-navy)] transition-colors appearance-none cursor-pointer shadow-[var(--shadow-xs)] min-w-[160px]"
                                    >
                                        <option value="newest">Mới nhất trước</option>
                                        <option value="oldest">Cũ nhất trước</option>
                                    </select>
                                    <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" style={{ top: 'calc(50% + 6px)' }} />
                                </div>
                            </div>

                            {/* Filter by department */}
                            <div className="relative shrink-0">
                                <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1">Khoa</label>
                                <div className="relative">
                                    <select
                                        value={selectedDepartment || ''}
                                        onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : null)}
                                        className="h-11 rounded-xl border-2 border-[var(--border-default)] bg-white pl-4 pr-10 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-navy)] transition-colors appearance-none cursor-pointer shadow-[var(--shadow-xs)] min-w-[180px]"
                                    >
                                        <option value="">Tất cả khoa</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" style={{ top: 'calc(50% + 6px)' }} />
                                </div>
                            </div>
                        </div>

                        {/* Active filters */}
                        {(searchQuery || selectedDepartment) && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-light)] flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Đang lọc:</span>
                                {searchQuery && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700">
                                        &ldquo;{searchQuery}&rdquo;
                                        <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-blue-900">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                                {selectedDepartment && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-lg text-xs font-medium text-orange-700">
                                        {departments.find(d => d.id === selectedDepartment)?.name}
                                        <button onClick={() => setSelectedDepartment(null)} className="ml-1 hover:text-orange-900">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* RESULTS INFO */}
                {!loading && (
                    <div className="flex items-center justify-between px-1">
                        <p className="text-sm font-medium text-[var(--text-muted)]">
                            {filteredAndSortedEvents.length > 0 ? (
                                <>
                                    Hiển thị <span className="font-bold text-[var(--text-primary)]">{filteredAndSortedEvents.length}</span> sự kiện
                                    {events.length !== filteredAndSortedEvents.length && (
                                        <span className="text-[var(--text-muted)]"> / {events.length} tổng cộng</span>
                                    )}
                                </>
                            ) : (
                                <span>Không có sự kiện nào phù hợp</span>
                            )}
                        </p>
                    </div>
                )}

                {/* BULK ACTION TOOLBAR */}
                <AnimatePresence>
                    {selectedEvents.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -20, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--color-brand-navy)] bg-gradient-to-r from-[var(--color-brand-navy)] to-[#1a5fc8] p-4 shadow-lg">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
                                            <CheckSquare className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-lg">
                                                Đã chọn: {selectedEvents.size} sự kiện
                                            </p>
                                            <p className="text-white/70 text-xs">
                                                {selectedEvents.size === filteredAndSortedEvents.length
                                                    ? 'Tất cả sự kiện trên trang này đã được chọn'
                                                    : `Chọn ${filteredAndSortedEvents.length - selectedEvents.size} sự kiện còn lại`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                                        {!isAllSelectedOnPage && (
                                            <button
                                                onClick={selectAllOnPage}
                                                disabled={bulkProcessing}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                                            >
                                                <CheckSquareFilled className="w-3.5 h-3.5" />
                                                Chọn tất cả trên trang này
                                            </button>
                                        )}
                                        <button
                                            onClick={clearSelection}
                                            disabled={bulkProcessing}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Bỏ chọn tất cả
                                        </button>
                                        <button
                                            onClick={handleBulkApprove}
                                            disabled={bulkProcessing}
                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-md"
                                        >
                                            {bulkProcessing ? (
                                                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            ) : (
                                                <Check className="w-3.5 h-3.5" />
                                            )}
                                            Duyệt tất cả
                                        </button>
                                        <button
                                            onClick={handleBulkReject}
                                            disabled={bulkProcessing}
                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-500 hover:bg-red-400 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-md"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Từ chối tất cả
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* EVENTS LIST */}
                {loading ? (
                    <LoadingSkeleton />
                ) : filteredAndSortedEvents.length === 0 ? (
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-16 text-center shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center mx-auto mb-5 shadow-[var(--shadow-brand)]">
                            <CheckSquare className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                            {events.length === 0 ? 'Không có sự kiện chờ duyệt' : 'Không tìm thấy sự kiện nào'}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                            {events.length === 0
                                ? 'Tất cả sự kiện đã được xử lý. Quay lại sau khi có sự kiện mới được tạo.'
                                : 'Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác.'}
                        </p>
                        {(searchQuery || selectedDepartment) && (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedDepartment(null); }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-brand-navy)] text-white rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all"
                            >
                                <X className="w-4 h-4" />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredAndSortedEvents.map((event, idx) => (
                                <motion.div
                                    key={event.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                                    className={`bg-white rounded-2xl border-2 shadow-[var(--shadow-card)] overflow-hidden hover:shadow-[var(--shadow-card-hover)] transition-all ${
                                        selectedEvents.has(event.id)
                                            ? 'border-[var(--color-brand-navy)] ring-2 ring-[var(--color-brand-navy)]/20'
                                            : 'border-[var(--border-default)]'
                                    }`}
                                >
                                    {/* Gradient accent line */}
                                    <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />

                                    <div className="p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            {/* Selection checkbox + Event info */}
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <button
                                                    onClick={() => toggleEventSelection(event.id)}
                                                    disabled={processingId === event.id}
                                                    className={`mt-1 shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                        selectedEvents.has(event.id)
                                                            ? 'bg-[var(--color-brand-navy)] border-[var(--color-brand-navy)] text-white'
                                                            : 'bg-white border-[var(--border-default)] hover:border-[var(--color-brand-navy)]'
                                                    } disabled:opacity-50`}
                                                    aria-label={selectedEvents.has(event.id) ? 'Bỏ chọn sự kiện' : 'Chọn sự kiện'}
                                                >
                                                    {selectedEvents.has(event.id) && <Check className="w-4 h-4" />}
                                                    {!selectedEvents.has(event.id) && <Square className="w-4 h-4 text-transparent" />}
                                                </button>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h2 className="text-lg font-bold text-[var(--text-primary)] line-clamp-1">
                                                            {event.title}
                                                        </h2>
                                                        <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold shrink-0">
                                                            Chờ duyệt
                                                        </span>
                                                    </div>

                                                    {/* Meta info */}
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
                                                        {/* Category */}
                                                        {event.category && (
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                                                                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                                                                </div>
                                                                <span className="font-medium">{event.category.name}</span>
                                                            </span>
                                                        )}

                                                        {/* Department */}
                                                        {event.department && (
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                                                    <Building2 className="w-3.5 h-3.5 text-[var(--color-brand-navy)]" />
                                                                </div>
                                                                <span className="font-medium">{event.department.name}</span>
                                                            </span>
                                                        )}

                                                        {/* Date */}
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                                                <Calendar className="w-3.5 h-3.5 text-green-600" />
                                                            </div>
                                                            <span className="font-medium">
                                                                {format(parseISO(event.start_time), 'dd/MM/yyyy', { locale: vi })}
                                                            </span>
                                                        </span>

                                                        {/* Time */}
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                                                                <Clock className="w-3.5 h-3.5 text-[var(--color-brand-orange)]" />
                                                            </div>
                                                            <span className="font-medium">
                                                                {format(parseISO(event.start_time), 'HH:mm', { locale: vi })}
                                                            </span>
                                                        </span>

                                                        {/* Location */}
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                                                            </div>
                                                            <span className="font-medium truncate max-w-[200px]">{event.location}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 shrink-0 lg:flex-col lg:items-end lg:ml-4">
                                                <Link
                                                    href={`/dashboard/events/${event.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-all text-sm font-semibold"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Chi tiết
                                                </Link>

                                                <button
                                                    onClick={() => handleApprove(event)}
                                                    disabled={processingId === event.id}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-[var(--shadow-brand)]"
                                                >
                                                    {processingId === event.id ? (
                                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                    ) : (
                                                        <Check className="w-4 h-4" />
                                                    )}
                                                    Duyệt
                                                </button>

                                                <button
                                                    onClick={() => handleReject(event)}
                                                    disabled={processingId === event.id}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-[var(--shadow-brand)]"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Từ chối
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            <AnimatePresence>
                {rejectTarget && (
                    <RejectModal
                        event={rejectTarget}
                        onClose={() => setRejectTarget(null)}
                        onConfirm={handleRejectConfirm}
                        processing={processingId === rejectTarget.id}
                    />
                )}
            </AnimatePresence>

            {/* Bulk Reject Modal */}
            <AnimatePresence>
                {bulkRejectTarget.length > 0 && (
                    <BulkRejectModal
                        count={bulkRejectTarget.length}
                        onClose={() => setBulkRejectTarget([])}
                        onConfirm={handleBulkRejectConfirm}
                        processing={bulkProcessing}
                    />
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
