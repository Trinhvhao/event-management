'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { useAuthStore } from '@/store/authStore';
import {
  Calendar,
  Award,
  Bell,
  Users,
  CheckCircle,
  Clock,
  UserCheck,
  ArrowUpRight,
  MapPin,
  Plus,
  ClipboardCheck,
  QrCode,
  BarChart3,
  Activity,
  ArrowRight,
  Sparkles,
  Building2,
  FileClock,
  Zap,
  TrendingUp,
  AlertCircle,
  BellRing,
  Eye,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { eventService } from '@/services/eventService';
import { statisticsService } from '@/services/statisticsService';
import { notificationService } from '@/services/notificationService';
import { trainingPointsService } from '@/services/trainingPointsService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Event, Notification } from '@/types';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    return response?.data?.error?.message || fallback;
  }
  return fallback;
};

const STATUS_BADGE: Record<string, string> = {
  upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  ongoing: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-300',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Sắp diễn ra',
  ongoing: 'Đang diễn ra',
  completed: 'Đã kết thúc',
  cancelled: 'Đã hủy',
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
};

const DONUT_COLORS = ['#00358F', '#F26600', '#94a3b8'];

const NOTIF_TYPE_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  registration_confirm: { icon: <CheckCircle size={13} />, color: '#00A651', label: 'Đăng ký' },
  checkin_success: { icon: <CheckCircle size={13} />, color: '#00A651', label: 'Check-in' },
  points_awarded: { icon: <Award size={13} />, color: '#F26600', label: 'Điểm RL' },
  training_points_awarded: { icon: <Award size={13} />, color: '#F26600', label: 'Điểm RL' },
  event_reminder: { icon: <BellRing size={13} />, color: '#00358F', label: 'Nhắc nhở' },
  feedback_request: { icon: <Activity size={13} />, color: '#7c3aed', label: 'Phản hồi' },
  event_update: { icon: <Zap size={13} />, color: '#00358F', label: 'Cập nhật' },
  event_cancelled: { icon: <AlertCircle size={13} />, color: '#dc2626', label: 'Hủy' },
};

const getRelativeTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return format(date, 'dd/MM');
  } catch {
    return '';
  }
};

const NOTIF_BG: Record<string, string> = {
  registration_confirm: 'bg-emerald-50',
  checkin_success: 'bg-emerald-50',
  points_awarded: 'bg-orange-50',
  training_points_awarded: 'bg-orange-50',
  event_reminder: 'bg-blue-50',
  feedback_request: 'bg-purple-50',
  event_update: 'bg-blue-50',
  event_cancelled: 'bg-red-50',
};

const NOTIF_BORDER: Record<string, string> = {
  registration_confirm: 'border-emerald-200',
  checkin_success: 'border-emerald-200',
  points_awarded: 'border-orange-200',
  training_points_awarded: 'border-orange-200',
  event_reminder: 'border-blue-200',
  feedback_request: 'border-purple-200',
  event_update: 'border-blue-200',
  event_cancelled: 'border-red-200',
};

