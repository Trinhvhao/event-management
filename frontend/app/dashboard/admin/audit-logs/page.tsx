'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Search, Calendar, X } from 'lucide-react';
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
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${style.color} ${style.bg}`}>
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
        },
        {
            accessorKey: 'action_type',
            header: 'Hành động',
            cell: ({ row }) => <ActionBadge actionType={row.original.action_type} />,
        },
        {
            accessorKey: 'admin',
            header: 'Admin',
            cell: ({ row }) => (
                <span className="font-medium text-sm">
                    {row.original.admin?.full_name || '—'}
                </span>
            ),
        },
        {
            accessorKey: 'user',
            header: 'User mục tiêu',
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.user?.full_name || '—'}
                </span>
            ),
        },
        {
            accessorKey: 'entity_type',
            header: 'Entity',
            cell: ({ row }) => (
                <span className="text-xs font-medium px-2 py-1 bg-[var(--bg-muted)] rounded-md">
                    {row.original.entity_type}
                </span>
            ),
        },
        {
            accessorKey: 'old_value',
            header: 'Thay đổi',
            cell: ({ row }) => {
                const oldVal = row.original.old_value;
                const newVal = row.original.new_value;
                if (oldVal === null && newVal === null) return <span className="text-[var(--text-muted)]">—</span>;
                return (
                    <div className="flex items-center gap-1 text-xs">
                        <span className="text-red-500 font-medium">{oldVal !== null ? String(oldVal) : ''}</span>
                        <span className="text-[var(--text-muted)]">→</span>
                        <span className="text-green-500 font-medium">{newVal !== null ? String(newVal) : ''}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'entity_id',
            header: 'ID',
            cell: ({ row }) => (
                <span className="text-xs text-[var(--text-muted)] font-mono">
                    #{row.original.entity_id}
                </span>
            ),
        },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Page header */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Nhật ký hoạt động</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Theo dõi tất cả thao tác của admin trên hệ thống
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-[var(--color-brand-navy)] to-[var(--color-brand-orange)]" />
                    <div className="p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên admin hoặc user..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--border-default)] bg-white text-sm focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] transition-all"
                                />
                            </div>

                            {/* Date from */}
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="h-10 pl-10 pr-3 rounded-xl border border-[var(--border-default)] bg-white text-sm focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] transition-all"
                                />
                            </div>

                            {/* Date to */}
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">→</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="h-10 pl-8 pr-3 rounded-xl border border-[var(--border-default)] bg-white text-sm focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] transition-all"
                                />
                            </div>

                            {/* Clear filters */}
                            {hasFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:text-[var(--color-brand-navy)] hover:bg-[var(--bg-muted)] transition-all"
                                >
                                    <X className="w-4 h-4" />
                                    Xóa lọc
                                </button>
                            )}
                        </div>
                    </div>
                </div>

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
