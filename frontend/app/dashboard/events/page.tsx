'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { eventService } from '@/services/eventService';
import { Event, Category, Department } from '@/types';
import { format, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, MapPin, Users, Award, Search, X, ChevronLeft,
    ChevronRight, ArrowUpDown, SlidersHorizontal, Clock, Plus, ChevronDown, RotateCcw,
    LayoutGrid, List, Kanban, Tag, Building2, Ticket
} from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 20;

interface EventQueryParams {
    status?: string;
    limit?: number;
    search?: string;
    category_id?: number;
    department_id?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: string;
    is_free?: boolean;
}

type ViewMode = 'grid' | 'list' | 'kanban';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }
    return fallback;
};

const STATUS_OPTIONS = [
    { value: 'upcoming', label: 'Sắp diễn ra' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'ongoing', label: 'Đang diễn ra' },
    { value: 'completed', label: 'Đã kết thúc' },
    { value: '', label: 'Tất cả' },
];

const PRICE_OPTIONS = [
    { value: undefined, label: 'Tất cả' },
    { value: true, label: 'Miễn phí' },
    { value: false, label: 'Có phí' },
];

const SORT_OPTIONS = [
    { value: 'start_time|asc', label: 'Ngày bắt đầu ↑' },
    { value: 'start_time|desc', label: 'Ngày bắt đầu ↓' },
    { value: 'title|asc', label: 'Tên A → Z' },
    { value: 'title|desc', label: 'Tên Z → A' },
    { value: 'current_registrations|desc', label: 'Lượt đăng ký ↓' },
    { value: 'event_cost|asc', label: 'Giá ↑' },
    { value: 'event_cost|desc', label: 'Giá ↓' },
];

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Chờ duyệt' },
    approved: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-700', label: 'Đã duyệt' },
    upcoming: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Sắp diễn ra' },
    ongoing: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Đang diễn ra' },
    completed: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-600', label: 'Đã kết thúc' },
    cancelled: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'Đã hủy' },
};

const KANBAN_COLUMNS = [
    { key: 'upcoming', label: 'Sắp diễn ra', color: 'border-blue-400', badge: STATUS_BADGES.upcoming },
    { key: 'ongoing', label: 'Đang diễn ra', color: 'border-emerald-400', badge: STATUS_BADGES.ongoing },
    { key: 'completed', label: 'Đã kết thúc', color: 'border-slate-400', badge: STATUS_BADGES.completed },
    { key: 'cancelled', label: 'Đã hủy', color: 'border-red-400', badge: STATUS_BADGES.cancelled },
];

function getStatusBadge(status: string) {
    const badge = STATUS_BADGES[status] || STATUS_BADGES.upcoming;
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text}`}>
            {badge.label}
        </span>
    );
}

function getRegPercent(event: Event) {
    if (!event.capacity) return 0;
    return Math.min(Math.round(((event.current_registrations || 0) / event.capacity) * 100), 100);
}

function formatEventDuration(start: string, end: string) {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const hours = differenceInHours(endDate, startDate);
    const minutes = differenceInMinutes(endDate, startDate) % 60;

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days} ngày`;
    }
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}p`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}p`;
}

