'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { registrationService } from '@/services/registrationService';
import { Registration } from '@/types';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Calendar,
    MapPin,
    Clock,
    Search,
    ArrowUpDown,
    X,
    Check,
    AlertCircle,
    Building2,
    FileText,
    Square,
    CheckSquare as CheckSquareFilled,
    UserCheck,
    UserX,
    Filter,
    ChevronDown,
    User,
    GraduationCap,
    MessageSquare,
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
    registration: Registration;
    onClose: () => void;
    onConfirm: (reason: string | undefined) => void;
    processing: boolean;
}

function RejectModal({ registration, onClose, onConfirm, processing }: RejectModalProps) {
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
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Từ chối đăng ký</h3>
                            <p className="text-xs text-[var(--text-muted)]">Hành động này không thể hoàn tác</p>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-[var(--bg-muted)] rounded-xl">
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Sinh viên:</p>
                        <p className="text-sm text-[var(--text-secondary)] font-medium">
                            {registration.user?.full_name || 'N/A'}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            {registration.user?.student_id || registration.user?.email}
                        </p>
                        <p className="text-sm text-[var(--text-primary)] mt-2 font-semibold">Sự kiện:</p>
                        <p className="text-sm text-[var(--text-secondary)] font-medium">
                            {registration.event?.title}
                        </p>
                    </div>

                    {registration.reason && (
                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Lý do đăng ký</p>
                            <p className="text-sm text-[var(--text-primary)]">{registration.reason}</p>
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                            Lý do từ chối <span className="text-[var(--text-muted)] font-normal">(không bắt buộc)</span>
                        </label>
                        <textarea
                            className="w-full px-4 py-3 border-2 border-[var(--border-default)] rounded-xl resize-none focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-sm"
                            rows={3}
                            placeholder="VD: Lý do đăng ký không phù hợp, thông tin không đầy đủ..."
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

interface DetailModalProps {
    registration: Registration;
    onClose: () => void;
    onApprove: () => void;
    onReject: () => void;
    processing: boolean;
}

function DetailModal({ registration, onClose, onApprove, onReject, processing }: DetailModalProps) {
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
                className="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Chi tiết đăng ký</h3>
                            <p className="text-xs text-[var(--text-muted)]">
                                Mã đăng ký: #{registration.id}
                            </p>
                        </div>
                    </div>

                    {/* Student Info */}
                    <div className="p-4 bg-[var(--bg-muted)] rounded-xl mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Thông tin sinh viên</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <User className="w-4 h-4 text-[var(--text-muted)]" />
                                <span className="text-sm font-medium">{registration.user?.full_name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <GraduationCap className="w-4 h-4 text-[var(--text-muted)]" />
                                <span className="text-sm">{registration.user?.student_id || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                                <span className="text-sm">{registration.user?.department?.name || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Event Info */}
                    <div className="p-4 bg-[var(--bg-muted)] rounded-xl mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Thông tin sự kiện</p>
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{registration.event?.title}</p>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                                <span className="text-sm">
                                    {registration.event?.start_time
                                        ? format(parseISO(registration.event.start_time), 'dd/MM/yyyy HH:mm', { locale: vi })
                                        : 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                                <span className="text-sm">{registration.event?.location}</span>
                            </div>
                        </div>
                    </div>

                    {/* Registration Reason */}
                    {registration.reason && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-amber-600" />
                                <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Lý do đăng ký</p>
                            </div>
                            <p className="text-sm text-[var(--text-primary)]">{registration.reason}</p>
                        </div>
                    )}

                    {/* Registration Time */}
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-4">
                        <Clock className="w-4 h-4" />
                        <span>Đăng ký lúc: {format(parseISO(registration.registered_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</span>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            disabled={processing}
                            className="flex-1 px-4 py-2.5 border-2 border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-muted)] transition-all disabled:opacity-50 text-sm"
                        >
                            Đóng
                        </button>
                        <button
                            onClick={onReject}
                            disabled={processing}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[var(--shadow-brand)] text-sm"
                        >
                            <UserX className="w-4 h-4" />
                            Từ chối
                        </button>
                        <button
                            onClick={onApprove}
                            disabled={processing}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[var(--shadow-brand)] text-sm"
                        >
                            {processing ? (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <UserCheck className="w-4 h-4" />
                            )}
                            Duyệt
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
                                </div>
                                <div className="h-4 bg-slate-100 rounded animate-pulse w-48" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-10 w-24 bg-slate-100 rounded-xl animate-pulse" />
                                <div className="h-10 w-20 bg-slate-100 rounded-xl animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function PendingRegistrationsPage() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [rejectTarget, setRejectTarget] = useState<Registration | null>(null);
    const [detailTarget, setDetailTarget] = useState<Registration | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [selectedRegs, setSelectedRegs] = useState<Set<number>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [filterEvent, setFilterEvent] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const pending = await registrationService.getPendingRegistrations();
            setRegistrations(pending);
        } catch {
            toast.error('Không thể tải danh sách đăng ký chờ duyệt');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async (registration: Registration) => {
        try {
            setProcessingId(registration.id);
            await registrationService.approveRegistration(registration.id);
            setRegistrations((prev) => prev.filter((r) => r.id !== registration.id));
            setSelectedRegs((prev) => {
                const next = new Set(prev);
                next.delete(registration.id);
                return next;
            });
            toast.success(`Đã duyệt đăng ký của ${registration.user?.full_name}`);
            setDetailTarget(null);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Không thể duyệt đăng ký'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (registration: Registration, note?: string) => {
        try {
            setProcessingId(registration.id);
            await registrationService.rejectRegistration(registration.id, note);
            setRegistrations((prev) => prev.filter((r) => r.id !== registration.id));
            setSelectedRegs((prev) => {
                const next = new Set(prev);
                next.delete(registration.id);
                return next;
            });
            toast.success(`Đã từ chối đăng ký của ${registration.user?.full_name}`);
            setRejectTarget(null);
            setDetailTarget(null);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Không thể từ chối đăng ký'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedRegs.size === 0) return;

        setBulkProcessing(true);
        const ids = Array.from(selectedRegs);

        try {
            const results = await registrationService.bulkApproveRegistrations(ids);

            const successCount = results.filter((r) => r.success).length;
            const failedResults = results.filter((r) => !r.success);

            setRegistrations((prev) =>
                prev.filter((r) => {
                    if (!selectedRegs.has(r.id)) return true;
                    const result = failedResults.find((f) => f.registrationId === r.id);
                    return !!result;
                })
            );
            setSelectedRegs(new Set());

            if (failedResults.length > 0) {
                toast.error(`Đã duyệt ${successCount}/${ids.length} đăng ký. ${failedResults.length} thất bại.`);
            } else {
                toast.success(`Đã duyệt ${successCount} đăng ký thành công`);
            }
        } catch {
            toast.error('Có lỗi xảy ra khi duyệt đăng ký');
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleBulkReject = async () => {
        if (selectedRegs.size === 0) return;

        setBulkProcessing(true);
        const ids = Array.from(selectedRegs);

        try {
            const results = await registrationService.bulkRejectRegistrations(ids);

            const successCount = results.filter((r) => r.success).length;
            const failedResults = results.filter((r) => !r.success);

            setRegistrations((prev) =>
                prev.filter((r) => {
                    if (!selectedRegs.has(r.id)) return true;
                    const result = failedResults.find((f) => f.registrationId === r.id);
                    return !!result;
                })
            );
            setSelectedRegs(new Set());

            if (failedResults.length > 0) {
                toast.error(`Đã từ chối ${successCount}/${ids.length} đăng ký. ${failedResults.length} thất bại.`);
            } else {
                toast.success(`Đã từ chối ${successCount} đăng ký thành công`);
            }
        } catch {
            toast.error('Có lỗi xảy ra khi từ chối đăng ký');
        } finally {
            setBulkProcessing(false);
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedRegs((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        setSelectedRegs(new Set(filteredRegs.map((r) => r.id)));
    };

    const clearSelection = () => {
        setSelectedRegs(new Set());
    };

    // Get unique events for filter dropdown
    const uniqueEvents = useMemo(() => {
        const events = registrations.map((r) => r.event).filter(Boolean);
        const unique = new Map();
        events.forEach((e) => {
            if (e && !unique.has(e.id)) unique.set(e.id, e);
        });
        return Array.from(unique.values());
    }, [registrations]);

    const filteredRegs = useMemo(() => {
        let result = [...registrations];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(
                (r) =>
                    r.user?.full_name?.toLowerCase().includes(query) ||
                    r.user?.student_id?.toLowerCase().includes(query) ||
                    r.event?.title?.toLowerCase().includes(query)
            );
        }

        if (filterEvent) {
            result = result.filter((r) => r.event_id === filterEvent);
        }

        result.sort((a, b) => {
            const dateA = parseISO(a.registered_at).getTime();
            const dateB = parseISO(b.registered_at).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [registrations, searchQuery, sortOrder, filterEvent]);

    const isAllSelected = filteredRegs.length > 0 && filteredRegs.every((r) => selectedRegs.has(r.id));

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
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Organizer</p>
                                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                                        Phê duyệt đăng ký
                                    </h1>
                                    <p className="text-sm text-[var(--text-muted)]">
                                        Duyệt hoặc từ chối đăng ký của sinh viên
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold">
                                    {registrations.length} đăng ký chờ duyệt
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
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none z-10" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo tên sinh viên, mã SV, tên sự kiện..."
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

                            <div className="relative shrink-0">
                                <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1">Sự kiện</label>
                                <div className="relative">
                                    <select
                                        value={filterEvent || ''}
                                        onChange={(e) => setFilterEvent(e.target.value ? Number(e.target.value) : null)}
                                        className="h-11 rounded-xl border-2 border-[var(--border-default)] bg-white pl-4 pr-10 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-navy)] transition-colors appearance-none cursor-pointer shadow-[var(--shadow-xs)] min-w-[200px]"
                                    >
                                        <option value="">Tất cả sự kiện</option>
                                        {uniqueEvents.map((e) => (
                                            <option key={e!.id} value={e!.id}>{e!.title}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" style={{ top: 'calc(50% + 6px)' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BULK ACTION TOOLBAR */}
                <AnimatePresence>
                    {selectedRegs.size > 0 && (
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
                                            <CheckSquareFilled className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-lg">
                                                Đã chọn: {selectedRegs.size} đăng ký
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                                        {!isAllSelected && (
                                            <button
                                                onClick={selectAll}
                                                disabled={bulkProcessing}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                                            >
                                                <CheckSquareFilled className="w-3.5 h-3.5" />
                                                Chọn tất cả
                                            </button>
                                        )}
                                        <button
                                            onClick={clearSelection}
                                            disabled={bulkProcessing}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Bỏ chọn
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
                                            <X className="w-3.5 h-3.5" />
                                            Từ chối tất cả
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* REGISTRATIONS LIST */}
                {loading ? (
                    <LoadingSkeleton />
                ) : filteredRegs.length === 0 ? (
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-16 text-center shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-[var(--shadow-brand)]">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                            {registrations.length === 0 ? 'Không có đăng ký chờ duyệt' : 'Không tìm thấy đăng ký nào'}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                            {registrations.length === 0
                                ? 'Tất cả đăng ký đã được xử lý.'
                                : 'Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredRegs.map((registration, idx) => (
                                <motion.div
                                    key={registration.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                                    className={`bg-white rounded-2xl border-2 shadow-[var(--shadow-card)] overflow-hidden hover:shadow-[var(--shadow-card-hover)] transition-all ${
                                        selectedRegs.has(registration.id)
                                            ? 'border-[var(--color-brand-navy)] ring-2 ring-[var(--color-brand-navy)]/20'
                                            : 'border-[var(--border-default)]'
                                    }`}
                                >
                                    <div className="h-[3px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />

                                    <div className="p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <button
                                                    onClick={() => toggleSelection(registration.id)}
                                                    disabled={processingId === registration.id}
                                                    className={`mt-1 shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                        selectedRegs.has(registration.id)
                                                            ? 'bg-[var(--color-brand-navy)] border-[var(--color-brand-navy)] text-white'
                                                            : 'bg-white border-[var(--border-default)] hover:border-[var(--color-brand-navy)]'
                                                    } disabled:opacity-50`}
                                                >
                                                    {selectedRegs.has(registration.id) && <Check className="w-4 h-4" />}
                                                    {!selectedRegs.has(registration.id) && <Square className="w-4 h-4 text-transparent" />}
                                                </button>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h2 className="text-lg font-bold text-[var(--text-primary)] line-clamp-1">
                                                            {registration.user?.full_name || 'N/A'}
                                                        </h2>
                                                        <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-full shrink-0">
                                                            {registration.user?.student_id || 'N/A'}
                                                        </span>
                                                        {registration.reason && (
                                                            <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-full shrink-0 flex items-center gap-1">
                                                                <MessageSquare className="w-3 h-3" />
                                                                Có lý do
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                                            <span className="font-medium">{registration.user?.department?.name || 'N/A'}</span>
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {registration.event?.start_time
                                                                ? format(parseISO(registration.event.start_time), 'dd/MM/yyyy', { locale: vi })
                                                                : 'N/A'}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {format(parseISO(registration.registered_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 text-sm">
                                                        <p className="text-[var(--text-primary)] font-medium">
                                                            Sự kiện: <span className="font-semibold">{registration.event?.title}</span>
                                                        </p>
                                                    </div>

                                                    {registration.reason && (
                                                        <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                                            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Lý do đăng ký</p>
                                                            <p className="text-xs text-[var(--text-primary)]">{registration.reason}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 lg:flex-col lg:items-end lg:ml-4">
                                                <button
                                                    onClick={() => setDetailTarget(registration)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-all text-sm font-semibold"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Chi tiết
                                                </button>

                                                <button
                                                    onClick={() => handleApprove(registration)}
                                                    disabled={processingId === registration.id}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-[var(--shadow-brand)]"
                                                >
                                                    {processingId === registration.id ? (
                                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                    ) : (
                                                        <UserCheck className="w-4 h-4" />
                                                    )}
                                                    Duyệt
                                                </button>

                                                <button
                                                    onClick={() => setRejectTarget(registration)}
                                                    disabled={processingId === registration.id}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-[var(--shadow-brand)]"
                                                >
                                                    <UserX className="w-4 h-4" />
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

            {/* Detail Modal */}
            <AnimatePresence>
                {detailTarget && (
                    <DetailModal
                        registration={detailTarget}
                        onClose={() => setDetailTarget(null)}
                        onApprove={() => handleApprove(detailTarget)}
                        onReject={() => {
                            setRejectTarget(detailTarget);
                            setDetailTarget(null);
                        }}
                        processing={processingId === detailTarget.id}
                    />
                )}
            </AnimatePresence>

            {/* Reject Modal */}
            <AnimatePresence>
                {rejectTarget && (
                    <RejectModal
                        registration={rejectTarget}
                        onClose={() => setRejectTarget(null)}
                        onConfirm={(reason) => handleReject(rejectTarget, reason)}
                        processing={processingId === rejectTarget.id}
                    />
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
