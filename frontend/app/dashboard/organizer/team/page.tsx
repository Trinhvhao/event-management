'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { eventService } from '@/services/eventService';
import { eventTeamService } from '@/services/eventTeamService';
import { Event, TeamMember } from '@/types';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    Users,
    Calendar,
    Shield,
    Loader2,
    ChevronRight,
    UserCog,
    Plus,
} from 'lucide-react';
import Link from 'next/link';

type TeamRole = 'main_organizer' | 'helper';

const ROLE_CONFIG: Record<TeamRole, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    main_organizer: {
        label: 'Trưởng ban',
        color: 'text-purple-700',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: <Shield className="w-3 h-3" />,
    },
    helper: {
        label: 'Thành viên',
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: <UserCog className="w-3 h-3" />,
    },
};

interface EventTeamGroup {
    event: Event;
    members: TeamMember[];
}

export default function OrganizerTeamPage() {
    const router = useRouter();
    const { user, isAuthenticated, isHydrated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [eventGroups, setEventGroups] = useState<EventTeamGroup[]>([]);

    const loadTeams = useCallback(async () => {
        try {
            setLoading(true);
            const myEvents: Event[] = Array.isArray(await eventService.getMyEvents())
                ? await eventService.getMyEvents()
                : [];

            const groups: EventTeamGroup[] = await Promise.all(
                myEvents.map(async (event) => {
                    try {
                        const members = await eventTeamService.getTeam(event.id);
                        return { event, members };
                    } catch {
                        return { event, members: [] as TeamMember[] };
                    }
                })
            );

            setEventGroups(groups.filter(g => g.members.length > 0));
        } catch (error) {
            console.error('Error loading teams:', error);
            toast.error('Không thể tải danh sách đội ngũ');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        if (user?.role !== 'organizer' && user?.role !== 'admin') {
            router.push('/dashboard'); return;
        }
        void loadTeams();
    }, [isHydrated, isAuthenticated, user?.role, router, loadTeams]);

    const totalMembers = eventGroups.reduce((sum, g) => sum + g.members.length, 0);
    const totalOrganizers = eventGroups.reduce(
        (sum, g) => sum + g.members.filter(m => m.role === 'main_organizer').length, 0
    );
    const totalHelpers = eventGroups.reduce(
        (sum, g) => sum + g.members.filter(m => m.role === 'helper').length, 0
    );
    const totalEventsWithTeam = eventGroups.length;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-6 flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-navy)]" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Đội ngũ của tôi</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Quản lý thành viên ban tổ chức trong các sự kiện của bạn
                        </p>
                    </div>
                    <Link
                        href="/dashboard/organizer/events"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-brand-navy)] text-white rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Quản lý sự kiện
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Tổng sự kiện',
                            value: totalEventsWithTeam,
                            icon: <Calendar className="w-5 h-5" />,
                            accent: 'bg-[var(--bg-muted)]',
                            accentColor: 'text-[var(--text-muted)]',
                        },
                        {
                            label: 'Tổng thành viên',
                            value: totalMembers,
                            icon: <Users className="w-5 h-5" />,
                            accent: 'bg-blue-50',
                            accentColor: 'text-blue-600',
                        },
                        {
                            label: 'Trưởng ban',
                            value: totalOrganizers,
                            icon: <Shield className="w-5 h-5" />,
                            accent: 'bg-purple-50',
                            accentColor: 'text-purple-600',
                        },
                        {
                            label: 'Thành viên',
                            value: totalHelpers,
                            icon: <UserCog className="w-5 h-5" />,
                            accent: 'bg-cyan-50',
                            accentColor: 'text-cyan-600',
                        },
                    ].map(({ label, value, icon, accent, accentColor }) => (
                        <div key={label} className={`rounded-2xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-card)] ${accent}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
                                <span className={accentColor}>{icon}</span>
                            </div>
                            <p className="text-2xl font-extrabold text-[var(--text-primary)]">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Team Groups by Event */}
                {eventGroups.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center mx-auto mb-5">
                            <Users className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Chưa có thành viên nào</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                            Thêm thành viên vào sự kiện của bạn từ trang quản lý sự kiện
                        </p>
                        <Link
                            href="/dashboard/organizer/events"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-brand-navy)] text-white rounded-xl text-sm font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all"
                        >
                            <Calendar className="w-4 h-4" />
                            Quản lý sự kiện
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {eventGroups.map(({ event, members }, idx) => {
                            const organizerCount = members.filter(m => m.role === 'main_organizer').length;
                            const helperCount = members.filter(m => m.role === 'helper').length;
                            return (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.06 }}
                                    className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden"
                                >
                                    {/* Event header */}
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center shrink-0">
                                                <Calendar className="w-5 h-5 text-[var(--text-muted)]" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{event.title}</p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ROLE_CONFIG.main_organizer.color}`}>
                                                        <Shield className="w-3 h-3" /> {organizerCount}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ROLE_CONFIG.helper.color}`}>
                                                        <UserCog className="w-3 h-3" /> {helperCount}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link
                                                href={`/dashboard/organizer/events/${event.id}/team`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all"
                                            >
                                                Quản lý
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Members list */}
                                    <div className="divide-y divide-[var(--border-light)]">
                                        {members.map(member => {
                                            const config = ROLE_CONFIG[member.role as TeamRole] || ROLE_CONFIG.helper;
                                            const isCurrentUser = member.user.id === user?.id;
                                            return (
                                                <div key={member.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-muted)] transition-colors">
                                                    <div className="w-9 h-9 rounded-full bg-[var(--color-brand-navy)] flex items-center justify-center shrink-0">
                                                        <span className="text-sm font-bold text-white">
                                                            {member.user.full_name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                                                                {member.user.full_name}
                                                            </p>
                                                            {isCurrentUser && (
                                                                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-brand-navy)] text-white">
                                                                    Bạn
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-[var(--text-muted)] truncate">
                                                            {member.user.student_id || member.user.email}
                                                        </p>
                                                    </div>
                                                    <div className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.color} ${config.border}`}>
                                                        {config.icon}
                                                        {config.label}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
