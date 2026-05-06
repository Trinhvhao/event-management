'use client';

import React from 'react';
import { RoleBadge } from './RoleBadge';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Loader2, MoreHorizontal, Trash2, UserCog } from 'lucide-react';
import { TeamMember } from '@/types';

interface TeamMemberTableProps {
    members: TeamMember[];
    loading: boolean;
    onRemove: (userId: number) => Promise<void>;
    onUpdateRole: (userId: number, role: 'main_organizer' | 'helper') => Promise<void>;
    currentUserId: number;
}

export function TeamMemberTable({
    members,
    loading,
    onRemove,
    onUpdateRole,
    currentUserId,
}: TeamMemberTableProps) {
    const [openMenuId, setOpenMenuId] = React.useState<number | null>(null);
    const [removingMember, setRemovingMember] = React.useState<TeamMember | null>(null);
    const [removingLoading, setRemovingLoading] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Close menu on outside click
    React.useEffect(() => {
        if (!openMenuId) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [openMenuId]);

    const handleRemove = async () => {
        if (!removingMember) return;
        setRemovingLoading(true);
        try {
            await onRemove(removingMember.user_id);
        } finally {
            setRemovingLoading(false);
            setRemovingMember(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-[var(--text-secondary)] animate-spin" />
            </div>
        );
    }

    if (members.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-sm text-[var(--text-secondary)]">
                    Chưa có thành viên nào trong team.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {members.map((member) => (
                <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-default)] bg-white hover:border-[var(--color-brand-navy)]/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--color-brand-navy)_15%,transparent)] flex items-center justify-center">
                            <span className="text-sm font-bold text-[var(--color-brand-navy)]">
                                {member.user.full_name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                    {member.user.full_name}
                                </p>
                                {member.user_id === currentUserId && (
                                    <span className="text-xs text-[var(--text-secondary)]">(bạn)</span>
                                )}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                                {member.user.email}
                                {member.user.department && ` · ${member.user.department.name}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <RoleBadge role={member.role} />

                        {/* Actions Menu */}
                        <div className="relative" ref={openMenuId === member.id ? menuRef : null}>
                            <button
                                onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-muted)] transition-colors"
                            >
                                <MoreHorizontal className="w-4 h-4 text-[var(--text-secondary)]" />
                            </button>

                            {openMenuId === member.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-lg)] py-1 z-10 animate-scale-in">
                                    <button
                                        onClick={() => {
                                            setOpenMenuId(null);
                                            const newRole = member.role === 'main_organizer' ? 'helper' : 'main_organizer';
                                            void onUpdateRole(member.user_id, newRole);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                                    >
                                        <UserCog className="w-4 h-4" />
                                        Đổi thành {member.role === 'main_organizer' ? 'Helper' : 'Main Organizer'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setOpenMenuId(null);
                                            setRemovingMember(member);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-brand-red)] hover:bg-[var(--bg-muted)] transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Xóa khỏi team
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {/* Remove Confirmation Dialog */}
            <ConfirmDialog
                isOpen={removingMember !== null}
                onClose={() => setRemovingMember(null)}
                onConfirm={() => void handleRemove()}
                title="Xóa thành viên"
                description={
                    removingMember
                        ? `Bạn có chắc muốn xóa "${removingMember.user.full_name}" khỏi team không?`
                        : ''
                }
                confirmText="Xóa"
                variant="destructive"
                loading={removingLoading}
            />
        </div>
    );
}
