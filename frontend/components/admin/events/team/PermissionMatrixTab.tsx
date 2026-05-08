'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Shield, Check, X, Loader2 } from 'lucide-react';
import { eventTeamService, PermissionMatrix } from '@/services/eventTeamService';
import { toast } from 'sonner';

interface PermissionMatrixTabProps {
    eventId: number;
}

const ALL_PERMISSIONS = [
    { key: 'manage_event', label: 'Quản lý sự kiện', description: 'Tạo, sửa, xóa thông tin sự kiện' },
    { key: 'checkin', label: 'Check-in', description: 'Quét QR hoặc check-in thủ công' },
    { key: 'view_feedback', label: 'Xem feedback', description: 'Xem đánh giá và nhận xét của sự kiện' },
    { key: 'manage_registrations', label: 'Quản lý đăng ký', description: 'Duyệt/từ chối đơn đăng ký' },
    { key: 'award_points', label: 'Cấp điểm rèn luyện', description: 'Trao điểm cho người tham gia' },
];

const ROLE_CONFIG = {
    main_organizer: {
        label: 'Main Organizer',
        description: 'Người tổ chức chính — quyền mặc định cao nhất',
        color: 'navy',
    },
    helper: {
        label: 'Helper',
        description: 'Người hỗ trợ — quyền mặc định hạn chế hơn',
        color: 'gray',
    },
};

export function PermissionMatrixTab({ eventId }: PermissionMatrixTabProps) {
    const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null); // track which permission is being updated

    const loadMatrix = useCallback(async () => {
        try {
            setLoading(true);
            const data = await eventTeamService.getPermissionMatrix(eventId);
            setMatrix(data);
        } catch (error) {
            toast.error('Không thể tải cấu hình quyền');
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        void loadMatrix();
    }, [loadMatrix]);

    const handleToggle = async (
        role: 'main_organizer' | 'helper',
        permission: string,
        currentAllowed: boolean
    ) => {
        const newAllowed = !currentAllowed;
        setUpdating(`${role}:${permission}`);

        // Optimistic update
        if (matrix) {
            setMatrix({
                ...matrix,
                matrix: {
                    ...matrix.matrix,
                    [role]: {
                        ...matrix.matrix[role],
                        [permission]: newAllowed,
                    },
                },
            });
        }

        try {
            const updated = await eventTeamService.updatePermission(eventId, role, permission, newAllowed);
            setMatrix(updated);
            toast.success(`Đã ${newAllowed ? 'bật' : 'tắt'} quyền "${ALL_PERMISSIONS.find(p => p.key === permission)?.label}" cho ${ROLE_CONFIG[role].label}`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Không thể cập nhật quyền');
            // Revert
            if (matrix) setMatrix(matrix);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-[var(--text-secondary)] animate-spin" />
            </div>
        );
    }

    if (!matrix) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-[var(--color-brand-navy)]" />
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                        Ma trận quyền hạn
                    </h2>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                    Cấu hình chi tiết quyền hạn cho từng vai trò trong sự kiện này. Thay đổi sẽ ghi đè lên quyền mặc định.
                </p>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className="text-left text-xs font-medium text-[var(--text-secondary)] pb-3 pr-4 w-1/3">
                                Quyền hạn
                            </th>
                            {(['main_organizer', 'helper'] as const).map((role) => (
                                <th key={role} className="text-center pb-3 px-2 min-w-[140px]">
                                    <div className="flex flex-col items-center gap-1">
                                        <span
                                            className={`text-sm font-bold ${
                                                role === 'main_organizer'
                                                    ? 'text-[var(--color-brand-navy)]'
                                                    : 'text-[var(--text-secondary)]'
                                            }`}
                                        >
                                            {ROLE_CONFIG[role].label}
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)] font-normal">
                                            {role === 'main_organizer' ? 'Mặc định: tất cả' : 'Mặc định: check-in & feedback'}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ALL_PERMISSIONS.map((perm) => (
                            <tr key={perm.key} className="border-t border-[var(--border-default)]/60">
                                <td className="py-3 pr-4">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">{perm.label}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{perm.description}</p>
                                    </div>
                                </td>
                                {(['main_organizer', 'helper'] as const).map((role) => {
                                    const allowed = matrix.matrix[role]?.[perm.key] ?? false;
                                    const isDefault = matrix.defaults[role].includes(perm.key);
                                    const isUpdating = updating === `${role}:${perm.key}`;

                                    return (
                                        <td key={role} className="py-3 px-2 text-center">
                                            <button
                                                onClick={() => !isUpdating && void handleToggle(role, perm.key, allowed)}
                                                disabled={isUpdating}
                                                className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                                                    isUpdating
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : allowed
                                                          ? 'bg-[color-mix(in_srgb,var(--color-brand-green)_15%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-brand-green)_25%,transparent)] cursor-pointer'
                                                          : 'bg-[color-mix(in_srgb,var(--color-brand-red)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-brand-red)_18%,transparent)] cursor-pointer'
                                                }`}
                                                title={
                                                    allowed
                                                        ? `${ROLE_CONFIG[role].label} có quyền "${perm.label}" — nhấn để tắt`
                                                        : `${ROLE_CONFIG[role].label} không có quyền "${perm.label}" — nhấn để bật`
                                                }
                                            >
                                                {isUpdating ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
                                                ) : allowed ? (
                                                    <Check className="w-4 h-4 text-[var(--color-brand-green)]" />
                                                ) : (
                                                    <X className="w-4 h-4 text-[var(--color-brand-red)]" />
                                                )}
                                                {!isDefault && !isUpdating && (
                                                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--color-brand-orange)]" title="Đã ghi đè" />
                                                )}
                                            </button>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                {isDefault ? 'mặc định' : 'tùy chỉnh'}
                                            </p>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Reset hint */}
            <p className="text-xs text-[var(--text-muted)]">
                Quyền mặc định có thể được khôi phục bằng cách tắt các quyền đã tùy chỉnh (đánh dấu cam).
            </p>
        </div>
    );
}
