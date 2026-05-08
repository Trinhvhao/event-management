'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Loader2, UserCheck, UserX, UserCog, FileCheck, FileX, LogIn, LogOut, Award, Calendar } from 'lucide-react';
import { eventTeamService, EventTeamActivity } from '@/services/eventTeamService';
import { toast } from 'sonner';

interface ActivityLogTabProps {
    eventId: number;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    team_member_added: {
        label: 'Thêm thành viên',
        icon: UserCheck,
        color: 'green',
    },
    team_member_removed: {
        label: 'Xóa thành viên',
        icon: UserX,
        color: 'red',
    },
    team_member_role_changed: {
        label: 'Đổi vai trò',
        icon: UserCog,
        color: 'blue',
    },
    registration_approved: {
        label: 'Duyệt đăng ký',
        icon: FileCheck,
        color: 'green',
    },
    registration_rejected: {
        label: 'Từ chối đăng ký',
        icon: FileX,
        color: 'red',
    },
    attendee_checked_in: {
        label: 'Check-in',
        icon: LogIn,
        color: 'green',
    },
    attendee_checked_out: {
        label: 'Check-out',
        icon: LogOut,
        color: 'orange',
    },
    points_awarded: {
        label: 'Cấp điểm',
        icon: Award,
        color: 'blue',
    },
    event_updated: {
        label: 'Cập nhật sự kiện',
        icon: Calendar,
        color: 'gray',
    },
    event_cancelled: {
        label: 'Hủy sự kiện',
        icon: Calendar,
        color: 'red',
    },
    event_published: {
        label: 'Công bố sự kiện',
        icon: Calendar,
        color: 'green',
    },
    registration_cancelled: {
        label: 'Hủy đăng ký',
        icon: FileX,
        color: 'orange',
    },
};

const colorMap: Record<string, string> = {
    green: 'bg-[color-mix(in_srgb,var(--color-brand-green)_12%,transparent)] text-[var(--color-brand-green)]',
    red: 'bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] text-[var(--color-brand-red)]',
    blue: 'bg-[color-mix(in_srgb,var(--color-brand-navy)_12%,transparent)] text-[var(--color-brand-navy)]',
    orange: 'bg-[color-mix(in_srgb,#f97316_12%,transparent)] text-[#f97316]',
    gray: 'bg-[color-mix(in_srgb,var(--color-brand-gray)_12%,transparent)] text-[var(--color-brand-gray)]',
};

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getActivityDescription(activity: EventTeamActivity): string {
    const meta = activity.metadata || {};
    switch (activity.action_type) {
        case 'team_member_added':
            return `Thêm ${activity.target?.full_name || 'thành viên'} vào team`;
        case 'team_member_removed':
            return `Xóa ${activity.target?.full_name || 'thành viên'} khỏi team`;
        case 'team_member_role_changed':
            if (meta.action === 'transfer_main_organizer') {
                return `Chuyển quyền chủ sự kiện cho ${activity.target?.full_name || 'thành viên'}`;
            }
            return `Đổi vai trò ${activity.target?.full_name || 'thành viên'} thành ${meta.new_role === 'main_organizer' ? 'Main Organizer' : 'Helper'}`;
        case 'registration_approved':
            return `Duyệt đăng ký của ${meta.user_name || 'người dùng'}`;
        case 'registration_rejected':
            return `Từ chối đăng ký của ${meta.user_name || 'người dùng'}${meta.note ? `: "${meta.note}"` : ''}`;
        case 'attendee_checked_in':
            return `Check-in ${meta.user_name || 'người dùng'}`;
        case 'attendee_checked_out':
            return meta.action === 'undo_attendance'
                ? `Hủy điểm danh của ${meta.user_name || 'người dùng'}`
                : `Check-out ${meta.user_name || 'người dùng'}`;
        case 'points_awarded':
            return `Cấp điểm rèn luyện cho ${meta.user_name || 'người dùng'}`;
        case 'event_updated':
            return `Cập nhật thông tin sự kiện`;
        case 'event_cancelled':
            return `Hủy sự kiện`;
        case 'event_published':
            return `Công bố sự kiện`;
        case 'registration_cancelled':
            return `Hủy đăng ký của ${meta.user_name || 'người dùng'}`;
        default:
            return activity.action_type;
    }
}

export function ActivityLogTab({ eventId }: ActivityLogTabProps) {
    const [activities, setActivities] = useState<EventTeamActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [total, setTotal] = useState(0);

    const loadActivities = useCallback(async (pageNum: number, append = false) => {
        try {
            if (append) setLoadingMore(true);
            const result = await eventTeamService.getActivityLog(eventId, {
                page: pageNum,
                limit: 30,
            });
            if (append) {
                setActivities((prev) => [...prev, ...result.data]);
            } else {
                setActivities(result.data);
            }
            setTotal(result.pagination.total);
            setHasMore(result.pagination.page < result.pagination.totalPages);
            setPage(pageNum);
        } catch (error) {
            toast.error('Không thể tải nhật ký hoạt động');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [eventId]);

    useEffect(() => {
        void loadActivities(1);
    }, [loadActivities]);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            void loadActivities(page + 1, true);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-[var(--text-secondary)] animate-spin" />
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-12">
                <Activity className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">Chưa có hoạt động nào</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    Nhật ký hoạt động sẽ hiển thị khi có thành viên thực hiện hành động
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[var(--color-brand-navy)]" />
                        Nhật ký hoạt động
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {total} hoạt động
                    </p>
                </div>
            </div>

            <div className="space-y-1">
                {activities.map((activity) => {
                    const config = ACTION_CONFIG[activity.action_type] || {
                        label: activity.action_type,
                        icon: Activity,
                        color: 'gray',
                    };
                    const Icon = config.icon;

                    return (
                        <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--bg-muted)]/50 transition-colors group"
                        >
                            <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colorMap[config.color]}`}
                            >
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm text-[var(--text-primary)]">{getActivityDescription(activity)}</p>
                                    <span
                                        className="text-xs text-[var(--text-muted)] flex-shrink-0"
                                        title={formatTime(activity.created_at)}
                                    >
                                        {formatRelativeTime(activity.created_at)}
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    bởi <span className="font-medium text-[var(--text-secondary)]">{activity.actor.full_name}</span>
                                    {activity.target && activity.target.id !== activity.actor_id && (
                                        <span> · mục tiêu: {activity.target.full_name}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {hasMore && (
                <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-dashed border-[var(--border-default)] rounded-xl hover:border-[var(--color-brand-navy)]/40 transition-colors disabled:opacity-50"
                >
                    {loadingMore ? 'Đang tải...' : 'Xem thêm'}
                </button>
            )}
        </div>
    );
}
