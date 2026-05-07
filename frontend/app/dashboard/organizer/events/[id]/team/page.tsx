'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { eventTeamService } from '@/services/eventTeamService';
import { eventService } from '@/services/eventService';
import { TeamMember } from '@/types';
import { toast } from 'sonner';
import { Loader2, Users, ArrowLeft, UserPlus } from 'lucide-react';
import { TeamMemberTable } from '@/components/admin/events/team/TeamMemberTable';
import { AddTeamMemberDialog } from '@/components/admin/events/team/AddTeamMemberDialog';
import Link from 'next/link';

export default function EventTeamPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isAuthenticated, isHydrated } = useAuthStore();
    const eventId = Number(params.id);

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventTitle, setEventTitle] = useState<string>('');
    const [showAddDialog, setShowAddDialog] = useState(false);

    const loadTeam = useCallback(async () => {
        try {
            setLoading(true);
            const data = await eventTeamService.getTeam(eventId);
            setMembers(data);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Không thể tải danh sách team');
            setMembers([]);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    const loadEvent = useCallback(async () => {
        try {
            const event = await eventService.getById(eventId);
            setEventTitle(event.title);
        } catch (error) {
            console.error('Failed to load event:', error);
        }
    }, [eventId]);

    useEffect(() => {
        if (isHydrated) {
            if (!isAuthenticated || user?.role === 'participant') {
                router.push('/login');
                return;
            }
            void loadTeam();
            void loadEvent();
        }
    }, [isHydrated, isAuthenticated, user, router, loadTeam, loadEvent]);

    const handleAddMember = async (userId: number, role: 'main_organizer' | 'helper') => {
        try {
            await eventTeamService.addTeamMember(eventId, userId, role);
            toast.success('Đã thêm thành viên vào team');
            await loadTeam();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Không thể thêm thành viên');
            throw error;
        }
    };

    const handleRemoveMember = async (userId: number) => {
        try {
            await eventTeamService.removeTeamMember(eventId, userId);
            toast.success('Đã xóa thành viên khỏi team');
            await loadTeam();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Không thể xóa thành viên');
            throw error;
        }
    };

    const handleUpdateRole = async (userId: number, role: 'main_organizer' | 'helper') => {
        try {
            await eventTeamService.updateTeamMemberRole(eventId, userId, role);
            toast.success('Đã cập nhật vai trò');
            await loadTeam();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Không thể cập nhật vai trò');
            throw error;
        }
    };

    if (!isHydrated || (isHydrated && !isAuthenticated)) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-[var(--text-secondary)] animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Breadcrumb + Header */}
                <div>
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-3 flex-wrap">
                        <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">Dashboard</Link>
                        <span>/</span>
                        <Link href="/dashboard/organizer" className="hover:text-[var(--text-primary)] transition-colors">Organizer</Link>
                        <span>/</span>
                        <Link href="/dashboard/organizer/events" className="hover:text-[var(--text-primary)] transition-colors">Sự kiện của tôi</Link>
                        <span>/</span>
                        <span className="text-[var(--text-primary)] font-medium truncate max-w-[200px]">{eventTitle || `Sự kiện #${eventId}`}</span>
                        <span>/</span>
                        <span className="text-[var(--color-brand-navy)] font-semibold">Đội ngũ</span>
                    </nav>

                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/organizer/events"
                            className="w-9 h-9 rounded-xl border border-[var(--border-default)] bg-white flex items-center justify-center hover:bg-[var(--bg-muted)] transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                                Quản lý đội ngũ
                            </h1>
                            {eventTitle && (
                                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                                    {eventTitle}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => setShowAddDialog(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            <UserPlus className="w-4 h-4" />
                            Thêm thành viên
                        </button>
                    </div>
                </div>

                {/* Team Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-[var(--border-default)] bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                                <Users className="w-5 h-5 text-[var(--color-brand-navy)]" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {members.length}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Thành viên
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border-default)] bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-green)_10%,transparent)] flex items-center justify-center">
                                <Users className="w-5 h-5 text-[var(--color-brand-green)]" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {members.filter((m) => m.role === 'main_organizer').length}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Main Organizer
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border-default)] bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-gray)_10%,transparent)] flex items-center justify-center">
                                <Users className="w-5 h-5 text-[var(--color-brand-gray)]" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {members.filter((m) => m.role === 'helper').length}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Helper
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Members List */}
                <div className="rounded-xl border border-[var(--border-default)] bg-white p-6">
                    <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">
                        Danh sách thành viên
                    </h2>
                    <TeamMemberTable
                        members={members}
                        loading={loading}
                        onRemove={handleRemoveMember}
                        onUpdateRole={handleUpdateRole}
                        currentUserId={user?.id || 0}
                    />
                </div>

                {/* Role Legend */}
                <div className="rounded-xl border border-[var(--border-default)] bg-white p-6">
                    <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">
                        Vai trò trong Team
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-navy)_15%,transparent)] flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Users className="w-4 h-4 text-[var(--color-brand-navy)]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">Main Organizer</p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Toàn quyền quản lý sự kiện: tạo, sửa, xóa, quản lý đăng ký, checkin, xem feedback, cộng điểm
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-gray)_15%,transparent)] flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Users className="w-4 h-4 text-[var(--color-brand-gray)]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">Helper</p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Chỉ có quyền checkin và xem feedback của sự kiện
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Team Member Dialog */}
            <AddTeamMemberDialog
                eventId={eventId}
                isOpen={showAddDialog}
                onClose={() => setShowAddDialog(false)}
                onAdd={handleAddMember}
            />
        </DashboardLayout>
    );
}
