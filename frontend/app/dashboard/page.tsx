'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import {
    Calendar, Award, Bell, Users, Activity,
    CheckCircle, Clock, UserCheck, FileCheck, Download, AlertCircle
} from 'lucide-react';
import axios from '@/lib/axios';
import { toast } from 'sonner';

import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import StatCard from '@/components/dashboard/StatCard';
import RecentEvents from '@/components/dashboard/RecentEvents';
import SystemStats from '@/components/dashboard/SystemStats';
import EventsChart from '@/components/dashboard/EventsChart';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import RecentEventsTable from '@/components/dashboard/RecentEventsTable';
import ActivityLog from '@/components/dashboard/ActivityLog';
import TopPerformers from '@/components/dashboard/TopPerformers';
import UpcomingEvents from '@/components/dashboard/UpcomingEvents';
import ConversionFunnel from '@/components/dashboard/ConversionFunnel';

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
    recentEvents: any[];
    recentRegistrations: any[];
    eventsByStatus: Array<{ status: string; count: number }>;
    usersByRole: Array<{ role: string; count: number }>;
}

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        fetchDashboardData();
    }, [isAuthenticated, router]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            if (user?.role === 'admin') {
                const [eventsRes, usersRes, statsRes, pendingRes] = await Promise.all([
                    axios.get('/events?limit=5'),
                    axios.get('/admin/users?limit=100'),
                    axios.get('/statistics/dashboard'),
                    axios.get('/events/pending?limit=1'),
                ]);

                const events = eventsRes.data?.data?.items || [];
                const users = usersRes.data?.data?.items || [];
                const dashboardStats = statsRes.data?.data || {};
                const pendingEvents = pendingRes.data?.data?.pagination?.total || 0;

                // Parse eventsByStatus array to get counts
                const eventsByStatus = dashboardStats.eventsByStatus || [];
                const upcomingCount = eventsByStatus.find((e: any) => e.status === 'upcoming')?.count || 0;
                const ongoingCount = eventsByStatus.find((e: any) => e.status === 'ongoing')?.count || 0;
                const completedCount = eventsByStatus.find((e: any) => e.status === 'completed')?.count || 0;

                // Parse usersByRole array to get counts
                const usersByRole = dashboardStats.usersByRole || [];
                const studentCount = usersByRole.find((u: any) => u.role === 'student')?.count || 0;
                const organizerCount = usersByRole.find((u: any) => u.role === 'organizer')?.count || 0;

                setStats({
                    totalEvents: dashboardStats.totalEvents || 0,
                    upcomingEvents: upcomingCount,
                    ongoingEvents: ongoingCount,
                    completedEvents: completedCount,
                    totalUsers: dashboardStats.totalUsers || 0,
                    totalStudents: studentCount,
                    totalOrganizers: organizerCount,
                    totalRegistrations: dashboardStats.totalRegistrations || 0,
                    totalAttendances: dashboardStats.totalAttendances || 0,
                    totalDepartments: 5,
                    pendingEvents,
                    recentEvents: events.slice(0, 5),
                    recentRegistrations: [],
                    eventsByStatus: dashboardStats.eventsByStatus || [],
                    usersByRole: dashboardStats.usersByRole || [],
                });
            } else if (user?.role === 'organizer') {
                const [myEventsRes, statsRes] = await Promise.all([
                    axios.get('/events/my'),
                    axios.get('/statistics/my'),
                ]);

                const myEvents = myEventsRes.data?.data || [];
                const organizerStats = statsRes.data?.data || {};

                setStats({
                    totalEvents: organizerStats.totalEvents || myEvents.length,
                    upcomingEvents: organizerStats.eventsByStatus?.upcoming || 0,
                    ongoingEvents: organizerStats.eventsByStatus?.ongoing || 0,
                    completedEvents: organizerStats.eventsByStatus?.completed || 0,
                    totalUsers: 0,
                    totalStudents: 0,
                    totalOrganizers: 0,
                    totalRegistrations: organizerStats.totalRegistrations || 0,
                    totalAttendances: organizerStats.totalAttendances || 0,
                    totalDepartments: 0,
                    pendingEvents: 0,
                    recentEvents: myEvents.slice(0, 5),
                    recentRegistrations: [],
                    eventsByStatus: [
                        { status: 'upcoming', count: organizerStats.eventsByStatus?.upcoming || 0 },
                        { status: 'ongoing', count: organizerStats.eventsByStatus?.ongoing || 0 },
                        { status: 'completed', count: organizerStats.eventsByStatus?.completed || 0 },
                    ],
                    usersByRole: [],
                });
            } else {
                const [eventsRes, myRegistrationsRes] = await Promise.all([
                    axios.get('/events?status=upcoming&limit=5'),
                    axios.get('/registrations/my'),
                ]);

                const events = eventsRes.data?.data?.items || [];
                const myRegistrations = myRegistrationsRes.data?.data || [];

                setStats({
                    totalEvents: events.length,
                    upcomingEvents: events.length,
                    ongoingEvents: 0,
                    completedEvents: myRegistrations.filter((r: any) => r.event?.status === 'completed').length,
                    totalUsers: 0,
                    totalStudents: 0,
                    totalOrganizers: 0,
                    totalRegistrations: myRegistrations.length,
                    totalAttendances: myRegistrations.filter((r: any) => r.attendance).length,
                    totalDepartments: 0,
                    pendingEvents: 0,
                    recentEvents: events,
                    recentRegistrations: myRegistrations.slice(0, 5),
                    eventsByStatus: [],
                    usersByRole: [],
                });
            }
        } catch (error: any) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Không thể tải dữ liệu dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandBlue"></div>
                </div>
            </DashboardLayout>
        );
    }

    // Admin Dashboard
    if (user?.role === 'admin') {
        const adminQuickLinks = [
            {
                icon: <FileCheck className="w-4 h-4" />,
                text:
                    (stats?.pendingEvents || 0) > 0
                        ? `Có ${stats?.pendingEvents || 0} sự kiện đang chờ duyệt`
                        : 'Không có sự kiện chờ duyệt',
                href: '/dashboard/events/pending',
                badge: (stats?.pendingEvents || 0) > 0 ? stats?.pendingEvents : undefined,
            },
            {
                icon: <Download className="w-4 h-4" />,
                text: 'Xuất báo cáo điểm rèn luyện tháng này',
                href: '/dashboard/training-points/export',
            },
            {
                icon: <AlertCircle className="w-4 h-4" />,
                text: 'Xem thông báo hệ thống',
                href: '/dashboard/notifications',
            },
        ];

        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <WelcomeBanner userName={user.full_name} role={user.role} quickLinks={adminQuickLinks} />

                    {/* Main Stats with Trends */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            icon={Calendar}
                            label="Tổng sự kiện"
                            value={stats?.totalEvents || 0}
                            subtitle="Đang mở đăng ký / Đang diễn ra"
                            color="bg-brandBlue"
                            href="/dashboard/events"
                            index={0}
                            trend={{ value: 15, isPositive: true }}
                            sparklineData={[20, 35, 25, 45, 30, 50, 40]}
                        />
                        <StatCard
                            icon={UserCheck}
                            label="Lượt đăng ký / Check-in"
                            value={`${stats?.totalRegistrations || 0} / ${stats?.totalAttendances || 0}`}
                            subtitle="Tổng lượt tham gia"
                            color="bg-secondary"
                            href="/dashboard/statistics"
                            index={1}
                            trend={{ value: 8, isPositive: true }}
                            sparklineData={[30, 40, 35, 50, 45, 60, 55]}
                        />
                        <StatCard
                            icon={Users}
                            label="Sinh viên tham gia"
                            value={stats?.totalStudents || 0}
                            subtitle="Unique users"
                            color="bg-[#22c55e]"
                            href="/dashboard/admin/users"
                            index={2}
                            trend={{ value: 12, isPositive: true }}
                            sparklineData={[25, 30, 28, 40, 35, 45, 42]}
                        />
                        <StatCard
                            icon={Award}
                            label="Điểm rèn luyện"
                            value={stats?.totalAttendances ? stats.totalAttendances * 2 : 0}
                            subtitle="Đã cấp phát"
                            color="bg-[#8b5cf6]"
                            href="/dashboard/training-points"
                            index={3}
                            trend={{ value: 20, isPositive: true }}
                            sparklineData={[15, 25, 20, 35, 30, 40, 38]}
                        />
                    </div>

                    {/* Charts Section */}
                    <DashboardCharts />

                    {/* Recent Events Table */}
                    <RecentEventsTable />

                    {/* Middle Section - Conversion Funnel & Upcoming Events */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ConversionFunnel />
                        <UpcomingEvents />
                    </div>

                    {/* Bottom Section - 3 columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <ActivityLog />
                        <SystemStats
                            totalStudents={stats?.totalStudents || 0}
                            totalOrganizers={stats?.totalOrganizers || 0}
                            totalDepartments={stats?.totalDepartments || 5}
                        />
                        <TopPerformers />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Organizer Dashboard
    if (user?.role === 'organizer') {
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <WelcomeBanner userName={user.full_name} role={user.role} />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard icon={Calendar} label="Sự kiện của tôi" value={stats?.totalEvents || 0} color="bg-brandBlue" href="/dashboard/my-events" index={0} />
                        <StatCard icon={Clock} label="Sắp diễn ra" value={stats?.upcomingEvents || 0} color="bg-blue-500" href="/dashboard/my-events" index={1} />
                        <StatCard icon={UserCheck} label="Tổng đăng ký" value={stats?.totalRegistrations || 0} color="bg-[#22c55e]" href="/dashboard/statistics" index={2} />
                        <StatCard icon={CheckCircle} label="Đã hoàn thành" value={stats?.completedEvents || 0} color="bg-gray-500" href="/dashboard/my-events" index={3} />
                    </div>

                    {/* Charts Section */}
                    {stats?.eventsByStatus && stats.eventsByStatus.length > 0 && (
                        <EventsChart data={stats.eventsByStatus} />
                    )}

                    <RecentEvents events={stats?.recentEvents || []} />
                </div>
            </DashboardLayout>
        );
    }

    // Student Dashboard
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <WelcomeBanner userName={user?.full_name || 'Bạn'} role={user?.role || 'student'} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={Calendar} label="Sự kiện sắp tới" value={stats?.upcomingEvents || 0} color="bg-brandBlue" href="/dashboard/events" index={0} />
                    <StatCard icon={CheckCircle} label="Đã đăng ký" value={stats?.totalRegistrations || 0} color="bg-secondary" href="/dashboard/my-registrations" index={1} />
                    <StatCard icon={Award} label="Điểm rèn luyện" value={0} color="bg-[#22c55e]" href="/dashboard/training-points" index={2} />
                    <StatCard icon={Bell} label="Thông báo" value={0} color="bg-brandRed" href="/dashboard/notifications" index={3} />
                </div>

                <RecentEvents events={stats?.recentEvents || []} />
            </div>
        </DashboardLayout>
    );
}
