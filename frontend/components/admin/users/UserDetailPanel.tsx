'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, Mail, Building, Calendar, Shield, Activity, Lock, Unlock, User } from 'lucide-react';
import { AuditLogViewer } from '../shared/AuditLogViewer';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { adminService } from '@/services/adminService';

interface User {
    id: string;
    full_name: string;
    email: string;
    role: 'admin' | 'organizer' | 'student';
    department?: { id: string; name: string };
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

interface UserDetailPanelProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onRoleChange: (userId: string, newRole: string) => void;
}

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

const AUDIT_ACTION_OPTIONS = [
    { value: '', label: 'All actions' },
    { value: 'role_changed', label: 'Đổi vai trò' },
    { value: 'user_locked', label: 'Khóa tài khoản' },
    { value: 'user_unlocked', label: 'Mở khóa tài khoản' },
    { value: 'organizer_granted', label: 'Cấp organizer' },
    { value: 'organizer_revoked', label: 'Thu hồi organizer' },
];

const ROLE_OPTIONS = [
    { role: 'student',    label: 'Sinh viên',      color: 'navy',  icon: '👨‍🎓', badge: 'bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] text-[var(--color-brand-navy)]' },
    { role: 'organizer', label: 'Ban tổ chức',       color: 'orange', icon: '👔', badge: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,transparent)] text-[var(--color-brand-orange)]' },
    { role: 'admin',     label: 'Quản trị viên',   color: 'purple', icon: '⚡', badge: 'bg-[color-mix(in_srgb,#8b5cf6)_10%,transparent)] text-[#8b5cf6]' },
];

