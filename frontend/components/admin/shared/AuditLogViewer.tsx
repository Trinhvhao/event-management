'use client';

import React from 'react';
import { Clock, User, AlertTriangle, ShieldCheck, ArrowRight, Database, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLogEntry {
    id: string;
    action_type: string;
    admin_id: string;
    user_id: string | null;
    entity_type: string;
    entity_id: string;
    old_value: unknown;
    new_value: unknown;
    metadata: unknown;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    admin?: { full_name: string; email: string };
    user?: { full_name: string; email: string };
}

interface AuditLogViewerProps {
    logs: AuditLogEntry[];
    loading?: boolean;
    pagination?: {
        page: number;
        limit: number;
        total: number;
    };
    onPageChange?: (page: number) => void;
}

// Brand color mapping for action types
const ACTION_STYLES: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    role_changed:         { color: 'text-[#8b5cf6]',  bg: 'bg-[color-mix(in_srgb,#8b5cf6_8%,transparent)]',        icon: <ShieldCheck className="w-4 h-4" /> },
    user_locked:           { color: 'text-[var(--color-brand-red)]',   bg: 'bg-[color-mix(in_srgb,var(--color-brand-red)_8%,transparent)]',   icon: <AlertTriangle className="w-4 h-4" /> },
    user_unlocked:        { color: 'text-[var(--color-brand-green)]', bg: 'bg-[color-mix(in_srgb,var(--color-brand-green)_8%,transparent)]', icon: <ShieldCheck className="w-4 h-4" /> },
    organizer_granted:     { color: 'text-[var(--color-brand-orange)]', bg: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_8%,transparent)]', icon: <ShieldCheck className="w-4 h-4" /> },
    organizer_revoked:     { color: 'text-[var(--color-brand-red)]',   bg: 'bg-[color-mix(in_srgb,var(--color-brand-red)_8%,transparent)]',   icon: <AlertTriangle className="w-4 h-4" /> },
    category_created:      { color: 'text-[var(--color-brand-navy)]',  bg: 'bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)]',  icon: <ShieldCheck className="w-4 h-4" /> },
    category_updated:      { color: 'text-[var(--color-brand-orange)]', bg: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_8%,transparent)]', icon: <ShieldCheck className="w-4 h-4" /> },
    category_deleted:      { color: 'text-[var(--color-brand-red)]',   bg: 'bg-[color-mix(in_srgb,var(--color-brand-red)_8%,transparent)]',   icon: <AlertTriangle className="w-4 h-4" /> },
    department_created:    { color: 'text-[var(--color-brand-navy)]',  bg: 'bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)]',  icon: <ShieldCheck className="w-4 h-4" /> },
    department_updated:    { color: 'text-[var(--color-brand-orange)]', bg: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_8%,transparent)]', icon: <ShieldCheck className="w-4 h-4" /> },
    department_deleted:    { color: 'text-[var(--color-brand-red)]',   bg: 'bg-[color-mix(in_srgb,var(--color-brand-red)_8%,transparent)]',   icon: <AlertTriangle className="w-4 h-4" /> },
};

const ACTION_LABELS: Record<string, string> = {
    role_changed:          'Đổi vai trò',
    user_locked:           'Khóa tài khoản',
    user_unlocked:         'Mở khóa tài khoản',
    organizer_granted:     'Cấp quyền Organizer',
    organizer_revoked:     'Thu hồi quyền Organizer',
    category_created:      'Tạo danh mục',
    category_updated:      'Cập nhật danh mục',
    category_deleted:      'Xóa danh mục',
    department_created:    'Tạo khoa',
    department_updated:    'Cập nhật khoa',
    department_deleted:    'Xóa khoa',
};

const CRITICAL_ACTIONS = new Set([
    'user_locked', 'user_unlocked', 'organizer_revoked',
    'category_deleted', 'department_deleted',
]);

function getActionStyle(actionType: string) {
    return ACTION_STYLES[actionType] || {
        color: 'text-[var(--text-secondary)]',
        bg: 'bg-[var(--bg-muted)]',
        icon: <ShieldCheck className="w-4 h-4" />,
    };
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function LogEntry({ log }: { log: AuditLogEntry }) {
    const isCritical = CRITICAL_ACTIONS.has(log.action_type);
    const style = getActionStyle(log.action_type);
    const label = ACTION_LABELS[log.action_type] || log.action_type.replace(/_/g, ' ').toUpperCase();

    return (
        <div className={`rounded-xl border p-4 transition-colors ${
            isCritical
                ? 'border-[color-mix(in_srgb,var(--color-brand-red)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-brand-red)_4%,transparent)]'
                : 'border-[var(--border-default)] bg-white hover:border-[var(--color-brand-navy)]/20'
        }`}>

            {/* Action header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg} ${style.color}`}>
                        {style.icon}
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${isCritical ? 'text-[var(--color-brand-red)]' : style.color}`}>
                            {label}
                        </p>
                        {isCritical && (
                            <p className="text-xs text-[var(--color-brand-red)] font-medium">Thao tác quan trọng</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px] shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(log.created_at)}</span>
                </div>
            </div>

            {/* Actor & target */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-[var(--color-brand-navy)]" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wide">Người thực hiện</p>
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{log.admin?.full_name || '—'}</p>
                    </div>
                </div>
                {log.user && (
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[color-mix(in_srgb,var(--color-brand-orange)_8%,transparent)] flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-[var(--color-brand-orange)]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wide">Tác động đến</p>
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{log.user.full_name}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Changes diff */}
            {log.old_value !== null && log.new_value !== null && (
                <div className="rounded-lg bg-[var(--bg-muted)]/50 p-3 space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">Thay đổi</p>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--color-brand-red)_8%,transparent)] text-[var(--color-brand-red)] font-semibold shrink-0">
                            – {String(log.old_value)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--color-brand-green)_8%,transparent)] text-[var(--color-brand-green)] font-semibold shrink-0">
                            + {String(log.new_value)}
                        </span>
                    </div>
                </div>
            )}

            {/* Entity info */}
            <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                <span className="font-semibold uppercase tracking-wide">Entity:</span>
                <span>{log.entity_type}</span>
                <span className="text-[var(--border-default)]">|</span>
                <span className="font-semibold uppercase tracking-wide">ID:</span>
                <span>{log.entity_id}</span>
            </div>
        </div>
    );
}

export function AuditLogViewer({
    logs,
    loading = false,
    pagination,
    onPageChange,
}: AuditLogViewerProps) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-14">
                <div className="w-10 h-10 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                <span className="text-sm text-[var(--text-muted)] font-medium">Đang tải lịch sử hoạt động...</span>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-14">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                    <Database className="w-7 h-7 text-[var(--text-muted)]" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-[var(--text-secondary)]">Chưa có lịch sử hoạt động</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Các thay đổi sẽ được ghi lại tại đây.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {logs.map((log) => (
                <LogEntry key={log.id} log={log} />
            ))}

            {/* Pagination */}
            {pagination && onPageChange && Math.ceil(pagination.total / pagination.limit) > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                    <span className="text-xs text-[var(--text-muted)]">
                        Hiển thị {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} bản ghi
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-white text-[var(--text-muted)] transition-colors hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-white text-[var(--text-muted)] transition-colors hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
