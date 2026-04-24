'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { eventService } from '@/services/eventService';
import { Event, Category, Department } from '@/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    Calendar, MapPin, Users, Award, Search, Filter, X, ChevronLeft,
    ChevronRight, ArrowUpDown, SlidersHorizontal, Clock, QrCode, Plus
} from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 12;

interface EventQueryParams {
    status?: string;
    limit?: number;
    search?: string;
    category_id?: number;
    department_id?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: string;
}

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
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'ongoing', label: 'Đang diễn ra' },
    { value: 'completed', label: 'Đã kết thúc' },
    { value: '', label: 'Tất cả' },
];

const SORT_OPTIONS = [
    { value: 'start_time|asc', label: 'Ngày bắt đầu ↑' },
    { value: 'start_time|desc', label: 'Ngày bắt đầu ↓' },
    { value: 'title|asc', label: 'Tên A → Z' },
    { value: 'title|desc', label: 'Tên Z → A' },
    { value: 'current_registrations|desc', label: 'Lượt đăng ký ↓' },
];

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Chờ duyệt' },
    approved: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-700', label: 'Đã duyệt' },
    upcoming: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Sắp diễn ra' },
    ongoing: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Đang diễn ra' },
    completed: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-600', label: 'Đã kết thúc' },
    cancelled: { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'Đã hủy' },
};

function getStatusBadge(status: string) {
    const badge = STATUS_BADGES[status] || STATUS_BADGES.upcoming;
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text}`}>
            {badge.label}
        </span>
    );
}

export default function EventsPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState('upcoming');
    const [sortBy, setSortBy] = useState('start_time|desc');
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchData = useCallback(async (resetPage = true) => {
        if (resetPage) setPage(1);
        try {
            setLoading(true);
            const [sortField, sortDir] = sortBy.split('|');

            const params: EventQueryParams = {
                status: selectedStatus || undefined,
                limit: PAGE_SIZE,
                page: resetPage ? 1 : page,
            };

            if (searchQuery) params.search = searchQuery;
            if (selectedCategory) params.category_id = selectedCategory;
            if (selectedDepartment) params.department_id = selectedDepartment;
            if (sortField) params.sortBy = sortField;
            if (sortDir) params.sortOrder = sortDir;

            const eventsRes = await eventService.getAll(params);
            const items = eventsRes.data?.items || eventsRes.data || [];
            const pagination = eventsRes.data?.pagination || { total: items.length, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };

            setEvents(resetPage ? items : items);
            setTotalItems(pagination.total);
            setTotalPages(pagination.totalPages);
            setPage(pagination.page);

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
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchData(true);
        }
    }, [isAuthenticated, selectedStatus, selectedCategory, selectedDepartment, sortBy]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(true);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory(null);
        setSelectedDepartment(null);
        setSelectedStatus('upcoming');
        setSortBy('start_time|desc');
    };

    const hasFilters = useMemo(() =>
        searchQuery || selectedCategory || selectedDepartment || selectedStatus !== 'upcoming' || sortBy !== 'start_time|desc',
        [searchQuery, selectedCategory, selectedDepartment, selectedStatus, sortBy]
    );

    const getRegPercent = (event: Event) => {
        if (!event.capacity) return 0;
        return Math.min(Math.round(((event.current_registrations || 0) / event.capacity) * 100), 100);
    };

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
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Events</p>
                                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">Danh sách sự kiện</h1>
                                    <p className="text-sm text-[var(--text-muted)]">Khám phá và đăng ký các sự kiện thú vị</p>
                                </div>
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
                                    <span className="w-5 h-5 rounded-full bg-[var(--color-brand-orange)] text-white text-[10px] font-bold flex items-center justify-center">
                                        {(!!selectedCategory) + (!!selectedDepartment) + (!!searchQuery) + (sortBy !== 'start_time|desc' ? 1 : 0)}
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1.5">Danh mục</label>
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
                                        <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1.5">Khoa</label>
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
                                        <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1.5">Sắp xếp</label>
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
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Đang lọc:</span>
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
                                            {selectedStatus !== 'upcoming' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 rounded-lg text-xs font-medium text-purple-700">
                                                    {STATUS_OPTIONS.find(o => o.value === selectedStatus)?.label}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={clearFilters}
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-red)] hover:text-[var(--color-brand-red)]/80 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                            Xóa tất cả
                                        </button>
                                    </div>
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

                {/* ── EVENTS GRID ── */}
                {loading && events.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-brand-navy)] text-white rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all"
                            >
                                <X className="w-4 h-4" />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                    >
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
                                            <Image
                                                src={event.image_url}
                                                alt={event.title}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Calendar className="w-20 h-20 text-white/15 group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className="absolute top-3 right-3 z-10 flex gap-1.5 flex-wrap justify-end">
                                        {getStatusBadge(event.status)}
                                    </div>
                                        {event.is_featured && (
                                            <div className="absolute top-3 left-3 z-10">
                                                <span className="px-2.5 py-1 bg-[var(--color-brand-orange)] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm">Nổi bật</span>
                                            </div>
                                        )}
                                    {event.category && (
                                        <div className="absolute bottom-3 left-3 z-10">
                                            <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 rounded-md">
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
                                        {/* Capacity bar */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between text-xs mb-1.5">
                                                <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium">
                                                    <Users className="w-3.5 h-3.5" />
                                                    <span>{event.current_registrations || 0}/{event.capacity}</span>
                                                </div>
                                                <span className={`font-bold text-[10px] ${getRegPercent(event) >= 90 ? 'text-[var(--color-brand-red)]' : 'text-[var(--text-muted)]'}`}>
                                                    {getRegPercent(event)}% đầy
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${
                                                        getRegPercent(event) >= 90
                                                            ? 'bg-[var(--color-brand-red)]'
                                                            : getRegPercent(event) >= 70
                                                                ? 'bg-[var(--color-brand-orange)]'
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
                    </motion.div>
                )}

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