export function UserDetailPanel({ user, isOpen, onClose, onRoleChange }: UserDetailPanelProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'audit'>('info');
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditActionType, setAuditActionType] = useState('');
    const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [showRoleDialog, setShowRoleDialog] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');

    const fetchAuditLogs = useCallback(async () => {
        if (!user) return;
        setAuditLoading(true);
        try {
            const response = await adminService.getUserAuditLogs(user.id, {
                page: auditPagination.page,
                limit: auditPagination.limit,
                actionType: auditActionType || undefined,
            });
            setAuditLogs(response.data || []);
            setAuditPagination((prev) => ({
                ...prev,
                page: response.pagination?.page || prev.page,
                limit: response.pagination?.limit || prev.limit,
                total: response.pagination?.total || 0,
            }));
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setAuditLoading(false);
        }
    }, [user, auditPagination.page, auditPagination.limit, auditActionType]);

    useEffect(() => {
        if (!isOpen || !user) return;
        setAuditLogs([]);
        setAuditActionType('');
        setAuditPagination({ page: 1, limit: 20, total: 0 });
        setActiveTab('info');
    }, [user?.id, isOpen]);

    useEffect(() => {
        if (user && activeTab === 'audit') fetchAuditLogs();
    }, [user, activeTab, fetchAuditLogs]);

    const handleRoleChangeClick = (role: string) => {
        setSelectedRole(role);
        setShowRoleDialog(true);
    };

    const handleRoleChangeConfirm = async () => {
        if (!user) return;
        await onRoleChange(user.id, selectedRole);
        setShowRoleDialog(false);
    };

    if (!isOpen || !user) return null;

    const currentRole = ROLE_OPTIONS.find((r) => r.role === user.role);
    const getInitials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-50 overflow-hidden">
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />

                {/* Panel */}
                <div className="absolute right-0 top-0 h-full w-full max-w-2xl transform">
                    <div className="flex h-full flex-col bg-white shadow-2xl">

                        {/* Header */}
                        <div className="relative overflow-hidden border-b border-[var(--border-default)] px-6 py-5">
                            {/* Top accent gradient */}
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                            {/* Decorative orb */}
                            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--color-brand-navy)]/5 blur-3xl" />

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] text-lg font-bold text-white shadow-[var(--shadow-brand)]">
                                        {getInitials(user.full_name)}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Chi tiết người dùng</h2>
                                        <p className="text-xs text-[var(--text-muted)]">Xem và quản lý thông tin tài khoản</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-xl border border-[var(--border-default)] bg-white p-2 text-[var(--text-muted)] shadow-sm transition-all hover:border-[var(--color-brand-red)] hover:text-[var(--color-brand-red)] active:scale-95"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-[var(--border-default)] bg-[var(--bg-muted)]/50 px-6">
                            {[
                                { key: 'info',  label: 'Thông tin',  icon: User },
                                { key: 'audit', label: 'Lịch sử hoạt động', icon: Activity },
                            ].map(({ key, label, icon: TabIcon }) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key as 'info' | 'audit')}
                                    className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-colors ${activeTab === key ? 'text-[var(--color-brand-navy)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                >
                                    <TabIcon className="h-4 w-4" />
                                    {label}
                                    {activeTab === key && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand-navy)] rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-muted)]/20">
                            {activeTab === 'info' && (
                                <div className="space-y-5">
                                    {/* Profile card */}
                                    <div className="rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] text-2xl font-bold text-white shadow-[var(--shadow-brand)]">
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-extrabold text-[var(--text-primary)] truncate">{user.full_name}</h3>
                                                <p className="text-sm text-[var(--text-muted)] truncate">{user.email}</p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${user.is_active
                                                ? 'bg-[color-mix(in_srgb,var(--color-brand-green)_12%,transparent)] text-[var(--color-brand-green)]'
                                                : 'bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] text-[var(--color-brand-red)]'
                                                }`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-[var(--color-brand-green)]' : 'bg-[var(--color-brand-red)]'}`} />
                                                {user.is_active ? 'Hoạt động' : 'Đã khóa'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info grid */}
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {[
                                            { icon: Mail,    label: 'Email',        value: user.email,                                color: 'blue' },
                                            { icon: Building, label: 'Khoa',         value: user.department?.name || '—',             color: 'indigo' },
                                            { icon: Calendar, label: 'Ngày tham gia', value: new Date(user.created_at).toLocaleDateString('vi-VN'), color: 'emerald' },
                                            { icon: user.is_active ? Unlock : Lock, label: 'Đăng nhập gần nhất', value: user.last_login ? new Date(user.last_login).toLocaleString('vi-VN') : 'Chưa đăng nhập', color: 'amber' },
                                        ].map(({ icon: Icon, label, value, color }) => (
                                            <div key={label} className="rounded-xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-xs)]">
                                                <div className="flex items-start gap-3">
                                                    <div className={`rounded-lg p-2 bg-[color-mix(in_srgb,var(--color-brand-${color})_10%,transparent)]`}>
                                                        <Icon className="h-5 w-5 text-[var(--color-brand-${color})]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</p>
                                                        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)] truncate">{value}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Role Management */}
                                    <div className="rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                                        <div className="mb-4 flex items-center gap-3">
                                            <div className="rounded-lg bg-[color-mix(in_srgb,#8b5cf6)_10%,transparent] p-2">
                                                <Shield className="h-5 w-5 text-[#8b5cf6]" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[var(--text-primary)]">Vai trò hiện tại</h4>
                                                <p className="text-xs text-[var(--text-muted)]">Quản lý quyền truy cập</p>
                                            </div>
                                        </div>

                                        <div className="mb-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-muted)]/50 p-4">
                                            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Vai trò:</p>
                                            <p className="mt-1.5 text-lg font-extrabold capitalize text-[var(--text-primary)] flex items-center gap-2">
                                                <span>{currentRole?.icon}</span>
                                                {currentRole?.label}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Thay đổi vai trò</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                {ROLE_OPTIONS.map(({ role, label, icon, badge }) => {
                                                    const isCurrent = user.role === role;
                                                    return (
                                                        <button
                                                            key={role}
                                                            onClick={() => !isCurrent && handleRoleChangeClick(role)}
                                                            disabled={isCurrent}
                                                            className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                                                                isCurrent
                                                                    ? 'border-[var(--color-brand-navy)]/30 bg-[var(--bg-muted)]/50 cursor-not-allowed opacity-60'
                                                                    : 'border-[var(--border-default)] bg-white hover:border-[var(--color-brand-navy)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 active:scale-95'
                                                            }`}
                                                        >
                                                            <div className="text-2xl">{icon}</div>
                                                            <p className={`text-xs font-bold ${isCurrent ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>
                                                                {label}
                                                            </p>
                                                            {isCurrent && (
                                                                <span className="absolute right-2 top-2 rounded-full bg-[var(--color-brand-navy)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                                    ✓
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'audit' && (
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-xs)]">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Lọc:</label>
                                                <select
                                                    value={auditActionType}
                                                    onChange={(e) => {
                                                        setAuditActionType(e.target.value);
                                                        setAuditPagination((p) => ({ ...p, page: 1 }));
                                                    }}
                                                    className="input-base h-9 text-sm"
                                                >
                                                    {AUDIT_ACTION_OPTIONS.map((opt) => (
                                                        <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                onClick={fetchAuditLogs}
                                                className="btn btn-ghost btn-sm"
                                            >
                                                Làm mới
                                            </button>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
                                        <AuditLogViewer
                                            logs={auditLogs}
                                            loading={auditLoading}
                                            pagination={auditPagination}
                                            onPageChange={(page) => { if (page >= 1) setAuditPagination((p) => ({ ...p, page })); }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showRoleDialog}
                onClose={() => setShowRoleDialog(false)}
                onConfirm={handleRoleChangeConfirm}
                title="Xác nhận thay đổi vai trò"
                description={`Bạn có chắc muốn thay đổi vai trò của ${user.full_name} thành ${ROLE_OPTIONS.find((r) => r.role === selectedRole)?.label}?`}
                confirmText="Xác nhận thay đổi"
                variant="default"
            />
        </>
    );
}