function TodayFocusCard({ stats }: { stats: DashboardStats | null }) {
  const items = [
    {
      label: 'Sự kiện chờ duyệt',
      value: stats?.pendingEvents || 0,
      urgent: (stats?.pendingEvents || 0) > 0,
      href: '/dashboard/events/pending',
      color: '#F26600',
      bg: 'bg-orange-50',
      icon: <ClipboardCheck size={16} />,
    },
    {
      label: 'Check-in hôm nay',
      value: 0,
      href: '/dashboard/checkin',
      color: '#00A651',
      bg: 'bg-emerald-50',
      icon: <QrCode size={16} />,
    },
    {
      label: 'Điểm RL chưa cấp',
      value: 0,
      href: '/dashboard/admin/training-points',
      color: '#8b5cf6',
      bg: 'bg-purple-50',
      icon: <Award size={16} />,
    },
  ];

  return (
    <div className="rounded-[22px] border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F26600]/10">
            <Zap size={16} className="text-[#F26600]" />
          </div>
          <h3 className="text-sm font-black text-[var(--text-primary)]">Tập trung hôm nay</h3>
        </div>
        <span className="rounded-full bg-[#F26600]/10 px-2 py-0.5 text-[10px] font-bold text-[#F26600]">
          {items.length} tác vụ
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group flex items-center justify-between rounded-xl border border-[var(--border-light)] bg-[var(--bg-muted)]/50 p-3.5 transition-all hover:border-[color-mix(in_srgb,var(--color-brand-navy)_18%,transparent)] hover:bg-[var(--bg-muted)]"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                <div style={{ color: item.color }}>{item.icon}</div>
              </div>
              <span className="text-sm font-semibold text-[var(--text-secondary)]">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-black ${
                  item.urgent ? 'text-[#F26600]' : 'text-[var(--text-primary)]'
                }`}
              >
                {item.value}
              </span>
              <ChevronRight size={14} className="text-[var(--text-muted)] transition group-hover:text-[var(--color-brand-navy)]" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ActivityFeedPanel({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="rounded-[22px] border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00358F]/10">
            <Radio size={16} className="text-[#00358F]" />
          </div>
          <h3 className="text-sm font-black text-[var(--text-primary)]">Hoạt động gần đây</h3>
        </div>
        <Link
          href="/dashboard/notifications"
          className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-brand-navy)] transition hover:text-[#F26600]"
        >
          <Eye size={11} />
          Xem tất cả
        </Link>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-2.5">
          {notifications.slice(0, 5).map((notif) => {
            const meta = NOTIF_TYPE_ICONS[notif.type] || {
              icon: <Bell size={13} />,
              color: '#94a3b8',
              label: notif.type,
            };
            return (
              <div
                key={notif.id}
                className={`group flex items-start gap-3 rounded-xl border p-3 transition-all hover:bg-[var(--bg-muted)]/50 ${
                  notif.is_read
                    ? 'border-[var(--border-light)] bg-transparent'
                    : `${NOTIF_BG[notif.type] || 'bg-blue-50'} ${NOTIF_BORDER[notif.type] || 'border-blue-200'}`
                }`}
              >
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${meta.color}15`, color: meta.color }}
                >
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-[var(--text-primary)] leading-tight line-clamp-1">
                      {notif.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                      {getRelativeTime(notif.sent_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00358F]" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Bell className="h-8 w-8 text-[var(--text-muted)]" />
          <p className="text-xs text-[var(--text-muted)] text-center">
            Không có hoạt động gần đây
          </p>
          <Link
            href="/dashboard/notifications"
            className="mt-1 text-[11px] font-semibold text-[var(--color-brand-navy)] hover:text-[#F26600]"
          >
            Xem thông báo
          </Link>
        </div>
      )}
    </div>
  );
}

interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  completedEvents: number;
  totalUsers: number;
  totalStudents: number;
  totalOrganizers: number;
  totalRegistrations: number;
  totalAttendances: number;
  totalDepartments: number;
  pendingEvents: number;
  recentEvents: Event[];
  recentNotifications: Notification[];
  trainingPoints?: number;
  unreadNotifications?: number;
}