function getTimeUntilEvent(start: string) {
    const now = new Date();
    const startDate = parseISO(start);
    const diffMs = startDate.getTime() - now.getTime();
    if (diffMs < 0) return null;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `Còn ${days} ngày ${hours}h`;
    if (hours > 0) return `Còn ${hours} giờ`;
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Còn ${mins} phút`;
}

export default function EventsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isHydrated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState('upcoming');
    const [selectedPrice, setSelectedPrice] = useState<boolean | undefined>(undefined);
    const [sortBy, setSortBy] = useState('start_time|desc');
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    const fetchData = useCallback(async (resetPage = true) => {
        if (resetPage) setPage(1);
        try {
            setLoading(true);
            const [sortField, sortDir] = sortBy.split('|');

            const params: EventQueryParams = {
                status: selectedStatus || undefined,
                limit: PAGE_SIZE,
                page: resetPage ? 1 : page,
                is_free: selectedPrice,
            };

            if (searchQuery) params.search = searchQuery;
            if (selectedCategory) params.category_id = selectedCategory;
            if (selectedDepartment) params.department_id = selectedDepartment;
            if (sortField) params.sortBy = sortField;
            if (sortDir) params.sortOrder = sortDir;

            const eventsRes = await eventService.getAll(params);
            // Handle different response shapes from backend
            const resData = (eventsRes as any);
            let items: Event[] = [];
            let total = 0;
            let currentPage = resetPage ? 1 : page;
            let pageSize = PAGE_SIZE;
            let totalPages = 1;

            if (resData.data?.items) {
                // Standard paginated response: { success, data: { items, pagination } }
                items = resData.data.items || [];
                total = resData.data.pagination?.total ?? items.length;
                currentPage = resData.data.pagination?.page ?? currentPage;
                pageSize = resData.data.pagination?.pageSize ?? pageSize;
                totalPages = resData.data.pagination?.totalPages ?? 1;
            } else if (resData.items) {
                // Alternative: { success, items, pagination }
                items = resData.items || [];
                total = resData.pagination?.total ?? items.length;
                currentPage = resData.pagination?.page ?? currentPage;
                pageSize = resData.pagination?.pageSize ?? pageSize;
                totalPages = resData.pagination?.totalPages ?? 1;
            } else if (Array.isArray(resData)) {
                // Raw array response
                items = resData;
                total = resData.length;
            } else {
                items = [];
            }

            setEvents(items);
            setTotalItems(total);
            setTotalPages(totalPages);
            setPage(currentPage);

            if (categories.length === 0) {
                const catRes = await eventService.getCategories();
                setCategories(catRes || []);
            }
            if (departments.length === 0) {
                const deptRes = await eventService.getDepartments();
                setDepartments(deptRes || []);
            }
        } catch (error: unknown) {
            console.error('Error fetching events:', error);
            toast.error(getErrorMessage(error, 'Không thể tải danh sách sự kiện'));
        } finally {
            setLoading(false);
        }
    }, [selectedStatus, searchQuery, selectedCategory, selectedDepartment, sortBy, page, categories.length, departments.length]);

    useEffect(() => {
        if (!isHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
    }, [isAuthenticated, isHydrated, router]);

    useEffect(() => {
        if (isHydrated && isAuthenticated) {
            fetchData(true);
        }
    }, [isAuthenticated, isHydrated, selectedStatus, selectedPrice, selectedCategory, selectedDepartment, sortBy, fetchData]);

    useEffect(() => {
        if (!isHydrated || !isAuthenticated) return;
        const timer = setTimeout(() => {
            // Only fetch if searchQuery actually changed (not on mount)
            fetchData(true);
        }, 400);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, isHydrated, isAuthenticated]);

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory(null);
        setSelectedDepartment(null);
        setSelectedStatus('upcoming');
        setSelectedPrice(undefined);
        setSortBy('start_time|desc');
    };

    const hasFilters = useMemo(() =>
        searchQuery || selectedCategory || selectedDepartment || selectedStatus !== 'upcoming' || selectedPrice !== undefined || sortBy !== 'start_time|desc',
        [searchQuery, selectedCategory, selectedDepartment, selectedStatus, selectedPrice, sortBy]
    );

    const kanbanGroups = useMemo(() => {
        const groups: Record<string, Event[]> = {
            upcoming: [],
            ongoing: [],
            completed: [],
            cancelled: [],
        };
        events.forEach((event) => {
            const status = event.status === 'approved' ? 'upcoming' : event.status;
            if (groups[status]) {
                groups[status].push(event);
            }
        });
        return groups;
    }, [events]);

    if (!isHydrated) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="w-12 h-12 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-5 max-w-screen-2xl mx-auto">

                {/* ── PAGE HEADER ── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[var(--color-brand-navy)] opacity-[0.03] pointer-events-none" />
                    <div className="px-6 pt-6 pb-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                                    <Calendar className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Events</p>
                                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">Danh sách sự kiện</h1>
                                    <p className="text-sm text-[var(--text-muted)]">Khám phá và đăng ký các sự kiện thú vị</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* View mode toggle */}
                                <div className="flex items-center gap-1 p-1 bg-[var(--bg-muted)] rounded-xl">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        title="Lưới"
                                        className={`p-2 rounded-lg transition-all duration-200 ${
                                            viewMode === 'grid'
                                                ? 'bg-white text-[var(--color-brand-navy)] shadow-[var(--shadow-xs)]'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                        }`}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        title="Danh sách"
                                        className={`p-2 rounded-lg transition-all duration-200 ${
                                            viewMode === 'list'
                                                ? 'bg-white text-[var(--color-brand-navy)] shadow-[var(--shadow-xs)]'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                        }`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('kanban')}
                                        title="Kanban"
                                        className={`p-2 rounded-lg transition-all duration-200 ${
                                            viewMode === 'kanban'
                                                ? 'bg-white text-[var(--color-brand-navy)] shadow-[var(--shadow-xs)]'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                        }`}
                                    >
                                        <Kanban className="w-4 h-4" />
                                    </button>
                                </div>
                                {(user?.role === 'admin' || user?.role === 'organizer') && (
                                    <Link
                                        href="/dashboard/events/create"
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[var(--color-brand-navy)] to-[#1a5fc8] text-white rounded-xl hover:opacity-90 transition-all shadow-[var(--shadow-brand)] hover:shadow-[var(--shadow-md)] font-semibold text-sm shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Tạo sự kiện
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── SEARCH & FILTER BAR ── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="px-5 pt-4 pb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            {/* Search */}
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] pointer-events-none z-10" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm sự kiện..."
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

                            {/* Quick status tabs */}
                            <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-muted)] rounded-xl overflow-x-auto shrink-0">
                                {STATUS_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSelectedStatus(opt.value)}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                                            selectedStatus === opt.value
                                                ? 'bg-white text-[var(--color-brand-navy)] shadow-[var(--shadow-xs)]'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {/* Filter toggle */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 shrink-0 ${
                                    showFilters
                                        ? 'bg-[var(--color-brand-navy)] text-white border-[var(--color-brand-navy)] shadow-[var(--shadow-brand)]'
                                        : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] bg-white'
                                }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                <span className="hidden sm:inline">Bộ lọc</span>
                                {hasFilters && (
                                    <span className="w-5 h-5 rounded-full bg-[var(--color-brand-orange)] text-white text-xs font-bold flex items-center justify-center">
                                        {(Number(!!selectedCategory) + Number(!!selectedDepartment) + Number(!!searchQuery) + (sortBy !== 'start_time|desc' ? 1 : 0) + Number(selectedPrice !== undefined))}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Advanced filters */}
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-4 pt-4 border-t border-[var(--border-light)] space-y-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1.5">Danh mục</label>
                                        <div className="relative">
                                            <select
                                                value={selectedCategory || ''}
                                                onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
                                                className="w-full h-11 rounded-xl border-2 border-[var(--border-default)] bg-white px-4 pr-10 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-navy)] transition-colors appearance-none cursor-pointer shadow-[var(--shadow-xs)]"
                                            >
                                                <option value="">Tất cả danh mục</option>
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1.5">Khoa</label>
                                        <div className="relative">
                                            <select
                                                value={selectedDepartment || ''}
                                                onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : null)}
                                                className="w-full h-11 rounded-xl border-2 border-[var(--border-default)] bg-white px-4 pr-10 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-navy)] transition-colors appearance-none cursor-pointer shadow-[var(--shadow-xs)]"
                                            >
                                                <option value="">Tất cả khoa</option>
                                                {departments.map((dept) => (
                                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1.5">Phí tham dự</label>
                                        <div className="relative">
                                            <select
                                                value={selectedPrice === undefined ? '' : String(selectedPrice)}
                                                onChange={(e) => setSelectedPrice(e.target.value === '' ? undefined : e.target.value === 'true')}
                                                className="w-full h-11 rounded-xl border-2 border-[var(--border-default)] bg-white px-4 pr-10 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-navy)] transition-colors appearance-none cursor-pointer shadow-[var(--shadow-xs)]"
                                            >
                                                {PRICE_OPTIONS.map((opt) => (
                                                    <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1.5">Sắp xếp</label>
                                        <div className="relative">
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="w-full h-11 rounded-xl border-2 border-[var(--border-default)] bg-white px-4 pr-10 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-navy)] transition-colors appearance-none cursor-pointer shadow-[var(--shadow-xs)]"
                                            >
                                                {SORT_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {hasFilters && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Đang lọc:</span>
                                        {searchQuery && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-muted)] rounded-lg text-xs font-medium text-[var(--text-secondary)]">
                                                &ldquo;{searchQuery}&rdquo;
                                            </span>
                                        )}
                                        {selectedCategory && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 rounded-lg text-xs font-medium text-blue-700">
                                                {categories.find(c => c.id === selectedCategory)?.name}
                                            </span>
                                        )}
                                        {selectedDepartment && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 rounded-lg text-xs font-medium text-orange-700">
                                                {departments.find(d => d.id === selectedDepartment)?.name}
                                            </span>
                                        )}
                                        {selectedPrice !== undefined && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-lg text-xs font-medium text-emerald-700">
                                                {selectedPrice ? 'Miễn phí' : 'Có phí'}
                                            </span>
                                        )}
                                        {selectedStatus !== 'upcoming' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 rounded-lg text-xs font-medium text-purple-700">
                                                {STATUS_OPTIONS.find(o => o.value === selectedStatus)?.label}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {hasFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-red)]/30 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] px-4 py-2 text-xs font-bold text-[var(--color-brand-red)] shadow-sm transition-all hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] active:scale-95"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Xóa bộ lọc
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* ── RESULTS INFO ── */}
                {!loading && (
                    <div className="flex items-center justify-between px-1">
                        <p className="text-sm font-medium text-[var(--text-muted)]">
                            {totalItems > 0 ? (
                                <>
                                    Hiển thị <span className="font-bold text-[var(--text-primary)]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalItems)}</span> trong <span className="font-bold text-[var(--text-primary)]">{totalItems}</span> sự kiện
                                </>
                            ) : (
                                <span>Không có sự kiện nào phù hợp</span>
                            )}
                        </p>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════
                    GRID VIEW
                ══════════════════════════════════════════════════ */}
                <AnimatePresence mode="wait">
                    {viewMode === 'grid' && (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            {loading && events.length === 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-[var(--border-default)]">
                                            <div className="h-48 bg-slate-100 animate-pulse" />
                                            <div className="p-5 space-y-3">
                                                <div className="h-6 bg-slate-100 rounded animate-pulse w-3/4" />
                                                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                                                <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : events.length === 0 ? (
                                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-16 text-center shadow-[var(--shadow-card)]">
                                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center mx-auto mb-5">
                                        <Calendar className="w-8 h-8 text-[var(--text-muted)]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Không tìm thấy sự kiện nào</h3>
                                    <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                                        Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác
                                    </p>
                                    {hasFilters && (
                                        <button onClick={clearFilters} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-brand-navy)] text-white rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all">
                                            <X className="w-4 h-4" />
                                            Xóa bộ lọc
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {events.map((event, idx) => (
                                        <motion.div
                                            key={event.id}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.04 }}
                                            onClick={() => router.push(`/dashboard/events/${event.id}`)}
                                            className="bg-white rounded-2xl overflow-hidden border border-[var(--border-default)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--color-brand-navy)_30%,transparent)] transition-all duration-300 cursor-pointer group flex flex-col"
                                        >
                                            {/* Image */}
                                            <div className="relative h-48 bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] overflow-hidden shrink-0">
                                                {event.image_url ? (
                                                    <>
                                                        <Image src={event.image_url} alt={event.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Calendar className="w-20 h-20 text-white/15 group-hover:scale-110 transition-transform duration-500" />
                                                    </div>
                                                )}

                                                {/* Top right badges */}
                                                <div className="absolute top-3 right-3 z-10 flex gap-1.5 flex-wrap justify-end">
                                                    {getStatusBadge(event.status)}
                                                </div>

                                                {/* Price badge (top left) */}
                                                <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                                                    {Number(event.event_cost) > 0 ? (
                                                        <span className="px-2.5 py-1 bg-[var(--color-brand-orange)] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1">
                                                            <Ticket className="w-3 h-3" />
                                                            {new Intl.NumberFormat('vi-VN').format(Number(event.event_cost))}đ
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1">
                                                            Miễn phí
                                                        </span>
                                                    )}
                                                    {event.is_featured && (
                                                        <span className="px-2.5 py-1 bg-amber-400 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1">
                                                            ★ Nổi bật
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Category badge (bottom left) */}
                                                {event.category && (
                                                    <div className="absolute bottom-3 left-3 z-10">
                                                        <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/20 rounded-md">
                                                            {event.category.name}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="p-5 flex flex-col flex-1">
                                                <h3 className="text-base font-bold text-[var(--text-primary)] mb-3 line-clamp-2 leading-tight group-hover:text-[var(--color-brand-navy)] transition-colors">
                                                    {event.title}
                                                </h3>

                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                                                        <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                                            <Calendar className="w-3.5 h-3.5 text-[var(--color-brand-navy)]" />
                                                        </div>
                                                        <span className="font-medium truncate">
                                                            {format(new Date(event.start_time), 'EEEE, dd/MM/yyyy • HH:mm', { locale: vi })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                                                        <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                                                            <MapPin className="w-3.5 h-3.5 text-[var(--color-brand-orange)]" />
                                                        </div>
                                                        <span className="font-medium truncate">{event.location}</span>
                                                    </div>
                                                </div>

                                                {/* Footer */}
                                                <div className="mt-4 pt-4 border-t border-[var(--border-light)]">
                                                    <div className="mb-3">
                                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                                            <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium">
                                                                <Users className="w-3.5 h-3.5" />
                                                                <span>{event.current_registrations || 0}/{event.capacity}</span>
                                                            </div>
                                                            <span className={`font-bold text-xs ${getRegPercent(event) >= 90 ? 'text-[var(--color-brand-red)]' : 'text-[var(--text-muted)]'}`}>
                                                                {getRegPercent(event)}% đầy
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ${
                                                                    getRegPercent(event) >= 90 ? 'bg-[var(--color-brand-red)]'
                                                                    : getRegPercent(event) >= 70 ? 'bg-[var(--color-brand-orange)]'
                                                                    : 'bg-[var(--color-brand-navy)]'
                                                                }`}
                                                                style={{ width: `${getRegPercent(event)}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <Award className="w-4 h-4 text-[var(--color-brand-gold)]" />
                                                            <span className="font-bold text-[var(--color-brand-gold)]">+{event.training_points} ĐRL</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-medium">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {format(new Date(event.start_time), 'HH:mm', { locale: vi })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══════════════════════════════════════════════════
                    LIST VIEW
                ══════════════════════════════════════════════════ */}
                <AnimatePresence mode="wait">
                    {viewMode === 'list' && (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            {loading && events.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-[var(--bg-muted)]">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Sự kiện</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Ngày</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Địa điểm</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Phí</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Sức chứa</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">ĐRL</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...Array(5)].map((_, i) => (
                                                    <tr key={i} className="border-t border-[var(--border-light)]">
                                                        {[...Array(7)].map((_, j) => (
                                                            <td key={j} className="px-4 py-4">
                                                                <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : events.length === 0 ? (
                                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-16 text-center shadow-[var(--shadow-card)]">
                                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center mx-auto mb-5">
                                        <List className="w-8 h-8 text-[var(--text-muted)]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Không tìm thấy sự kiện nào</h3>
                                    <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                                        Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác
                                    </p>
                                    {hasFilters && (
                                        <button onClick={clearFilters} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-brand-navy)] text-white rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all">
                                            <X className="w-4 h-4" />
                                            Xóa bộ lọc
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-light)]">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Sự kiện</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Ngày & Giờ</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Địa điểm</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Phí</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Sức chứa</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">ĐRL</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-light)]">
                                                {events.map((event, idx) => (
                                                    <motion.tr
                                                        key={event.id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: idx * 0.03 }}
                                                        onClick={() => router.push(`/dashboard/events/${event.id}`)}
                                                        className="hover:bg-[var(--bg-muted)]/50 cursor-pointer transition-colors group"
                                                    >
                                                        {/* Event */}
                                                        <td className="px-4 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shrink-0">
                                                                    {event.image_url ? (
                                                                        <Image src={event.image_url} alt={event.title} width={40} height={40} className="object-cover w-full h-full" />
                                                                    ) : (
                                                                        <Calendar className="w-5 h-5 text-white/60" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--color-brand-navy)] transition-colors line-clamp-1">
                                                                        {event.title}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        {event.category && (
                                                                            <span className="text-xs text-[var(--text-muted)]">{event.category.name}</span>
                                                                        )}
                                                                        {event.department && (
                                                                            <>
                                                                                <span className="text-[var(--text-light)]">·</span>
                                                                                <span className="text-xs text-[var(--text-muted)]">{event.department.name}</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Date & Time */}
                                                        <td className="px-4 py-3.5">
                                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                                                {format(new Date(event.start_time), 'dd/MM/yyyy', { locale: vi })}
                                                            </p>
                                                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                                                {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                                                            </p>
                                                        </td>

                                                        {/* Location */}
                                                        <td className="px-4 py-3.5">
                                                            <p className="text-sm font-medium text-[var(--text-secondary)] max-w-[160px] truncate">
                                                                {event.location}
                                                            </p>
                                                        </td>

                                                        {/* Fee */}
                                                        <td className="px-4 py-3.5">
                                                            {Number(event.event_cost) > 0 ? (
                                                                <span className="text-sm font-bold text-[var(--color-brand-orange)]">
                                                                    {new Intl.NumberFormat('vi-VN').format(Number(event.event_cost))}đ
                                                                </span>
                                                            ) : (
                                                                <span className="text-sm font-semibold text-emerald-600">Miễn phí</span>
                                                            )}
                                                        </td>

                                                        {/* Capacity */}
                                                        <td className="px-4 py-3.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${
                                                                            getRegPercent(event) >= 90 ? 'bg-[var(--color-brand-red)]'
                                                                            : getRegPercent(event) >= 70 ? 'bg-[var(--color-brand-orange)]'
                                                                            : 'bg-[var(--color-brand-navy)]'
                                                                        }`}
                                                                        style={{ width: `${getRegPercent(event)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">
                                                                    {event.current_registrations || 0}/{event.capacity}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* Training Points */}
                                                        <td className="px-4 py-3.5">
                                                            <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-brand-gold)]">
                                                                <Award className="w-3.5 h-3.5" />
                                                                +{event.training_points}
                                                            </span>
                                                        </td>

                                                        {/* Status */}
                                                        <td className="px-4 py-3.5">
                                                            {getStatusBadge(event.status)}
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══════════════════════════════════════════════════
                    KANBAN VIEW
                ══════════════════════════════════════════════════ */}
                <AnimatePresence mode="wait">
                    {viewMode === 'kanban' && (
                        <motion.div
                            key="kanban"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-x-auto"
                        >
                            {loading && events.length === 0 ? (
                                <div className="grid grid-cols-4 gap-4 min-w-[800px]">
                                    {[...Array(4)].map((_, ci) => (
                                        <div key={ci} className="bg-white rounded-2xl border border-[var(--border-default)] p-4">
                                            <div className="h-6 bg-slate-100 rounded animate-pulse mb-4" />
                                            {[...Array(3)].map((_, ri) => (
                                                <div key={ri} className="h-24 bg-slate-50 rounded-xl mb-3 animate-pulse" />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ) : events.length === 0 ? (
                                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-16 text-center shadow-[var(--shadow-card)]">
                                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center mx-auto mb-5">
                                        <Kanban className="w-8 h-8 text-[var(--text-muted)]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Không tìm thấy sự kiện nào</h3>
                                    <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                                        Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác
                                    </p>
                                    {hasFilters && (
                                        <button onClick={clearFilters} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-brand-navy)] text-white rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all">
                                            <X className="w-4 h-4" />
                                            Xóa bộ lọc
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-4 min-w-[800px]">
                                    {KANBAN_COLUMNS.map((col) => {
                                        const colEvents = kanbanGroups[col.key] || [];
                                        const badge = col.badge;

                                        return (
                                            <div key={col.key} className="flex flex-col">
                                                {/* Column header */}
                                                <div className={`bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden mb-3`}>
                                                    <div className={`px-4 py-3 border-b-2 ${col.color} flex items-center justify-between`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.text}`}>
                                                                {badge.label}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-muted)] px-2 py-0.5 rounded-full">
                                                            {colEvents.length}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Column cards */}
                                                <div className="space-y-3">
                                                    {colEvents.map((event, idx) => (
                                                        <motion.div
                                                            key={event.id}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            onClick={() => router.push(`/dashboard/events/${event.id}`)}
                                                            className="bg-white rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-brand-navy)_30%,transparent)] transition-all duration-200 cursor-pointer group overflow-hidden"
                                                        >
                                                            {/* Image */}
                                                            <div className="relative h-28 bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] overflow-hidden">
                                                                {event.image_url ? (
                                                                    <>
                                                                        <Image src={event.image_url} alt={event.title} fill sizes="200px" className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                                                                    </>
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Calendar className="w-10 h-10 text-white/20" />
                                                                    </div>
                                                                )}
                                                                {/* Price badge always shown */}
                                                                {Number(event.event_cost) > 0 ? (
                                                                    <div className="absolute top-2 left-2 z-10">
                                                                        <span className="px-2 py-0.5 bg-[var(--color-brand-orange)] text-white text-xs font-bold rounded-md flex items-center gap-1">
                                                                            <Ticket className="w-3 h-3" />
                                                                            {new Intl.NumberFormat('vi-VN').format(Number(event.event_cost))}đ
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="absolute top-2 left-2 z-10">
                                                                        <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-md flex items-center gap-1">
                                                                            Miễn phí
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="p-3">
                                                                {/* Title */}
                                                                <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--color-brand-navy)] transition-colors leading-tight mb-2">
                                                                    {event.title}
                                                                </h4>

                                                                {/* Time info */}
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                                                        <Calendar className="w-3 h-3 shrink-0" />
                                                                        <span className="truncate">
                                                                            {format(new Date(event.start_time), 'dd/MM/yyyy', { locale: vi })}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                                                        <MapPin className="w-3 h-3 shrink-0" />
                                                                        <span className="truncate">{event.location}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Footer stats */}
                                                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border-light)]">
                                                                    <div className="flex items-center gap-1">
                                                                        <Users className="w-3 h-3 text-[var(--text-muted)]" />
                                                                        <span className="text-xs font-medium text-[var(--text-muted)]">
                                                                            {event.current_registrations || 0}/{event.capacity}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Award className="w-3 h-3 text-[var(--color-brand-gold)]" />
                                                                        <span className="text-xs font-bold text-[var(--color-brand-gold)]">
                                                                            +{event.training_points}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Countdown for upcoming */}
                                                                {col.key === 'upcoming' && (() => {
                                                                    const countdown = getTimeUntilEvent(event.start_time);
                                                                    return countdown ? (
                                                                        <div className="mt-2 px-2 py-1 bg-blue-50 rounded-md text-center">
                                                                            <span className="text-xs font-semibold text-blue-600">{countdown}</span>
                                                                        </div>
                                                                    ) : null;
                                                                })()}
                                                            </div>
                                                        </motion.div>
                                                    ))}

                                                    {colEvents.length === 0 && (
                                                        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border-2 border-dashed border-[var(--border-light)]">
                                                            <Calendar className="w-8 h-8 text-[var(--text-light)] mb-2" />
                                                            <p className="text-xs text-[var(--text-muted)] text-center">Chưa có sự kiện</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── PAGINATION ── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => { setPage(p => Math.max(1, p - 1)); fetchData(false); }}
                            disabled={page <= 1}
                            className="w-10 h-10 rounded-xl border-2 border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                            let pageNum: number;
                            if (totalPages <= 7) {
                                pageNum = i + 1;
                            } else if (page <= 4) {
                                pageNum = i + 1;
                            } else if (page >= totalPages - 3) {
                                pageNum = totalPages - 6 + i;
                            } else {
                                pageNum = page - 3 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => { setPage(pageNum); fetchData(false); }}
                                    className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                                        page === pageNum
                                            ? 'bg-[var(--color-brand-navy)] text-white shadow-[var(--shadow-brand)]'
                                            : 'border-2 border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)]'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); fetchData(false); }}
                            disabled={page >= totalPages}
                            className="w-10 h-10 rounded-xl border-2 border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
