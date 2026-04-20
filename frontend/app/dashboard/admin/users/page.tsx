'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAdminUserStore } from '@/store/adminUserStore';
import { DataTable } from '@/components/admin/shared/DataTable';
import { StatusChip } from '@/components/admin/shared/StatusChip';
import { BulkActionToolbar } from '@/components/admin/shared/BulkActionToolbar';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { UserDetailPanel } from '@/components/admin/users/UserDetailPanel';
import {
    Lock,
    RotateCcw,
    Search,
    Unlock,
    Users,
    SlidersHorizontal,
    UserCog,
} from 'lucide-react';
import { ColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';

interface User {
    id: string;
    full_name: string;
    email: string;
    role: 'admin' | 'organizer' | 'student';
    department?: {
        id: string;
        name: string;
    };
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

const DEFAULT_FILTERS = {
    search: '',
    role: '',
    department_id: '',
    is_active: '',
    sortBy: 'created_at',
    sortOrder: 'desc' as const,
};

const SORT_FIELDS = [
    { value: 'created_at', label: 'Ngày đăng ký' },
    { value: 'full_name', label: 'Họ tên' },
    { value: 'role', label: 'Vai trò' },
    { value: 'last_login', label: 'Đăng nhập gần nhất' },
];

const ROLE_LABELS: Record<User['role'], string> = {
    admin: 'Quản trị viên',
    organizer: 'Ban tổ chức',
    student: 'Sinh viên',
};

const ROLE_BADGE_VARIANTS: Record<User['role'], 'info' | 'warning' | 'success'> = {
    admin: 'info',
    organizer: 'warning',
    student: 'success',
};

const SORTABLE_FIELD_MAP: Record<string, string> = {
    full_name: 'full_name',
    role: 'role',
    created_at: 'created_at',
    last_login: 'last_login',
};

const formatDate = (dateString: string | null, withTime = false) => {
    if (!dateString) return 'Chưa đăng nhập';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('vi-VN', withTime
        ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' }
    );
};

const getInitials = (fullName: string) =>
    fullName.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');

export default function UserManagementPage() {
    const {
        users, selectedUsers, filters, pagination, loading,
        fetchUsers, updateFilters, lockUser, unlockUser, changeUserRole,
        bulkLock, bulkUnlock, toggleUserSelection, selectAllUsers,
        clearSelection, setPage, setPageSize,
    } = useAdminUserStore();

    const [searchInput, setSearchInput] = useState('');
    const initializedRef = useRef(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'lock' | 'unlock' | 'bulkLock' | 'bulkUnlock' | null;
        userId?: string;
    }>({ isOpen: false, type: null });

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        if (pagination.limit !== 10) {
            setPageSize(10);
            return;
        }

        fetchUsers();
    }, [fetchUsers, pagination.limit, setPageSize]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== filters.search) updateFilters({ search: searchInput });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, filters.search, updateFilters]);

    const handleLockClick = (userId: string) =>
        setConfirmDialog({ isOpen: true, type: 'lock', userId });

    const handleUnlockClick = (userId: string) =>
        setConfirmDialog({ isOpen: true, type: 'unlock', userId });

    const handleConfirmAction = async () => {
        try {
            if (confirmDialog.type === 'lock' && confirmDialog.userId) {
                await lockUser(confirmDialog.userId);
                toast.success('Đã khóa tài khoản người dùng');
            } else if (confirmDialog.type === 'unlock' && confirmDialog.userId) {
                await unlockUser(confirmDialog.userId);
                toast.success('Đã mở khóa tài khoản người dùng');
            } else if (confirmDialog.type === 'bulkLock') {
                await bulkLock(Array.from(selectedUsers));
                clearSelection();
                toast.success('Đã khóa các tài khoản đã chọn');
            } else if (confirmDialog.type === 'bulkUnlock') {
                await bulkUnlock(Array.from(selectedUsers));
                clearSelection();
                toast.success('Đã mở khóa các tài khoản đã chọn');
            }
        } catch {
            toast.error('Không thể thực hiện thao tác. Vui lòng thử lại.');
        }
    };

    const handleRowClick = (user: User) => {
        setSelectedUser(user);
        setShowDetailPanel(true);
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await changeUserRole(userId, newRole);
            setShowDetailPanel(false);
            toast.success('Đã cập nhật vai trò người dùng');
        } catch {
            toast.error('Không thể đổi vai trò. Vui lòng thử lại.');
        }
    };

    const sortingState: SortingState = useMemo(
        () => [{ id: filters.sortBy || 'created_at', desc: filters.sortOrder !== 'asc' }],
        [filters.sortBy, filters.sortOrder]
    );

    const hasCustomFilters =
        searchInput.trim().length > 0 ||
        filters.role !== DEFAULT_FILTERS.role ||
        filters.is_active !== DEFAULT_FILTERS.is_active ||
        filters.sortBy !== DEFAULT_FILTERS.sortBy ||
        filters.sortOrder !== DEFAULT_FILTERS.sortOrder;

    const resetFilters = () => {
        setSearchInput('');
        updateFilters(DEFAULT_FILTERS);
        clearSelection();
    };

    const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
        const nextSorting = typeof updater === 'function' ? updater(sortingState) : updater;
        if (!nextSorting.length) {
            updateFilters({ sortBy: DEFAULT_FILTERS.sortBy, sortOrder: DEFAULT_FILTERS.sortOrder });
            return;
        }
        const [first] = nextSorting;
        updateFilters({
            sortBy: SORTABLE_FIELD_MAP[first.id] || DEFAULT_FILTERS.sortBy,
            sortOrder: first.desc ? 'desc' : 'asc',
        });
    };

    const columns: ColumnDef<User>[] = [
        {
            id: 'select',
            header: () => (
                <input
                    type="checkbox"
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onChange={(e) => e.target.checked ? selectAllUsers() : clearSelection()}
                    className="h-4 w-4 rounded border-[var(--border-default)] text-[var(--color-brand-navy)] focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_40%,transparent)]"
                    aria-label="Chọn tất cả"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={selectedUsers.has(row.original.id)}
                    onChange={() => toggleUserSelection(row.original.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-[var(--border-default)] text-[var(--color-brand-navy)] focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_40%,transparent)]"
                    aria-label={`Chọn ${row.original.full_name}`}
                />
            ),
            enableSorting: false,
            meta: { headerClassName: 'w-12', cellClassName: 'text-center', align: 'center' as const },
        },
        {
            accessorKey: 'full_name',
            header: 'Người dùng',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] text-[11px] font-bold text-white shadow-sm">
                        {getInitials(row.original.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{row.original.full_name}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]" title={row.original.email}>
                            {row.original.email}
                        </p>
                    </div>
                </div>
            ),
            meta: { headerClassName: 'w-[30%]', cellClassName: '', align: 'left' as const },
        },
        {
            accessorKey: 'role',
            header: 'Vai trò',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <StatusChip
                        status={ROLE_LABELS[row.original.role]}
                        variant={ROLE_BADGE_VARIANTS[row.original.role]}
                    />
                </div>
            ),
            meta: { headerClassName: 'w-[13%]', cellClassName: '', align: 'center' as const },
        },
        {
            accessorKey: 'is_active',
            header: 'Trạng thái',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <StatusChip status={row.original.is_active ? 'Đang hoạt động' : 'Đã khóa'} />
                </div>
            ),
            meta: { headerClassName: 'w-[15%]', cellClassName: '', align: 'center' as const },
        },
        {
            accessorKey: 'last_login',
            header: 'Lần đăng nhập cuối',
            enableSorting: true,
            cell: ({ row }) => (
                <span className="text-sm text-[var(--text-secondary)]">{formatDate(row.original.last_login, true)}</span>
            ),
            meta: { headerClassName: 'w-[20%]', cellClassName: '', align: 'center' as const },
        },
        {
            id: 'actions',
            header: 'Thao tác',
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => handleRowClick(row.original)}
                        className="rounded-lg border border-[var(--color-brand-navy)]/20 bg-[color-mix(in_srgb,var(--color-brand-navy)_6%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--color-brand-navy)] hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_12%,transparent)] transition-colors"
                    >
                        Chi tiết
                    </button>
                    {row.original.is_active ? (
                        <button
                            onClick={() => handleLockClick(row.original.id)}
                            className="rounded-lg border border-[var(--color-brand-red)]/20 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--color-brand-red)] hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] transition-colors"
                        >
                            Khóa
                        </button>
                    ) : (
                        <button
                            onClick={() => handleUnlockClick(row.original.id)}
                            className="rounded-lg border border-[var(--color-brand-green)]/20 bg-[color-mix(in_srgb,var(--color-brand-green)_6%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--color-brand-green)] hover:bg-[color-mix(in_srgb,var(--color-brand-green)_12%,transparent)] transition-colors"
                        >
                            Mở khóa
                        </button>
                    )}
                </div>
            ),
            meta: { headerClassName: 'w-[18%] text-right', cellClassName: '', align: 'right' as const },
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6 p-4 md:p-6">
                {/* Page header */}
                <section className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                <UserCog className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">
                                    User Management
                                </p>
                                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                                    Quản lý người dùng
                                </h1>
                            </div>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-muted)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] shadow-sm">
                            <Users className="h-4 w-4 text-[var(--color-brand-navy)]" />
                            {pagination.total} tài khoản
                        </div>
                    </div>
                </section>

                {/* Filters */}
                <section className="rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                                <SlidersHorizontal className="w-4.5 h-4.5 text-[var(--color-brand-navy)]" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[var(--text-primary)]">Bộ lọc và tìm kiếm</h2>
                                <p className="text-xs text-[var(--text-muted)]">Tìm kiếm và lọc người dùng theo tiêu chí</p>
                            </div>
                        </div>
                        {hasCustomFilters && (
                            <button
                                onClick={resetFilters}
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition-all hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] active:scale-95"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Đặt lại bộ lọc
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Search */}
                        <div>
                            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                                Tìm kiếm
                            </label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    placeholder="Nhập họ tên hoặc email để tìm kiếm..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="input-base pl-12 pr-10"
                                    style={{ paddingLeft: '3rem', paddingRight: '2.5rem' }}
                                />
                                {searchInput && (
                                    <button
                                        onClick={() => setSearchInput('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter controls */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {/* Role */}
                            <div>
                                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Vai trò</label>
                                <div className="relative">
                                    <select
                                        value={filters.role}
                                        onChange={(e) => updateFilters({ role: e.target.value })}
                                        className="input-base appearance-none pr-10"
                                    >
                                        <option value="">Tất cả vai trò</option>
                                        <option value="student">Sinh viên</option>
                                        <option value="organizer">Ban tổ chức</option>
                                        <option value="admin">Quản trị viên</option>
                                    </select>
                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                        <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Trạng thái</label>
                                <div className="relative">
                                    <select
                                        value={filters.is_active}
                                        onChange={(e) => updateFilters({ is_active: e.target.value })}
                                        className="input-base appearance-none pr-10"
                                    >
                                        <option value="">Tất cả trạng thái</option>
                                        <option value="true">Đang hoạt động</option>
                                        <option value="false">Đã khóa</option>
                                    </select>
                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                        <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Sort By */}
                            <div>
                                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Sắp xếp theo</label>
                                <div className="relative">
                                    <select
                                        value={filters.sortBy}
                                        onChange={(e) => updateFilters({ sortBy: e.target.value })}
                                        className="input-base appearance-none pr-10"
                                    >
                                        {SORT_FIELDS.map((f) => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                        <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Sort Order */}
                            <div>
                                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Thứ tự</label>
                                <button
                                    onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                                    className="flex h-[44px] w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--border-default)] bg-white px-4 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition-all hover:border-[var(--color-brand-navy)] hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_4%,transparent)] hover:text-[var(--color-brand-navy)] active:scale-95"
                                >
                                    <svg className={`h-4 w-4 transition-transform ${filters.sortOrder === 'asc' ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                    {filters.sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                                </button>
                            </div>
                        </div>

                        {/* Active filter summary */}
                        {hasCustomFilters && (
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-muted)] px-4 py-2.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Bộ lọc:</span>
                                {searchInput && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm border border-[var(--border-default)]">
                                        Tìm: &ldquo;{searchInput}&rdquo;
                                    </span>
                                )}
                                {filters.role && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm border border-[var(--border-default)]">
                                        Vai trò: {ROLE_LABELS[filters.role as User['role']]}
                                    </span>
                                )}
                                {filters.is_active && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm border border-[var(--border-default)]">
                                        {filters.is_active === 'true' ? 'Đang hoạt động' : 'Đã khóa'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* Table */}
                <section className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--bg-muted)]/50 to-transparent px-5 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                                    <Users className="w-4 h-4 text-[var(--color-brand-navy)]" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Danh sách người dùng</h2>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Trang {pagination.page} / {Math.max(pagination.totalPages, 1)} — {pagination.total} tài khoản
                                    </p>
                                </div>
                            </div>
                            {selectedUsers.size > 0 && (
                                <div className="rounded-lg bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] px-3 py-1.5">
                                    <p className="text-sm font-bold text-[var(--color-brand-navy)]">
                                        Đã chọn {selectedUsers.size} tài khoản
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 md:p-5">
                        <DataTable
                            columns={columns}
                            data={users}
                            pagination={{ pageIndex: pagination.page - 1, pageSize: pagination.limit }}
                            onPaginationChange={(updater) => {
                                const current = { pageIndex: pagination.page - 1, pageSize: pagination.limit };
                                const next = typeof updater === 'function' ? updater(current) : updater;
                                if (next.pageIndex !== pagination.page - 1) setPage(next.pageIndex + 1);
                            }}
                            sorting={sortingState}
                            onSortingChange={handleSortingChange}
                            onRowClick={handleRowClick}
                            loading={loading}
                            pageCount={pagination.totalPages}
                            totalRows={pagination.total}
                            manualPagination
                            manualSorting
                            emptyTitle="Không tìm thấy người dùng"
                            emptyDescription="Thử thay đổi từ khóa hoặc điều chỉnh bộ lọc để mở rộng kết quả."
                        />
                    </div>
                </section>

                {/* Bulk actions */}
                <BulkActionToolbar
                    selectedCount={selectedUsers.size}
                    actions={[
                        {
                            label: 'Khóa đã chọn',
                            onClick: () => setConfirmDialog({ isOpen: true, type: 'bulkLock' }),
                            variant: 'destructive',
                            icon: <Lock className="h-4 w-4" />,
                        },
                        {
                            label: 'Mở khóa đã chọn',
                            onClick: () => setConfirmDialog({ isOpen: true, type: 'bulkUnlock' }),
                            icon: <Unlock className="h-4 w-4" />,
                        },
                    ]}
                    onClearSelection={clearSelection}
                />

                {/* Confirm dialog */}
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog({ isOpen: false, type: null })}
                    onConfirm={handleConfirmAction}
                    title={
                        confirmDialog.type === 'lock'
                            ? 'Khóa tài khoản'
                            : confirmDialog.type === 'unlock'
                                ? 'Mở khóa tài khoản'
                                : confirmDialog.type === 'bulkLock'
                                    ? `Khóa ${selectedUsers.size} tài khoản`
                                    : `Mở khóa ${selectedUsers.size} tài khoản`
                    }
                    description={
                        confirmDialog.type?.includes('bulk')
                            ? `Bạn có chắc muốn ${confirmDialog.type === 'bulkLock' ? 'khóa' : 'mở khóa'} ${selectedUsers.size} tài khoản đã chọn?`
                            : 'Bạn có chắc muốn thực hiện thao tác này?'
                    }
                    variant={confirmDialog.type?.includes('lock') ? 'destructive' : 'default'}
                    confirmText={confirmDialog.type?.includes('lock') ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
                    cancelText="Hủy"
                />

                {/* Detail panel */}
                <UserDetailPanel
                    user={selectedUser}
                    isOpen={showDetailPanel}
                    onClose={() => setShowDetailPanel(false)}
                    onRoleChange={handleRoleChange}
                />
            </div>
        </DashboardLayout>
    );
}