function StatCard({
  label,
  value,
  icon,
  color,
  highlight,
  hint,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[26px] border bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${
        highlight
          ? 'border-[var(--color-brand-navy)] border-2 shadow-lg'
          : 'border-[var(--border-default)]'
      }`}
    >
      {highlight && (
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-[26px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
      )}
      {!highlight && (
        <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-[26px]" style={{ background: color }} />
      )}
      <div className="flex items-start justify-between gap-4 mt-1">
        <div className="flex-1 min-w-0">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[var(--text-muted)]">{label}</p>
          <p className="text-3xl font-black text-[var(--text-primary)] tracking-[-0.04em] leading-none">{value}</p>
          {hint && (
            <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">
              {hint}
            </p>
          )}
        </div>
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm"
          style={{ background: `${color}12` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[30px] border border-[var(--border-default)] bg-white p-6 shadow-[var(--shadow-card)] ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-4">
        <PieChart width={140} height={140}>
          <Pie
            data={[{ name: 'empty', value: 1 }]}
            cx={70}
            cy={70}
            innerRadius={45}
            outerRadius={60}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
        <p className="text-xs text-[var(--text-muted)] mt-2">Chưa có dữ liệu</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-extrabold text-[var(--text-primary)]">{total}</span>
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Sự kiện</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 flex-1">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)] truncate">{item.name}</span>
                <span className="text-xs font-bold text-[var(--text-primary)] ml-2 shrink-0">{item.value}</span>
              </div>
              <div className="h-1.5 bg-[var(--bg-muted)] rounded-full mt-1 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, background: item.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (user.role === 'admin') {
        const [eventsRes, statsRes, pendingRes, notifsRes] = await Promise.all([
          eventService.getAll({ limit: 5 }),
          statisticsService.getDashboard(),
          eventService.getPending({ limit: 1 }).catch(() => ({ data: { items: [], pagination: { total: 0 } } })),
          notificationService.getAll({ limit: 5 }).catch(() => ({ notifications: [] })),
        ]);

        const events: Event[] = eventsRes.data?.items || eventsRes.data || [];
        const dashboardStats = (statsRes as any)?.data ?? statsRes ?? {};
        const eventsByStatusArr: Array<{ status: string; count: number }> = dashboardStats.eventsByStatus || [];
        const usersByRole = dashboardStats.usersByRole || [];

        const eventsByStatusMap: Record<string, number> = {};
        for (const row of eventsByStatusArr) {
            eventsByStatusMap[row.status] = row.count;
        }

        const findRoleCount = (role: string) => {
          return Array.isArray(usersByRole)
            ? usersByRole.find((u: { role: string; count: number }) => u.role === role)?.count || 0
            : 0;
        };

        const pendingTotal = pendingRes?.data?.pagination?.total || 0;
        const notifications = (notifsRes as any)?.notifications ?? (notifsRes as any)?.data ?? [];

        setStats({
          totalEvents: dashboardStats.totalEvents || events.length,
          upcomingEvents: eventsByStatusMap.upcoming || eventsByStatusMap.approved || 0,
          ongoingEvents: eventsByStatusMap.ongoing || 0,
          completedEvents: eventsByStatusMap.completed || 0,
          totalUsers: dashboardStats.totalUsers || 0,
          totalStudents: findRoleCount('student'),
          totalOrganizers: findRoleCount('organizer'),
          totalRegistrations: dashboardStats.totalRegistrations || 0,
          totalAttendances: dashboardStats.totalAttendances || 0,
          totalDepartments: 0,
          pendingEvents: pendingTotal,
          recentEvents: events.slice(0, 5),
          recentNotifications: Array.isArray(notifications) ? notifications.slice(0, 5) : [],
          trainingPoints: 0,
          unreadNotifications: 0,
        });
      } else if (user.role === 'organizer') {
        const [myEventsRes, statsRes] = await Promise.all([
          eventService.getMyEvents(),
          statisticsService.getOrganizerStats(),
        ]);

        const myEvents: Event[] = myEventsRes.data || myEventsRes || [];
        const organizerStats = (statsRes as any)?.data ?? statsRes ?? {};
        const orgEventsByStatus: Record<string, number> = organizerStats.eventsByStatus || {};

        setStats({
          totalEvents: organizerStats.totalEvents || myEvents.length,
          upcomingEvents: orgEventsByStatus.upcoming || myEvents.filter((e) => e.status === 'upcoming').length,
          ongoingEvents: orgEventsByStatus.ongoing || myEvents.filter((e) => e.status === 'ongoing').length,
          completedEvents: orgEventsByStatus.completed || myEvents.filter((e) => e.status === 'completed').length,
          totalUsers: 0,
          totalStudents: 0,
          totalOrganizers: 0,
          totalRegistrations: organizerStats.totalRegistrations || 0,
          totalAttendances: organizerStats.totalAttendances || 0,
          totalDepartments: 0,
          pendingEvents: 0,
          recentEvents: myEvents.slice(0, 5),
          trainingPoints: 0,
          unreadNotifications: 0,
        });
      } else {
        const [eventsRes, myPointsRes, unreadNotifs] = await Promise.all([
          eventService.getAll({ status: 'upcoming', limit: 5 }),
          trainingPointsService.getMyPoints().catch(() => ({ grand_total: 0 })),
          notificationService.getUnreadCount().catch(() => 0),
        ]);

        const events: Event[] = eventsRes.data?.items || eventsRes.data || [];
        const pointsData = (myPointsRes as any)?.data ?? myPointsRes ?? {};
        const unreadCount = typeof unreadNotifs === 'number' ? unreadNotifs : (unreadNotifs as any)?.unread_count ?? (unreadNotifs as any)?.count ?? 0;
        setStats({
          totalEvents: events.length,
          upcomingEvents: events.length,
          ongoingEvents: 0,
          completedEvents: 0,
          totalUsers: 0,
          totalStudents: 0,
          totalOrganizers: 0,
          totalRegistrations: 0,
          totalAttendances: 0,
          totalDepartments: 0,
          pendingEvents: 0,
          recentEvents: events,
          trainingPoints: pointsData.grand_total || 0,
          unreadNotifications: unreadCount,
        });
      }
    } catch (error: unknown) {
      console.error('Error fetching dashboard data:', error);
      toast.error(getErrorMessage(error, 'Không thể tải dữ liệu dashboard'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    void fetchDashboardData();
  }, [isAuthenticated, isHydrated, router, fetchDashboardData]);

  if (!isHydrated || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (user?.role === 'admin') {
    const donutData = [
      { name: 'Sắp diễn ra', value: stats?.upcomingEvents || 0, color: DONUT_COLORS[0] },
      { name: 'Đang diễn ra', value: stats?.ongoingEvents || 0, color: DONUT_COLORS[1] },
      { name: 'Đã kết thúc', value: stats?.completedEvents || 0, color: DONUT_COLORS[2] },
    ];
    const checkInRate = stats?.totalRegistrations
      ? `${Math.round((stats.totalAttendances / stats.totalRegistrations) * 100)}%`
      : '0%';
    const quickActions = [
      {
        icon: <Plus className="h-5 w-5" />,
        label: 'Tạo sự kiện',
        description: 'Khởi tạo một sự kiện mới cho hệ thống',
        href: '/dashboard/events/create',
        color: '#00358F',
        surface: 'linear-gradient(135deg, rgba(0,53,143,0.16), rgba(174,204,255,0.18))',
      },
      {
        icon: <ClipboardCheck className="h-5 w-5" />,
        label: 'Phê duyệt sự kiện',
        description: `${stats?.pendingEvents || 0} sự kiện đang chờ xử lý`,
        href: '/dashboard/events/pending',
        color: '#F26600',
        surface: 'linear-gradient(135deg, rgba(242,102,0,0.15), rgba(255,184,0,0.18))',
      },
      {
        icon: <QrCode className="h-5 w-5" />,
        label: 'Check-in',
        description: 'Quản lý điểm danh và trạng thái tham dự',
        href: '/dashboard/checkin',
        color: '#00A651',
        surface: 'linear-gradient(135deg, rgba(0,166,81,0.14), rgba(174,255,216,0.2))',
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        label: 'Báo cáo',
        description: 'Xem thống kê vận hành và tăng trưởng',
        href: '/dashboard/admin/statistics',
        color: '#7c3aed',
        surface: 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(196,181,253,0.2))',
      },
    ];

    return (
      <DashboardLayout>
        <div className="mx-auto max-w-screen-2xl space-y-6">
          <section className="relative overflow-hidden rounded-[34px] border border-[#dbe6fb] bg-[radial-gradient(circle_at_top_left,_rgba(174,204,255,0.55),_transparent_34%),linear-gradient(135deg,_#ffffff_0%,_#f7faff_52%,_#eef4ff_100%)] p-6 shadow-[0_18px_50px_rgba(0,53,143,0.08)]">
            <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[rgba(242,102,0,0.08)] blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-[rgba(0,166,81,0.08)] blur-3xl" />
            <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6fb] bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-navy)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Bảng điều hành quản trị
                </div>
                <div className="space-y-2">
                  <h1 className="max-w-3xl text-3xl font-black tracking-[-0.05em] text-[var(--text-primary)] md:text-4xl">
                    Vận hành sự kiện, người dùng và phê duyệt trong một màn hình gọn.
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)] md:text-[15px]">
                    Theo dõi các chỉ số cốt lõi, ưu tiên sự kiện đang chờ duyệt và truy cập nhanh vào các luồng quản trị quan trọng mà không cần chuyển trang lòng vòng.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/80 bg-white/88 p-4 shadow-[var(--shadow-sm)]">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      <FileClock className="h-3.5 w-3.5 text-[var(--color-brand-orange)]" />
                      Chờ duyệt
                    </div>
                    <p className="text-3xl font-black tracking-[-0.05em] text-[var(--text-primary)]">{stats?.pendingEvents || 0}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Sự kiện cần admin xử lý ngay</p>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/88 p-4 shadow-[var(--shadow-sm)]">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      <Activity className="h-3.5 w-3.5 text-[var(--color-brand-green)]" />
                      Check-in rate
                    </div>
                    <p className="text-3xl font-black tracking-[-0.05em] text-[var(--text-primary)]">{checkInRate}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Tính trên tổng lượt đăng ký hiện có</p>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/88 p-4 shadow-[var(--shadow-sm)]">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      <Building2 className="h-3.5 w-3.5 text-[var(--color-brand-navy)]" />
                      Quy mô hệ thống
                    </div>
                    <p className="text-3xl font-black tracking-[-0.05em] text-[var(--text-primary)]">{stats?.totalUsers || 0}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Người dùng đang hoạt động trong hệ thống</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-[#dbe6fb] bg-[#0b3b97] p-5 text-white shadow-[0_20px_50px_rgba(0,53,143,0.22)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-blue-100/80">Tác vụ nhanh</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Ưu tiên điều phối</h2>
                  </div>
                  <div className="rounded-2xl bg-white/12 p-3">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {quickActions.slice(0, 2).map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="group flex items-center justify-between rounded-2xl border border-white/12 bg-white/8 px-4 py-3 transition hover:bg-white/12"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--color-brand-navy)] shadow-sm">
                          {action.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{action.label}</p>
                          <p className="text-xs text-blue-100/78">{action.description}</p>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-blue-100/70 transition group-hover:text-white" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tổng sự kiện"
              value={stats?.totalEvents || 0}
              icon={<Calendar size={22} />}
              color="#00358F"
              highlight
              hint={`${stats?.upcomingEvents || 0} sự kiện sắp diễn ra`}
            />
            <StatCard
              label="Sinh viên"
              value={stats?.totalStudents || 0}
              icon={<Users size={22} />}
              color="#00A651"
              hint={`${stats?.totalOrganizers || 0} ban tổ chức đang hoạt động`}
            />
            <StatCard
              label="Lượt Check-in"
              value={stats?.totalAttendances || 0}
              icon={<CheckCircle size={22} />}
              color="#F26600"
              hint={`${stats?.totalRegistrations || 0} lượt đăng ký đã ghi nhận`}
            />
            <StatCard
              label="Điểm RL đã cấp"
              value={stats?.trainingPoints || 0}
              icon={<Award size={22} />}
              color="#8b5cf6"
              hint="Tổng điểm rèn luyện đã phân bổ"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1.35fr)]">
            <SectionCard
              title="Phân bổ trạng thái sự kiện"
              subtitle="So sánh nhanh giữa sự kiện sắp diễn ra, đang vận hành và đã hoàn thành."
              action={
                <Link href="/dashboard/events" className="flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-navy)] transition-colors hover:text-[var(--color-brand-orange)]">
                  Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <DonutChart data={donutData} />
            </SectionCard>

            <SectionCard
              title="Sự kiện gần đây"
              subtitle="Những sự kiện mới nhất để bạn kiểm tra trạng thái, lịch và tình trạng phê duyệt."
              action={
                <Link href="/dashboard/events" className="flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-navy)] transition-colors hover:text-[var(--color-brand-orange)]">
                  Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              {stats?.recentEvents && stats.recentEvents.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      onClick={() => router.push(`/dashboard/events/${event.id}`)}
                      className="group flex items-center gap-4 rounded-2xl border border-[var(--border-light)] p-4 transition-all hover:border-[color-mix(in_srgb,var(--color-brand-navy)_18%,transparent)] hover:bg-[var(--bg-muted)]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                        <Calendar className="w-5 h-5 text-[var(--color-brand-navy)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--color-brand-navy)]">
                            {event.title}
                          </p>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE[event.status] || STATUS_BADGE.upcoming}`}>
                            {STATUS_LABELS[event.status] || event.status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(event.start_time), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.location}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--color-brand-navy)]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-10">
                  <Calendar className="h-8 w-8 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">Chưa có sự kiện nào</p>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <TodayFocusCard stats={stats} />
            <ActivityFeedPanel notifications={stats?.recentNotifications || []} />
          </div>

          <SectionCard
            title="Điều phối vận hành"
            subtitle="Các chỉ số theo dõi tổng thể để kiểm tra sức khỏe hệ thống và quy mô sử dụng."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Tổng đăng ký"
                value={stats?.totalRegistrations || 0}
                icon={<UserCheck size={22} />}
                color="#00358F"
                hint="Lượt đăng ký thành công trên toàn hệ thống"
              />
              <StatCard
                label="Tỷ lệ Check-in"
                value={checkInRate}
                icon={<CheckCircle size={22} />}
                color="#00A651"
                hint="Tỷ lệ tham dự trên tổng đăng ký"
              />
              <StatCard
                label="Người dùng"
                value={stats?.totalUsers || 0}
                icon={<Users size={22} />}
                color="#F26600"
                hint="Tổng tài khoản hiện có trong hệ thống"
              />
              <StatCard
                label="Ban tổ chức"
                value={stats?.totalOrganizers || 0}
                icon={<UserCheck size={22} />}
                color="#8b5cf6"
                hint="Tài khoản có quyền điều phối sự kiện"
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Phân tích bổ sung"
            subtitle="Biểu đồ xu hướng và phân bổ theo đơn vị để kiểm tra nhịp vận hành toàn hệ thống."
          >
            <DashboardCharts />
          </SectionCard>
        </div>
      </DashboardLayout>
    );
  }

  if (user?.role === 'organizer') {
    return (
      <DashboardLayout>
        <div className="space-y-5 max-w-screen-2xl mx-auto">

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Plus className="w-5 h-5" />, label: 'Tạo sự kiện', href: '/dashboard/events/create', color: '#00358F', bg: 'bg-[#00358F]' },
              { icon: <Calendar className="w-5 h-5" />, label: 'Sự kiện tôi', href: '/dashboard/my-events', color: '#00A651', bg: 'bg-[#00A651]' },
              { icon: <QrCode className="w-5 h-5" />, label: 'Check-in', href: '/dashboard/checkin', color: '#F26600', bg: 'bg-[#F26600]' },
              { icon: <BarChart3 className="w-5 h-5" />, label: 'Thống kê', href: '/dashboard/statistics', color: '#8b5cf6', bg: 'bg-[#8b5cf6]' },
            ].map(({ icon, label, href, bg }) => (
              <Link
                key={label}
                href={href}
                className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-[var(--shadow-brand)] shrink-0 ${bg}`}>
                  {icon}
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--color-brand-navy)] transition-colors">{label}</span>
              </Link>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Sự kiện của tôi" value={stats?.totalEvents || 0} icon={<Calendar size={22} />} color="#00358F" highlight />
            <StatCard label="Sắp diễn ra" value={stats?.upcomingEvents || 0} icon={<Clock size={22} />} color="#F26600" />
            <StatCard label="Tổng đăng ký" value={stats?.totalRegistrations || 0} icon={<UserCheck size={22} />} color="#00A651" />
            <StatCard label="Đã hoàn thành" value={stats?.completedEvents || 0} icon={<CheckCircle size={22} />} color="#8b5cf6" />
          </div>

          {/* My Events */}
          <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Sự kiện của tôi</h3>
              <Link href="/dashboard/my-events" className="text-xs font-semibold text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] flex items-center gap-1 transition-colors">
                Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {stats?.recentEvents && stats.recentEvents.length > 0 ? (
              <div className="space-y-2">
                {stats.recentEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => router.push(`/dashboard/events/${event.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-muted)] cursor-pointer transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-[var(--color-brand-navy)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-brand-navy)] transition-colors truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {format(new Date(event.start_time), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border shrink-0 ${STATUS_BADGE[event.status] || STATUS_BADGE.upcoming}`}>
                      {STATUS_LABELS[event.status] || event.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Calendar className="w-8 h-8 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-muted)]">Chưa có sự kiện nào</p>
                <Link href="/dashboard/events/create" className="mt-2 text-sm font-semibold text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]">
                  Tạo sự kiện mới
                </Link>
              </div>
            )}
          </div>

        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-screen-2xl mx-auto">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Sự kiện sắp tới" value={stats?.upcomingEvents || 0} icon={<Calendar size={22} />} color="#00358F" highlight />
          <StatCard label="Đã đăng ký" value={stats?.totalRegistrations || 0} icon={<CheckCircle size={22} />} color="#F26600" />
          <StatCard label="Điểm rèn luyện" value={stats?.trainingPoints || 0} icon={<Award size={22} />} color="#00A651" />
          <StatCard label="Thông báo" value={stats?.unreadNotifications || 0} icon={<Bell size={22} />} color="#FF4000" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Calendar className="w-5 h-5" />, label: 'Đăng ký sự kiện', href: '/dashboard/events', color: '#00358F' },
            { icon: <CheckCircle className="w-5 h-5" />, label: 'Sự kiện đã đăng ký', href: '/dashboard/my-registrations', color: '#F26600' },
            { icon: <Award className="w-5 h-5" />, label: 'Xem điểm RL', href: '/dashboard/training-points', color: '#00A651' },
            { icon: <Bell className="w-5 h-5" />, label: 'Thông báo', href: '/dashboard/notifications', color: '#FF4000' },
          ].map(({ icon, label, href, color }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-[var(--shadow-brand)]"
                style={{ background: color }}
              >
                {icon}
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-brand-navy)] transition-colors">
                {label}
              </span>
            </Link>
          ))}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Sự kiện dành cho bạn</h3>
            <Link href="/dashboard/events" className="text-xs font-semibold text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] flex items-center gap-1 transition-colors">
              Khám phá thêm <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {stats?.recentEvents && stats.recentEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {stats.recentEvents.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  onClick={() => router.push(`/dashboard/events/${event.id}`)}
                  className="p-4 rounded-xl border border-[var(--border-default)] hover:border-[var(--color-brand-navy)] hover:shadow-[var(--shadow-card-hover)] cursor-pointer transition-all group"
                >
                  <div className="mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_BADGE[event.status] || STATUS_BADGE.upcoming}`}>
                      {STATUS_LABELS[event.status] || event.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--color-brand-navy)] transition-colors line-clamp-2 mb-2">
                    {event.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{format(new Date(event.start_time), 'dd/MM/yyyy', { locale: vi })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-brand-gold)] font-bold">
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    <span>+{event.training_points} ĐRL</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Calendar className="w-8 h-8 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-muted)]">Chưa có sự kiện nào</p>
              <Link href="/dashboard/events" className="mt-2 text-sm font-semibold text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)]">
                Khám phá sự kiện
              </Link>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
