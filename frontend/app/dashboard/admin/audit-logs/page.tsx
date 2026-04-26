'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Search, Calendar, X, SlidersHorizontal, RotateCcw, ChevronDown } from 'lucide-react';
import axios from '@/lib/axios';
import { DataTable } from '@/components/admin/shared/DataTable';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface AuditLogEntry {
    id: string;
    action_type: string;
    admin_id: number;
    user_id: number | null;
    entity_type: string;
    entity_id: number;
    old_value: unknown;
    new_value: unknown;
    metadata: unknown;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    admin?: { id: number; full_name: string; email: string };
    user?: { id: number; full_name: string; email: string };
}

interface AuditLogsResponse {
    data: AuditLogEntry[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const ACTION_STYLES: Record<string, { color: string; bg: string }> = {
    role_changed:          { color: 'text-purple-600',  bg: 'bg-purple-50' },
    user_locked:           { color: 'text-red-600',    bg: 'bg-red-50' },
    user_unlocked:         { color: 'text-green-600',  bg: 'bg-green-50' },
    organizer_granted:     { color: 'text-orange-600', bg: 'bg-orange-50' },
    organizer_revoked:     { color: 'text-red-600',    bg: 'bg-red-50' },
    category_created:      { color: 'text-blue-600',   bg: 'bg-blue-50' },
    category_updated:      { color: 'text-orange-600', bg: 'bg-orange-50' },
    category_deleted:      { color: 'text-red-600',    bg: 'bg-red-50' },
    department_created:   { color: 'text-blue-600',  bg: 'bg-blue-50' },
    department_updated:   { color: 'text-orange-600',bg: 'bg-orange-50' },
    department_deleted:   { color: 'text-red-600',   bg: 'bg-red-50' },
};

const ACTION_LABELS: Record<string, string> = {
    role_changed:          'Đổi vai trò',
    user_locked:           'Khóa TK',
    user_unlocked:         'Mở khóa TK',
    organizer_granted:     'Cấp Organizer',
    organizer_revoked:     'Thu hồi Organizer',
    category_created:      'Tạo danh mục',
    category_updated:      'Cập nhật DM',
    category_deleted:      'Xóa danh mục',
    department_created:    'Tạo khoa',
    department_updated:   'Cập nhật khoa',
    department_deleted:   'Xóa khoa',
};

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function ActionBadge({ actionType }: { actionType: string }) {
    const style = ACTION_STYLES[actionType] || { color: 'text-gray-600', bg: 'bg-gray-50' };
    const label = ACTION_LABELS[actionType] || actionType.replace(/_/g, ' ');
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${style.color} ${style.bg}`}>
            {label}
        </span>
    );
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
    const [totalRows, setTotalRows] = useState(0);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number | undefined> = {
                page: pagination.pageIndex + 1,
                limit: pagination.pageSize,
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;

            const response = await axios.get<AuditLogsResponse>('/admin/audit-logs', { params });
            setLogs(response.data.data);
            setTotalRows(response.data.pagination.total);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination, debouncedSearch, dateFrom, dateTo]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handlePaginationChange = (updater: any) => {
        setPagination((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            return next;
        });
    };

    const clearFilters = () => {
        setSearch('');
        setDateFrom('');
        setDateTo('');
    };

    const hasFilters = search || dateFrom || dateTo;

    const columns: ColumnDef<AuditLogEntry, unknown>[] = [
        {
            accessorKey: 'created_at',
            header: 'Ngày',
            cell: ({ row }) => (
                <span className="text-sm text-[var(--text-secondary)]">
                    {formatDate(row.original.created_at)}
                </span>
            ),
            meta: { headerClassName: 'min-w-[160px]', cellClassName: 'min-w-[160px]', align: 'left' as const },
        },
        {
            accessorKey: 'action_type',
            header: 'Hành động',
            cell: ({ row }) => <ActionBadge actionType={row.original.action_type} />,
            meta: { headerClassName: 'min-w-[140px]', cellClassName: 'min-w-[140px]', align: 'center' as const },
        },
        {
            accessorKey: 'admin',
            header: 'Admin',
            cell: ({ row }) => (
                <span className="font-medium text-sm truncate block max-w-[180px]" title={row.original.admin?.full_name || undefined}>
                    {row.original.admin?.full_name || '—'}
                </span>
            ),
            meta: { headerClassName: 'min-w-[160px]', cellClassName: 'min-w-[160px]', align: 'left' as const },
        },
        {
            accessorKey: 'user',
            header: 'User mục tiêu',
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[180px]" title={row.original.user?.full_name || undefined}>
                    {row.original.user?.full_name || '—'}
                </span>
            ),
            meta: { headerClassName: 'min-w-[150px]', cellClassName: 'min-w-[150px]', align: 'left' as const },
        },
        {
            accessorKey: 'entity_type',
            header: 'Entity',
            cell: ({ row }) => (
                <span className="text-xs font-medium px-2 py-1 bg-[var(--bg-muted)] rounded-md whitespace-nowrap">
                    {row.original.entity_type}
                </span>
            ),
            meta: { headerClassName: 'min-w-[120px]', cellClassName: 'min-w-[120px]', align: 'center' as const },
        },
        {
            accessorKey: 'old_value',
            header: 'Thay đổi',
            cell: ({ row }) => {
                const oldVal = row.original.old_value;
                const newVal = row.original.new_value;
                if (oldVal === null && newVal === null) return <span className="text-[var(--text-muted)]">—</span>;
                return (
                    <div className="flex items-center gap-1 text-xs whitespace-nowrap">
                        <span className="text-red-500 font-medium">{oldVal !== null ? String(oldVal) : ''}</span>
                        <span className="text-[var(--text-muted)]">→</span>
                        <span className="text-green-500 font-medium">{newVal !== null ? String(newVal) : ''}</span>
                    </div>
                );
            },
            meta: { headerClassName: 'min-w-[120px]', cellClassName: 'min-w-[120px]', align: 'left' as const },
        },
        {
            accessorKey: 'entity_id',
            header: 'ID',
            cell: ({ row }) => (
                <span className="text-xs text-[var(--text-muted)] font-mono">
                    #{row.original.entity_id}
                </span>
            ),
            meta: { headerClassName: 'min-w-[80px]', cellClassName: 'min-w-[80px]', align: 'left' as const },
        },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
                {/* Page header */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="p-6">
                        <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Nhật ký hoạt động</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Theo dõi tất cả thao tác của admin trên hệ thống
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <section className="rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                                <SlidersHorizontal className="w-4.5 h-4.5 text-[var(--color-brand-navy)]" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[var(--text-primary)]">Bộ lọc và tìm kiếm</h2>
                                <p className="text-xs text-[var(--text-muted)]">Tìm kiếm nhật ký hoạt động</p>
                            </div>
                        </div>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-red)]/30 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] px-4 py-2 text-xs font-bold text-[var(--color-brand-red)] shadow-sm transition-all hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] active:scale-95"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    <div className="mb-4">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Tìm kiếm</label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Nhập tên admin hoặc user..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-base pl-12 pr-10"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Date range filters */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Từ ngày</label>
                            <div className="relative">
                                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="input-base pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Đến ngày</label>
                            <div className="relative">
                                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="input-base pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Active filter summary */}
                    {hasFilters && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-muted)] px-4 py-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Bộ lọc:</span>
                            {search && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm border border-[var(--border-default)]">
                                    Tìm: &ldquo;{search}&rdquo;
                                </span>
                            )}
                            {dateFrom && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm border border-[var(--border-default)]">
                                    Từ: {dateFrom}
                                </span>
                            )}
                            {dateTo && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm border border-[var(--border-default)]">
                                    Đến: {dateTo}
                                </span>
                            )}
                        </div>
                    )}
                </section>

                {/* Data table */}
                <DataTable
                    columns={columns}
                    data={logs}
                    pagination={pagination}
                    onPaginationChange={handlePaginationChange}
                    loading={loading}
                    pageCount={Math.ceil(totalRows / pagination.pageSize) || 1}
                    totalRows={totalRows}
                    manualPagination
                    emptyTitle="Không có nhật ký hoạt động"
                    emptyDescription="Không tìm thấy bản ghi nào phù hợp với bộ lọc."
                />
            </div>
        </DashboardLayout>
    );
}
