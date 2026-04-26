'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useOrganizerStore } from '@/store/organizerStore';
import { categoryService } from '@/services/categoryService';
import { DataTable } from '@/components/admin/shared/DataTable';
import { StatusChip } from '@/components/admin/shared/StatusChip';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { KPIMetricsDisplay } from '@/components/admin/organizers/KPIMetricsDisplay';
import { GrantOrganizerDialog } from '@/components/admin/organizers/GrantOrganizerDialog';
import { Search, UserPlus, UserMinus, X, Users, RotateCcw, Building2, UserCog, TrendingUp, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { ColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';

interface Organizer {
    id: string;
    full_name: string;
    email: string;
    department?: { id: string; name: string };
    is_active: boolean;
    metrics?: {
        eventsCreated: number;
        totalAttendees: number;
        averageRating: number;
        upcomingEvents: number;
        completedEvents: number;
        eventsByCategory?: Array<{ categoryId: string; categoryName: string; count: number }>;
    };
}

interface DepartmentOption {
    id?: string;
    name?: string;
}

const DEFAULT_FILTERS = {
    search: '',
    department_id: '',
    status: '',
    eventsCreatedMin: null,
    eventsCreatedMax: null,
    totalAttendeesMin: null,
    totalAttendeesMax: null,
    sortBy: 'eventsCreated',
    sortOrder: 'desc' as const,
};

const SORT_OPTIONS = [
    { value: 'eventsCreated-desc', label: 'Sự kiện (Nhiều nhất)' },
    { value: 'eventsCreated-asc', label: 'Sự kiện (Ít nhất)' },
    { value: 'totalAttendees-desc', label: 'Lượt tham gia (Cao nhất)' },
    { value: 'totalAttendees-asc', label: 'Lượt tham gia (Thấp nhất)' },
    { value: 'averageRating-desc', label: 'Đánh giá (Cao nhất)' },
    { value: 'averageRating-asc', label: 'Đánh giá (Thấp nhất)' },
];

const getInitials = (fullName: string) =>
    fullName.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');

export default function OrganizerManagementPage() {
    const {
        organizers, filters, pagination, loading,
        fetchOrganizers, updateFilters, grantOrganizerRights,
        revokeOrganizerRights, fetchOrganizerMetrics, setPage, setPageSize,
    } = useOrganizerStore();

    const [searchInput, setSearchInput] = useState('');
    const [showGrantDialog, setShowGrantDialog] = useState(false);
    const [isMetricsOpen, setIsMetricsOpen] = useState(false);
    const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);
    const [selectedMetrics, setSelectedMetrics] = useState<Organizer['metrics'] | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [metricsError, setMetricsError] = useState<string | null>(null);
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [revokeDialog, setRevokeDialog] = useState<{ isOpen: boolean; organizerId?: string; organizerName?: string }>({ isOpen: false });

    useEffect(() => { fetchOrganizers(); }, [fetchOrganizers]);

    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const data = await categoryService.getDepartments();
                setDepartments(data || []);
            } catch (loadError) {
                console.error('Failed to load departments:', loadError);
            }
        };

        void loadDepartments();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== filters.search) updateFilters({ search: searchInput });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, filters.search, updateFilters]);

    const fetchDetailedMetrics = useCallback(
        async (organizerId: string, from?: string, to?: string) => {
            try {
                setMetricsLoading(true);
                setMetricsError(null);
                const metrics = await fetchOrganizerMetrics(organizerId, from || undefined, to || undefined);
                setSelectedMetrics(metrics);
            } catch {
                setMetricsError('Không thể tải KPI chi tiết cho organizer này.');
            } finally {
                setMetricsLoading(false);
            }
        },
        [fetchOrganizerMetrics]
    );

    const handleGrantRights = async (userId: string) => {
        try {
            await grantOrganizerRights(userId);
            toast.success('Đã cấp quyền organizer thành công');
        } catch {
            toast.error('Không thể cấp quyền. Vui lòng thử lại.');
        }
    };

    const handleRevokeClick = (organizer: Organizer) =>
        setRevokeDialog({ isOpen: true, organizerId: organizer.id, organizerName: organizer.full_name });

    const handleRevokeConfirm = async () => {
        if (!revokeDialog.organizerId) return;
        try {
            await revokeOrganizerRights(revokeDialog.organizerId);
            setRevokeDialog({ isOpen: false });
            toast.success('Đã thu hồi quyền organizer');
        } catch {
            toast.error('Không thể thu hồi quyền. Vui lòng thử lại.');
        }
    };

    const handleOpenMetrics = (organizer: Organizer) => {
        setSelectedOrganizer(organizer);
        setSelectedMetrics(organizer.metrics || null);
        setMetricsError(null);
        setDateFrom('');
        setDateTo('');
        setIsMetricsOpen(true);
        fetchDetailedMetrics(organizer.id);
    };

    const topCategoryCount = useMemo(() => {
        if (!selectedMetrics?.eventsByCategory?.length) return 0;
        return Math.max(...selectedMetrics.eventsByCategory.map((item) => item.count));
    }, [selectedMetrics]);

    const hasCustomFilters =
        searchInput.trim().length > 0 ||
        filters.department_id !== DEFAULT_FILTERS.department_id ||
        filters.status !== DEFAULT_FILTERS.status ||
        filters.eventsCreatedMin !== DEFAULT_FILTERS.eventsCreatedMin ||
        filters.eventsCreatedMax !== DEFAULT_FILTERS.eventsCreatedMax ||
        filters.totalAttendeesMin !== DEFAULT_FILTERS.totalAttendeesMin ||
        filters.totalAttendeesMax !== DEFAULT_FILTERS.totalAttendeesMax ||
        filters.sortBy !== DEFAULT_FILTERS.sortBy ||
        filters.sortOrder !== DEFAULT_FILTERS.sortOrder;

    const resetFilters = () => {
        setSearchInput('');
        updateFilters(DEFAULT_FILTERS);
    };

    const parseSortOption = (value: string) => {
        const [sortBy, sortOrder] = value.split('-');
        return { sortBy, sortOrder };
    };

    const currentSortValue = `${filters.sortBy}-${filters.sortOrder}`;
    const parseNullableNumber = (value: string) => {
        if (!value.trim()) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const handleSortChange = (value: string) => {
        const { sortBy, sortOrder } = parseSortOption(value);
        updateFilters({ sortBy, sortOrder });
    };

    const sortingState: SortingState = useMemo(
        () => [{ id: filters.sortBy || 'eventsCreated', desc: filters.sortOrder !== 'asc' }],
        [filters.sortBy, filters.sortOrder]
    );

    const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
        const next = typeof updater === 'function' ? updater(sortingState) : updater;
        if (!next.length) {
            updateFilters({ sortBy: DEFAULT_FILTERS.sortBy, sortOrder: DEFAULT_FILTERS.sortOrder });
            return;
        }
        updateFilters({ sortBy: next[0].id, sortOrder: next[0].desc ? 'desc' : 'asc' });
    };

    const columns: ColumnDef<Organizer>[] = [
        {
            accessorKey: 'full_name',
            header: 'Người dùng',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand-orange)] to-[#e05500] text-xs font-bold text-white shadow-sm">
                        {getInitials(row.original.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{row.original.full_name}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">{row.original.email}</p>
                    </div>
                </div>
            ),
            meta: { headerClassName: 'min-w-[220px]', cellClassName: 'min-w-[220px]', align: 'left' as const },
        },
        {
            accessorKey: 'department',
            header: 'Phòng ban',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    {row.original.department ? (
                        <>
                            <Building2 className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                            <span className="text-sm text-[var(--text-secondary)] truncate block max-w-[180px]" title={row.original.department.name}>{row.original.department.name}</span>
                        </>
                    ) : (
                        <span className="text-sm italic text-[var(--text-muted)]">Chưa có phòng ban</span>
                    )}
                </div>
            ),
            meta: { headerClassName: 'min-w-[160px]', cellClassName: 'min-w-[160px]', align: 'left' as const },
        },
        {
            accessorKey: 'is_active',
            header: 'Trạng thái',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <StatusChip status={row.original.is_active ? 'Đang hoạt động' : 'Không hoạt động'} />
                </div>
            ),
            meta: { headerClassName: 'min-w-[140px]', cellClassName: 'min-w-[140px]', align: 'center' as const },
        },
        {
            id: 'actions',
            header: 'Thao tác',
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => handleOpenMetrics(row.original)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-brand-navy)]/20 bg-[color-mix(in_srgb,var(--color-brand-navy)_6%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--color-brand-navy)] hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_12%,transparent)] transition-colors"
                    >
                        <TrendingUp className="h-3.5 w-3.5" />
                        KPI
                    </button>
                    <button
                        onClick={() => handleRevokeClick(row.original)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-brand-red)]/20 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--color-brand-red)] hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] transition-colors"
                    >
                        <UserMinus className="h-3.5 w-3.5" />
                        Thu hồi
                    </button>
                </div>
            ),
            meta: { headerClassName: 'min-w-[200px]', cellClassName: 'min-w-[200px]', align: 'right' as const },
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6 p-4 md:p-6">
                {/* Header */}
                <section className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-orange)] via-[var(--color-brand-gold)] to-[var(--color-brand-navy)]" />
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-orange)] to-[#e05500] flex items-center justify-center shadow-[0_4px_14px_rgba(242,102,0,0.25)]">
                                <UserCog className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Organizer Management</p>
                                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Quản lý Ban tổ chức</h1>
                                <p className="text-sm text-[var(--text-muted)]">Quản lý quyền và theo dõi hiệu suất của các organizer</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-muted)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] shadow-sm">
                                <Users className="h-4 w-4 text-[var(--color-brand-orange)]" />
                                {pagination.total} organizers
                            </div>
                            <button
                                onClick={() => setShowGrantDialog(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-brand-orange)] to-[#e05500] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(242,102,0,0.25)] transition-all hover:shadow-[0_6px_20px_rgba(242,102,0,0.3)] hover:-translate-y-px active:scale-95"
                            >
                                <UserPlus className="h-4 w-4" />
                                Cấp quyền Organizer
                            </button>
                        </div>
                    </div>
                </section>

                {/* Filters */}
                <section className="rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,transparent)] flex items-center justify-center">
                                <Search className="h-4.5 w-4.5 text-[var(--color-brand-orange)]" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[var(--text-primary)]">Bộ lọc và tìm kiếm</h2>
                                <p className="text-xs text-[var(--text-muted)]">Tìm organizer theo tên/email</p>
                            </div>
                        </div>
                        {hasCustomFilters && (
                            <button onClick={resetFilters} className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-red)]/30 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] px-4 py-2 text-xs font-bold text-[var(--color-brand-red)] shadow-sm transition-all hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] active:scale-95">
                                <RotateCcw className="h-3.5 w-3.5" />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    <div className="mb-4">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Tìm kiếm</label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Nhập họ tên hoặc email..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="input-base pr-10"
                                style={{ paddingLeft: '3.25rem' }}
                            />
                            {searchInput && (
                                <button
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter controls */}
                    <div className="mb-3 flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-[var(--text-muted)]" />
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Bộ lọc chuyên sâu</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Đơn vị</label>
                            <div className="relative">
                                <select
                                    value={filters.department_id}
                                    onChange={(e) => updateFilters({ department_id: e.target.value })}
                                    className="input-base appearance-none pr-10"
                                >
                                    <option value="">Tất cả đơn vị</option>
                                    {departments.map((department) => (
                                        <option key={department.id} value={department.id}>
                                            {department.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                    <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Trạng thái</label>
                            <div className="relative">
                                <select
                                    value={filters.status}
                                    onChange={(e) => updateFilters({ status: e.target.value })}
                                    className="input-base appearance-none pr-10"
                                >
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="active">Đang hoạt động</option>
                                    <option value="inactive">Không hoạt động</option>
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                    <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Sự kiện đã tạo</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={filters.eventsCreatedMin ?? ''}
                                    onChange={(e) => updateFilters({ eventsCreatedMin: parseNullableNumber(e.target.value) })}
                                    placeholder="Từ"
                                    className="input-base"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    value={filters.eventsCreatedMax ?? ''}
                                    onChange={(e) => updateFilters({ eventsCreatedMax: parseNullableNumber(e.target.value) })}
                                    placeholder="Đến"
                                    className="input-base"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Lượt tham gia</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={filters.totalAttendeesMin ?? ''}
                                    onChange={(e) => updateFilters({ totalAttendeesMin: parseNullableNumber(e.target.value) })}
                                    placeholder="Từ"
                                    className="input-base"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    value={filters.totalAttendeesMax ?? ''}
                                    onChange={(e) => updateFilters({ totalAttendeesMax: parseNullableNumber(e.target.value) })}
                                    placeholder="Đến"
                                    className="input-base"
                                />
                            </div>
                        </div>

                        {/* Sort — merged into single dropdown */}
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Sắp xếp</label>
                            <div className="relative">
                                <select
                                    value={currentSortValue}
                                    onChange={(e) => handleSortChange(e.target.value)}
                                    className="input-base appearance-none pr-10"
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                    <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Table */}
                <section className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="flex flex-col gap-2 border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--bg-muted)]/50 to-transparent px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
                        <p className="text-sm text-[var(--text-secondary)]">
                            Hiển thị trang{' '}
                            <span className="font-bold text-[var(--text-primary)]">{pagination.page}</span>
                            {' / '}{Math.max(pagination.totalPages, 1)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">Nhấn vào dòng để xem KPI chi tiết</p>
                    </div>
                    <div className="p-4 md:p-5">
                        <DataTable
                            columns={columns}
                            data={organizers}
                            onRowClick={handleOpenMetrics}
                            pagination={{ pageIndex: pagination.page - 1, pageSize: pagination.limit }}
                            onPaginationChange={(updater) => {
                                const cur = { pageIndex: pagination.page - 1, pageSize: pagination.limit };
                                const nxt = typeof updater === 'function' ? updater(cur) : updater;
                                if (nxt.pageIndex !== pagination.page - 1) setPage(nxt.pageIndex + 1);
                                if (nxt.pageSize !== pagination.limit) setPageSize(nxt.pageSize);
                            }}
                            sorting={sortingState}
                            onSortingChange={handleSortingChange}
                            loading={loading}
                            pageCount={pagination.totalPages}
                            totalRows={pagination.total}
                            manualPagination
                            manualSorting
                            emptyTitle="Không tìm thấy organizer"
                            emptyDescription="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
                        />
                    </div>
                </section>

                {/* Dialogs */}
                <GrantOrganizerDialog isOpen={showGrantDialog} onClose={() => setShowGrantDialog(false)} onGrant={handleGrantRights} />
                <ConfirmDialog
                    isOpen={revokeDialog.isOpen}
                    onClose={() => setRevokeDialog({ isOpen: false })}
                    onConfirm={handleRevokeConfirm}
                    title="Thu hồi quyền Organizer"
                    description={`Bạn có chắc muốn thu hồi quyền organizer của ${revokeDialog.organizerName}?`}
                    confirmText="Thu hồi"
                    cancelText="Hủy"
                    variant="destructive"
                />

                {/* KPI Drawer */}
                {isMetricsOpen && selectedOrganizer && (
                    <div className="fixed inset-0 z-50 overflow-hidden">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMetricsOpen(false)} />
                        <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl">
                            <div className="flex h-full flex-col">
                                {/* Drawer header */}
                                <div className="flex items-start justify-between border-b border-[var(--border-default)] px-6 py-5">
                                    <div>
                                        <h2 className="text-xl font-extrabold text-[var(--text-primary)]">KPI Organizer</h2>
                                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                                            {selectedOrganizer.full_name} — {selectedOrganizer.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsMetricsOpen(false)}
                                        className="rounded-xl border border-[var(--border-default)] bg-white p-2 text-[var(--text-muted)] shadow-sm hover:border-[var(--color-brand-red)] hover:text-[var(--color-brand-red)] transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Date filters */}
                                <div className="grid grid-cols-1 gap-3 border-b border-[var(--border-light)] px-6 py-4 md:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Từ ngày</label>
                                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-base text-sm" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Đến ngày</label>
                                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-base text-sm" />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <button
                                            onClick={() => selectedOrganizer && fetchDetailedMetrics(selectedOrganizer.id, dateFrom, dateTo)}
                                            className="btn btn-primary btn-sm flex-1"
                                        >
                                            Áp dụng
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDateFrom('');
                                                setDateTo('');
                                                if (selectedOrganizer) {
                                                    fetchDetailedMetrics(selectedOrganizer.id);
                                                }
                                            }}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            Xóa lọc
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                                    {metricsError && (
                                        <div className="rounded-xl border border-[var(--color-brand-red)]/20 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] p-4 text-sm text-[var(--color-brand-red)]">
                                            {metricsError}
                                        </div>
                                    )}

                                    {metricsLoading ? (
                                        <div className="flex items-center justify-center py-12 gap-3">
                                            <div className="w-7 h-7 rounded-full border-2 border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                            <span className="text-sm text-[var(--text-muted)]">Đang tải KPI chi tiết...</span>
                                        </div>
                                    ) : selectedMetrics ? (
                                        <>
                                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-muted)]/30 p-4">
                                                <KPIMetricsDisplay metrics={selectedMetrics} />
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                {[
                                                    { label: 'Sự kiện sắp tới', value: selectedMetrics.upcomingEvents },
                                                    { label: 'Sự kiện hoàn thành', value: selectedMetrics.completedEvents },
                                                    { label: 'Điểm đánh giá TB', value: selectedMetrics.averageRating.toFixed(2) },
                                                ].map((item) => (
                                                    <div key={item.label} className="rounded-xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-xs)]">
                                                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{item.label}</p>
                                                        <p className="mt-2 text-2xl font-extrabold text-[var(--text-primary)]">{item.value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="rounded-xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-xs)]">
                                                <h3 className="mb-4 text-sm font-bold text-[var(--text-primary)]">Phân bổ sự kiện theo danh mục</h3>
                                                {selectedMetrics.eventsByCategory && selectedMetrics.eventsByCategory.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {selectedMetrics.eventsByCategory.map((item) => {
                                                            const width = topCategoryCount > 0 ? (item.count / topCategoryCount) * 100 : 0;
                                                            return (
                                                                <div key={item.categoryId}>
                                                                    <div className="mb-1.5 flex items-center justify-between text-sm">
                                                                        <span className="font-medium text-[var(--text-secondary)]">{item.categoryName}</span>
                                                                        <span className="font-bold text-[var(--text-primary)]">{item.count}</span>
                                                                    </div>
                                                                    <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                                                                        <div
                                                                            className="h-full rounded-full bg-gradient-to-r from-[var(--color-brand-orange)] to-[var(--color-brand-gold)] transition-all duration-500"
                                                                            style={{ width: `${width}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-[var(--text-muted)]">Không có dữ liệu danh mục.</p>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center py-12">
                                            <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu KPI.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
