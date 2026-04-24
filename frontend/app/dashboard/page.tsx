'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import {
  Calendar,
  Award,
  Bell,
  Users,
  CheckCircle,
  Clock,
  UserCheck,
  TrendingUp,
  ArrowUpRight,
  MapPin,
} from 'lucide-react';
import { eventService } from '@/services/eventService';
import { statisticsService } from '@/services/statisticsService';
import { notificationService } from '@/services/notificationService';
import { trainingPointsService } from '@/services/trainingPointsService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Event } from '@/types';

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
  trainingPoints?: number;
  unreadNotifications?: number;
}

function StatBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border-default)] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: color }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1.5">{label}</p>
          <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0" style={{ background: `${color}18` }}>
          <div style={{ color }}>{icon}</div>
        </div>
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
        const [eventsRes, statsRes] = await Promise.all([
          eventService.getAll({ limit: 5 }),
          statisticsService.getDashboard(),
        ]);

        const events: Event[] = eventsRes.data?.items || eventsRes.data || [];
        const dashboardStats = statsRes || {};
        const eventsByStatus = dashboardStats.events_by_status || {};
        const usersByRole = dashboardStats.users_by_role || [];

        const findRoleCount = (role: string) => {
          return Array.isArray(usersByRole)
            ? usersByRole.find((u: { role: string; count: number }) => u.role === role)?.count || 0
            : 0;
        };

        setStats({
          totalEvents: dashboardStats.total_events || events.length,
          upcomingEvents: eventsByStatus.upcoming || 0,
          ongoingEvents: eventsByStatus.ongoing || 0,
          completedEvents: eventsByStatus.completed || 0,
          totalUsers: dashboardStats.total_users || 0,
          totalStudents: findRoleCount('student'),
          totalOrganizers: findRoleCount('organizer'),
          totalRegistrations: dashboardStats.total_registrations || 0,
          totalAttendances: dashboardStats.total_attendances || 0,
          totalDepartments: 0,
          pendingEvents: 0,
          recentEvents: events.slice(0, 5),
          trainingPoints: dashboardStats.total_training_points_awarded || 0,
          unreadNotifications: 0,
        });
      } else if (user.role === 'organizer') {
        const [myEventsRes, statsRes] = await Promise.all([
          eventService.getMyEvents(),
          statisticsService.getOrganizerStats(),
        ]);

        const myEvents: Event[] = myEventsRes.data || myEventsRes || [];
        const organizerStats = statsRes || {};

        setStats({
          totalEvents: organizerStats.total_events || myEvents.length,
          upcomingEvents: organizerStats.events_by_status?.upcoming || myEvents.filter((e) => e.status === 'upcoming').length,
          ongoingEvents: organizerStats.events_by_status?.ongoing || myEvents.filter((e) => e.status === 'ongoing').length,
          completedEvents: organizerStats.events_by_status?.completed || myEvents.filter((e) => e.status === 'completed').length,
          totalUsers: 0,
          totalStudents: 0,
          totalOrganizers: 0,
          totalRegistrations: organizerStats.total_registrations || 0,
          totalAttendances: organizerStats.total_attendances || 0,
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
          trainingPoints: myPointsRes.grand_total || 0,
          unreadNotifications: unreadNotifs,
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
    return (
      <DashboardLayout>
        <div className="space-y-5 max-w-screen-2xl mx-auto">

          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
            <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[var(--color-brand-navy)] opacity-[0.03] pointer-events-none" />
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Dashboard</p>
                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                      Chào mừng, {user.full_name}!
                    </h1>
                    <p className="text-sm text-[var(--text-muted)]">Hệ thống quản lý sự kiện DaiNam</p>
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-3">
                  <Link
                    href="/dashboard/events/pending"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-default)] bg-white hover:bg-[var(--bg-muted)] transition-colors text-sm font-semibold text-[var(--text-secondary)] shadow-sm"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Kiểm duyệt sự kiện</span>
                    {(stats?.pendingEvents || 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[var(--color-brand-red)] text-white text-[10px] font-bold flex items-center justify-center">
                        {stats?.pendingEvents}
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox label="Tổng sự kiện" value={stats?.totalEvents || 0} icon={<Calendar size={20} />} color="#00358F" />
            <StatBox label="Sinh viên" value={stats?.totalStudents || 0} icon={<Users size={20} />} color="#00A651" />
            <StatBox label="Lượt Check-in" value={stats?.totalAttendances || 0} icon={<CheckCircle size={20} />} color="#F26600" />
            <StatBox label="Điểm RL đã cấp" value={stats?.trainingPoints || 0} icon={<Award size={20} />} color="#8b5cf6" />
          </div>

          {/* Events + Status distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Status distribution */}
            <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Phân bổ sự kiện</h3>
                <Link href="/dashboard/events" className="text-xs font-semibold text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] flex items-center gap-1 transition-colors">
                  Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Sắp diễn ra', value: stats?.upcomingEvents || 0, color: 'bg-blue-500', total: stats?.totalEvents || 1 },
                  { label: 'Đang diễn ra', value: stats?.ongoingEvents || 0, color: 'bg-emerald-500', total: stats?.totalEvents || 1 },
                  { label: 'Đã kết thúc', value: stats?.completedEvents || 0, color: 'bg-slate-400', total: stats?.totalEvents || 1 },
                ].map(({ label, value, color, total }) => {
                  const pct = Math.max(Math.round((value / total) * 100), 3);
                  return (
                    <div key={label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--text-secondary)]">{label}</span>
                        <span className="font-bold text-[var(--text-primary)]">{value}</span>
                      </div>
                      <div className="h-2 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Events */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Sự kiện gần đây</h3>
                <Link href="/dashboard/events" className="text-xs font-semibold text-[var(--color-brand-navy)] hover:text-[var(--color-brand-orange)] flex items-center gap-1 transition-colors">
                  Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {stats?.recentEvents && stats.recentEvents.length > 0 ? (
                <div className="space-y-3">
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
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {format(new Date(event.start_time), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${STATUS_BADGE[event.status] || STATUS_BADGE.upcoming}`}>
                        {STATUS_LABELS[event.status] || event.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Calendar className="w-8 h-8 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">Chưa có sự kiện nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox label="Tổng Đăng ký" value={stats?.totalRegistrations || 0} icon={<UserCheck size={20} />} color="#00358F" />
            <StatBox
              label="Tỷ lệ Check-in"
              value={stats?.totalRegistrations ? `${Math.round((stats.totalAttendances / stats.totalRegistrations) * 100)}%` : '0%'}
              icon={<CheckCircle size={20} />}
              color="#00A651"
            />
            <StatBox label="Người dùng" value={stats?.totalUsers || 0} icon={<Users size={20} />} color="#F26600" />
            <StatBox label="Ban tổ chức" value={stats?.totalOrganizers || 0} icon={<UserCheck size={20} />} color="#8b5cf6" />
          </div>

        </div>
      </DashboardLayout>
    );
  }

  if (user?.role === 'organizer') {
    return (
      <DashboardLayout>
        <div className="space-y-5 max-w-screen-2xl mx-auto">

          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Dashboard</p>
                  <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                    Chào mừng, {user.full_name}!
                  </h1>
                  <p className="text-sm text-[var(--text-muted)]">Quản lý sự kiện của bạn</p>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox label="Sự kiện của tôi" value={stats?.totalEvents || 0} icon={<Calendar size={20} />} color="#00358F" />
            <StatBox label="Sắp diễn ra" value={stats?.upcomingEvents || 0} icon={<Clock size={20} />} color="#F26600" />
            <StatBox label="Tổng đăng ký" value={stats?.totalRegistrations || 0} icon={<UserCheck size={20} />} color="#00A651" />
            <StatBox label="Đã hoàn thành" value={stats?.completedEvents || 0} icon={<CheckCircle size={20} />} color="#8b5cf6" />
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
              <div className="space-y-3">
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
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {format(new Date(event.start_time), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${STATUS_BADGE[event.status] || STATUS_BADGE.upcoming}`}>
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

        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Dashboard</p>
                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                  Chào mừng, {user?.full_name}!
                </h1>
                <p className="text-sm text-[var(--text-muted)]">Khám phá sự kiện và theo dõi điểm rèn luyện</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBox label="Sự kiện sắp tới" value={stats?.upcomingEvents || 0} icon={<Calendar size={20} />} color="#00358F" />
          <StatBox label="Đã đăng ký" value={stats?.totalRegistrations || 0} icon={<CheckCircle size={20} />} color="#F26600" />
          <StatBox label="Điểm rèn luyện" value={stats?.trainingPoints || 0} icon={<Award size={20} />} color="#00A651" />
          <StatBox label="Thông báo" value={stats?.unreadNotifications || 0} icon={<Bell size={20} />} color="#FF4000" />
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[event.status] || STATUS_BADGE.upcoming}`}>
                      {STATUS_LABELS[event.status] || event.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--color-brand-navy)] transition-colors line-clamp-2 mb-2">
                    {event.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mb-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{format(new Date(event.start_time), 'dd/MM/yyyy', { locale: vi })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mb-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-brand-gold)] font-bold">
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
