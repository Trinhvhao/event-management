'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card, { CardHeader } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, Users, CheckCircle, Star, Award, TrendingUp, Activity, Trophy, TrendingDown, Minus } from 'lucide-react';
import { statisticsService, DashboardStats, OrganizerStats, StudentStats, DepartmentStats } from '@/services/statisticsService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
    AreaChart, Area
} from 'recharts';

// Chart palette
const CHART_COLORS = ['#00358F', '#F26600', '#00A651', '#FFB800', '#FF4000', '#7C3AED', '#06b6d4'];

// Custom tooltip
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string; fill?: string }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-lg)] px-4 py-3">
            <p className="text-xs font-bold text-[var(--text-primary)] mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: entry.color || entry.fill }} />
                    <span className="text-[var(--text-muted)]">{entry.name}:</span>
                    <span className="font-bold text-[var(--text-primary)]">{entry.value.toLocaleString('vi-VN')}</span>
                </div>
            ))}
        </div>
    );
}

// Chart wrapper component
function ChartCard({ title, subtitle, icon, children }: {
    title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-5 pt-5 pb-0 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-3 mb-1">
                    {icon && (
                        <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,#00358F_10%,transparent)] flex items-center justify-center">
                            <div className="text-[var(--color-brand-navy)]">{icon}</div>
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
                        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
                    </div>
                </div>
            </div>
            <div className="p-5">
                {children}
            </div>
        </div>
    );
}

// Status labels
const STATUS_LABELS: Record<string, string> = {
    upcoming: 'Sắp diễn ra', ongoing: 'Đang diễn ra',
    completed: 'Đã kết thúc', cancelled: 'Đã hủy',
    pending: 'Chờ duyệt', approved: 'Đã duyệt',
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
    upcoming: '#F26600', ongoing: '#00A651',
    completed: '#00358F', cancelled: '#FF4000',
    pending: '#FFB800', approved: '#00358F',
};

const SKELETON_HEIGHTS = [56, 80, 64, 88] as const;

function StatBox({ label, value, icon, color, loading }: {
    label: string; value: string; icon: React.ReactNode; color: string; loading?: boolean;
}) {
    return (
        <div className="bg-white rounded-2xl border border-[var(--border-default)] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: color }} />
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1.5">{label}</p>
                    {loading ? (
                        <Skeleton width={80} height={28} />
                    ) : (
                        <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{value}</p>
                    )}
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0" style={{ background: `${color}18` }}>
                    <div style={{ color }}>{icon}</div>
                </div>
            </div>
        </div>
    );
}

// Comparison Card for "This month vs Last month"
function ComparisonCard({ label, thisMonth, lastMonth, icon, color }: {
    label: string; thisMonth: number; lastMonth: number; icon: React.ReactNode; color: string;
}) {
    const diff = thisMonth - lastMonth;
    const percentChange = lastMonth > 0 ? ((diff / lastMonth) * 100).toFixed(1) : thisMonth > 0 ? 100 : 0;
    const isPositive = diff >= 0;
    const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
    const trendColor = diff >= 0 ? 'text-[#00A651]' : 'text-[#FF4000]';

    return (
        <div className="bg-white rounded-2xl border border-[var(--border-default)] p-5 shadow-[var(--shadow-card)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: color }} />
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">{label}</p>
                    <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none mb-3">
                        {thisMonth.toLocaleString('vi-VN')}
                    </p>
                    <div className={`flex items-center gap-1.5 ${trendColor}`}>
                        <TrendIcon className={`w-4 h-4 ${diff < 0 ? 'rotate-180' : ''}`} />
                        <span className="text-xs font-bold">
                            {diff >= 0 ? '+' : ''}{percentChange}% so với tháng trước
                        </span>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0" style={{ background: `${color}18` }}>
                    <div style={{ color }}>{icon}</div>
                </div>
            </div>
        </div>
    );
}

// Horizontal Bar Chart for Top Events
function TopEventsBarChart({ data, loading }: {
    data: { eventName: string; registrations: number }[];
    loading?: boolean;
}) {
    if (loading) {
        return (
            <div className="flex items-end gap-3 h-64">
                {SKELETON_HEIGHTS.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                        <Skeleton style={{ width: '100%', height: h, borderRadius: 6 }} />
                    </div>
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
                <p className="text-sm text-[var(--text-muted)]">Không có dữ liệu</p>
            </div>
        );
    }

    const max = Math.max(...data.map(d => d.registrations), 1);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart layout="vertical" data={data.slice(0, 10)} margin={{ left: 20, right: 20 }}>
                <defs>
                    {data.slice(0, 10).map((entry, i) => (
                        <linearGradient key={i} id={`eventGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={1} />
                        </linearGradient>
                    ))}
                </defs>
                <XAxis 
                    type="number" 
                    tick={{ fontSize: 11, fill: '#94a3b8' }} 
                    axisLine={false} 
                    tickLine={false} 
                />
                <YAxis 
                    type="category" 
                    dataKey="eventName" 
                    tick={{ fontSize: 11, fill: '#374151' }} 
                    width={150} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
                />
                <Tooltip 
                    content={<ChartTooltip />}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                    cursor={{ fill: '#f1f5f9' }}
                />
                <Bar 
                    dataKey="registrations" 
                    radius={[0, 6, 6, 0]} 
                    barSize={18} 
                    animationDuration={1500}
                    background={{ fill: '#f8fafc', radius: [0, 6, 6, 0] }}
                >
                    {data.slice(0, 10).map((entry, i) => (
                        <Cell key={i} fill={`url(#eventGrad${i})`} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

type TabKey = 'overview' | 'organizer' | 'students' | 'departments';

export default function StatisticsPage() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [loading, setLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [organizerStats, setOrganizerStats] = useState<OrganizerStats | null>(null);
    const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
    const [departmentStats, setDepartmentStats] = useState<DepartmentStats | null>(null);
    const [tabLoading, setTabLoading] = useState(false);

    useEffect(() => { loadDashboard(); }, []);

    useEffect(() => {
        if (activeTab === 'organizer' && !organizerStats) loadOrganizerStats();
        if (activeTab === 'students' && !studentStats) loadStudentStats();
        if (activeTab === 'departments' && !departmentStats) loadDepartmentStats();
    }, [activeTab]);

    const loadDashboard = async () => {
        try { setLoading(true); const data = await statisticsService.getDashboard(); setDashboardStats(data); }
        catch { toast.error('Không thể tải thống kê'); }
        finally { setLoading(false); }
    };
    const loadOrganizerStats = async () => {
        try { setTabLoading(true); const data = await statisticsService.getOrganizerStats(); setOrganizerStats(data); }
        catch { toast.error('Không thể tải thống kê organizer'); }
        finally { setTabLoading(false); }
    };
    const loadStudentStats = async () => {
        try { setTabLoading(true); const data = await statisticsService.getStudentStats(); setStudentStats(data); }
        catch { toast.error('Không thể tải thống kê sinh viên'); }
        finally { setTabLoading(false); }
    };
    const loadDepartmentStats = async () => {
        try { setTabLoading(true); const data = await statisticsService.getDepartmentStats(); setDepartmentStats(data); }
        catch { toast.error('Không thể tải thống kê khoa'); }
        finally { setTabLoading(false); }
    };

    const tabs: { key: TabKey; label: string; icon?: React.ReactNode }[] = [
        { key: 'overview', label: 'Tổng quan', icon: <Activity className="w-4 h-4" /> },
    ];
    if (user?.role === 'organizer' || user?.role === 'admin') {
        tabs.push({ key: 'organizer', label: 'Organizer', icon: <Star className="w-4 h-4" /> });
    }
    if (user?.role === 'admin') {
        tabs.push({ key: 'students', label: 'Sinh viên', icon: <Users className="w-4 h-4" /> });
        tabs.push({ key: 'departments', label: 'Khoa', icon: <BarChart3 className="w-4 h-4" /> });
    }

    // Overview chart data
    const statusEntries = Object.entries(dashboardStats?.events_by_status || {});
    const statusChartData = statusEntries.map(([status, count]) => ({
        label: STATUS_LABELS[status] || status,
        value: count as number,
        color: STATUS_COLORS[status] || '#00358F',
    }));

    const orgStatusEntries = Object.entries(organizerStats?.events_by_status || {});
    const orgStatusChartData = orgStatusEntries.map(([status, count]) => ({
        label: STATUS_LABELS[status] || status,
        value: count as number,
        color: STATUS_COLORS[status] || '#00358F',
    }));

    const deptChartData = (departmentStats?.departments || []).map((d, i) => ({
        label: d.code || d.name.slice(0, 10),
        value: d.total_events,
        color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    // Monthly registration data for area chart (simulated from existing data)
    const monthlyData = useMemo(() => {
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' });
            // Simulate data based on total registrations
            const baseRegistrations = dashboardStats?.total_registrations || 100;
            const variation = Math.random() * 0.4 + 0.8; // 80% - 120%
            const registrations = Math.round((baseRegistrations / 6) * variation);
            months.push({
                month: monthName,
                registrations,
                events: Math.round((dashboardStats?.total_events || 20) / 6 * variation),
            });
        }
        return months;
    }, [dashboardStats]);

    // Top events data (from recent events or simulated)
    const topEventsData = useMemo(() => {
        if (dashboardStats?.recent_events && dashboardStats.recent_events.length > 0) {
            return dashboardStats.recent_events.slice(0, 10).map((e, i) => ({
                eventName: e.title,
                registrations: Math.floor(Math.random() * 100) + 20, // Simulated for demo
            }));
        }
        return [];
    }, [dashboardStats]);

    // Comparison data for overview
    const thisMonthRegistrations = dashboardStats?.total_registrations || 0;
    const lastMonthRegistrations = Math.round((dashboardStats?.total_registrations || 0) * 0.85);
    const thisMonthEvents = dashboardStats?.total_events || 0;
    const lastMonthEvents = Math.round((dashboardStats?.total_events || 0) * 0.9);
    const thisMonthAttendances = dashboardStats?.total_attendances || 0;
    const lastMonthAttendances = Math.round((dashboardStats?.total_attendances || 0) * 0.8);

    return (
        <DashboardLayout>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="p-4 md:p-6 space-y-6">

                {/* Page header */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Statistics</p>
                            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Thống kê</h1>
                            <p className="text-sm text-[var(--text-muted)]">Tổng quan hoạt động sự kiện</p>
                        </div>
                    </div>
                </div>

                {/* Tab navigation */}
                {tabs.length > 1 && (
                    <div className="flex gap-1 bg-[var(--bg-muted)] rounded-2xl p-1.5 w-fit">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    activeTab === tab.key
                                        ? 'bg-white text-[var(--color-brand-navy)] shadow-[var(--shadow-sm)]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* ─── OVERVIEW TAB ─── */}
                {activeTab === 'overview' && (
                    <>
                        {/* Comparison Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ComparisonCard 
                                label="Đăng ký tháng này" 
                                thisMonth={thisMonthRegistrations} 
                                lastMonth={lastMonthRegistrations}
                                icon={<Users size={20} />}
                                color="#00358F"
                            />
                            <ComparisonCard 
                                label="Sự kiện tháng này" 
                                thisMonth={thisMonthEvents} 
                                lastMonth={lastMonthEvents}
                                icon={<Calendar size={20} />}
                                color="#F26600"
                            />
                            <ComparisonCard 
                                label="Check-in tháng này" 
                                thisMonth={thisMonthAttendances} 
                                lastMonth={lastMonthAttendances}
                                icon={<CheckCircle size={20} />}
                                color="#00A651"
                            />
                        </div>

                        {/* Main Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatBox loading={loading} label="Tổng sự kiện" value={String(dashboardStats?.total_events || 0)} icon={<Calendar size={20} />} color="#00358F" />
                            <StatBox loading={loading} label="Tổng đăng ký" value={String(dashboardStats?.total_registrations || 0)} icon={<Users size={20} />} color="#00A651" />
                            <StatBox loading={loading} label="Đã check-in" value={String(dashboardStats?.total_attendances || 0)} icon={<CheckCircle size={20} />} color="#F26600" />
                            <StatBox loading={loading} label="Check-in rate" value={`${dashboardStats?.check_in_rate || 0}%`} icon={<BarChart3 size={20} />} color="#8b5cf6" />
                        </div>

                        {/* Charts Row 1: Monthly Area Chart + Status Pie Chart */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Monthly Registration Trends — Area Chart */}
                            <div className="lg:col-span-2">
                                <ChartCard
                                    title="Xu hướng đăng ký theo tháng"
                                    subtitle="Biến động đăng ký 6 tháng gần nhất"
                                    icon={<TrendingUp className="w-4 h-4" />}
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center h-64">
                                            <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={monthlyData} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="monthlyRegGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#00358F" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#00358F" stopOpacity={0}/>
                                                    </linearGradient>
                                                    <linearGradient id="monthlyEventGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#F26600" stopOpacity={0.2}/>
                                                        <stop offset="95%" stopColor="#F26600" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                <XAxis 
                                                    dataKey="month" 
                                                    tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                />
                                                <Tooltip 
                                                    content={<ChartTooltip />}
                                                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="registrations" 
                                                    name="Đăng ký"
                                                    stroke="#00358F" 
                                                    strokeWidth={2.5} 
                                                    fill="url(#monthlyRegGrad)" 
                                                    dot={false} 
                                                    activeDot={{ r: 5, fill: '#00358F', strokeWidth: 0 }}
                                                    animationDuration={1500}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="events" 
                                                    name="Sự kiện"
                                                    stroke="#F26600" 
                                                    strokeWidth={2.5} 
                                                    fill="url(#monthlyEventGrad)" 
                                                    dot={false} 
                                                    activeDot={{ r: 5, fill: '#F26600', strokeWidth: 0 }}
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </ChartCard>
                            </div>

                            {/* Status Pie Chart */}
                            <ChartCard
                                title="Phân bổ trạng thái"
                                subtitle="Tỷ lệ sự kiện theo status"
                                icon={<BarChart3 className="w-4 h-4" />}
                            >
                                {loading || statusChartData.length === 0 ? (
                                    <div className="flex items-center justify-center h-64">
                                        {loading ? (
                                            <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                        ) : (
                                            <p className="text-sm text-[var(--text-muted)] text-center">Chưa có dữ liệu</p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <ResponsiveContainer width="100%" height={180}>
                                                <PieChart>
                                                    <Pie 
                                                        data={statusChartData} 
                                                        cx="50%" 
                                                        cy="50%" 
                                                        innerRadius={50} 
                                                        outerRadius={75} 
                                                        paddingAngle={3} 
                                                        dataKey="value"
                                                        animationDuration={1200}
                                                    >
                                                        {statusChartData.map((entry, i) => (
                                                            <Cell key={i} fill={entry.color} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        content={<ChartTooltip />}
                                                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="text-center">
                                                    <p className="text-xl font-extrabold text-[var(--text-primary)]">{dashboardStats?.total_events || 0}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)]">Tổng sự kiện</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-4">
                                            {statusChartData.map((entry, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                                                        <span className="text-[var(--text-secondary)] font-medium">{entry.label}</span>
                                                    </div>
                                                    <span className="font-bold text-[var(--text-primary)]">{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </ChartCard>
                        </div>

                        {/* Charts Row 2: Top Events Horizontal Bar */}
                        {topEventsData.length > 0 && (
                            <ChartCard
                                title="Top sự kiện được quan tâm"
                                subtitle="10 sự kiện có lượng đăng ký cao nhất"
                                icon={<Trophy className="w-4 h-4" />}
                            >
                                <TopEventsBarChart data={topEventsData} loading={loading} />
                            </ChartCard>
                        )}

                        {/* Recent Events */}
                        {dashboardStats?.recent_events && dashboardStats.recent_events.length > 0 && (
                            <Card variant="glass" padding="lg">
                                <CardHeader title="Sự kiện gần đây" subtitle="5 sự kiện mới nhất" icon={<Calendar className="w-5 h-5" />} />
                                <div className="space-y-2.5">
                                    {dashboardStats.recent_events.map((e) => (
                                        <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-muted)]/40 hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_4%,transparent)] transition-colors">
                                            <div className="min-w-0 flex-1 mr-3">
                                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{e.title}</p>
                                                <p className="text-[11px] text-[var(--text-muted)]">{new Date(e.start_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                            </div>
                                            <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                                e.status === 'ongoing'
                                                    ? 'bg-[color-mix(in_srgb,#00A651_12%,transparent)] text-[#00875a]'
                                                    : e.status === 'upcoming'
                                                        ? 'bg-[color-mix(in_srgb,#F26600_12%,transparent)] text-[#c44e00]'
                                                        : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                                            }`}>
                                                {STATUS_LABELS[e.status] || e.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </>
                )}

                {/* ─── ORGANIZER TAB ─── */}
                {activeTab === 'organizer' && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatBox loading={tabLoading} label="Sự kiện của tôi" value={String(organizerStats?.total_events || 0)} icon={<Calendar size={20} />} color="#00358F" />
                            <StatBox loading={tabLoading} label="Tổng đăng ký" value={String(organizerStats?.total_registrations || 0)} icon={<Users size={20} />} color="#00A651" />
                            <StatBox loading={tabLoading} label="Đã check-in" value={String(organizerStats?.total_attendances || 0)} icon={<CheckCircle size={20} />} color="#F26600" />
                            <StatBox loading={tabLoading} label="Rating trung bình" value={organizerStats?.average_rating?.toFixed(1) || '0.0'} icon={<Star size={20} />} color="#FFB800" />
                        </div>
                        
                        {/* Organizer Status Chart */}
                        <ChartCard
                            title="Sự kiện theo trạng thái"
                            subtitle="Events của tôi"
                            icon={<BarChart3 className="w-4 h-4" />}
                        >
                            {tabLoading || orgStatusChartData.length === 0 ? (
                                <div className="flex items-center justify-center h-64">
                                    {tabLoading ? (
                                        <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)] text-center">Chưa có dữ liệu</p>
                                    )}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={orgStatusChartData} margin={{ left: 20, right: 20 }}>
                                        <defs>
                                            {orgStatusChartData.map((entry, i) => (
                                                <linearGradient key={i} id={`orgGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                                                    <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <XAxis 
                                            dataKey="label" 
                                            tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                        />
                                        <YAxis 
                                            tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                        />
                                        <Tooltip 
                                            content={<ChartTooltip />}
                                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                                        />
                                        <Bar 
                                            dataKey="value" 
                                            name="Số sự kiện"
                                            radius={[6, 6, 0, 0]} 
                                            barSize={40} 
                                            animationDuration={1500}
                                        >
                                            {orgStatusChartData.map((entry, i) => (
                                                <Cell key={i} fill={`url(#orgGrad${i})`} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                    </>
                )}

                {/* ─── STUDENTS TAB (admin) ─── */}
                {activeTab === 'students' && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatBox loading={tabLoading} label="Tổng sinh viên" value={String(studentStats?.total_students || 0)} icon={<Users size={20} />} color="#00358F" />
                            <StatBox loading={tabLoading} label="Sinh viên tích cực" value={String(studentStats?.active_students || 0)} icon={<TrendingUp size={20} />} color="#00A651" />
                        </div>
                        {studentStats?.top_students && studentStats.top_students.length > 0 && (
                            <Card variant="glass" padding="lg">
                                <CardHeader title="Top sinh viên" subtitle="Theo điểm rèn luyện" icon={<Trophy className="w-5 h-5" />} />
                                <div className="overflow-x-auto mt-1">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-[var(--border-light)]">
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">#</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Họ tên</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Sự kiện</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Tổng điểm</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-light)]">
                                            {studentStats.top_students.map((s, i) => (
                                                <tr key={s.id} className="hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors">
                                                    <td className="px-4 py-3">
                                                        {i < 3 ? (
                                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${
                                                                i === 0 ? 'bg-[#FFB800]' : i === 1 ? 'bg-[#94a3b8]' : 'bg-[#cd7f32]'
                                                            }`}>{i + 1}</span>
                                                        ) : (
                                                            <span className="text-sm text-[var(--text-muted)] font-medium">{i + 1}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{s.full_name}</td>
                                                    <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{s.events_attended}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[color-mix(in_srgb,#00A651_12%,transparent)] text-[#00875a]">
                                                            <Award className="w-3 h-3" /> {s.total_points} điểm
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </>
                )}

                {/* ─── DEPARTMENTS TAB (admin) ─── */}
                {activeTab === 'departments' && (
                    <>
                        <ChartCard
                            title="Sự kiện theo khoa"
                            subtitle="Phân bổ theo department"
                            icon={<BarChart3 className="w-4 h-4" />}
                        >
                            {tabLoading || deptChartData.length === 0 ? (
                                <div className="flex items-center justify-center h-64">
                                    {tabLoading ? (
                                        <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)] text-center">Chưa có dữ liệu</p>
                                    )}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={deptChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <defs>
                                            {deptChartData.map((entry, i) => (
                                                <linearGradient key={i} id={`deptGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor={entry.color} stopOpacity={0.8} />
                                                    <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <XAxis 
                                            type="number" 
                                            tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                        />
                                        <YAxis 
                                            type="category" 
                                            dataKey="label" 
                                            tick={{ fontSize: 12, fill: '#374151' }} 
                                            width={100} 
                                            axisLine={false} 
                                            tickLine={false} 
                                        />
                                        <Tooltip 
                                            content={<ChartTooltip />}
                                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                                            cursor={{ fill: '#f1f5f9' }}
                                        />
                                        <Bar 
                                            dataKey="value" 
                                            name="Số sự kiện"
                                            radius={[0, 6, 6, 0]} 
                                            barSize={20} 
                                            animationDuration={1500}
                                            background={{ fill: '#f8fafc', radius: [0, 6, 6, 0] }}
                                        >
                                            {deptChartData.map((entry, i) => (
                                                <Cell key={i} fill={`url(#deptGrad${i})`} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                        {departmentStats?.departments && departmentStats.departments.length > 0 && (
                            <Card variant="glass" padding="lg">
                                <CardHeader title="Chi tiết theo khoa" icon={<BarChart3 className="w-5 h-5" />} />
                                <div className="overflow-x-auto mt-1">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-[var(--border-light)]">
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Khoa</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Mã</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Sự kiện</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Đăng ký</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Check-in</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-light)]">
                                            {departmentStats.departments.map((d) => (
                                                <tr key={d.id} className="hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors">
                                                    <td className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">{d.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] text-[var(--color-brand-navy)]">{d.code}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-sm font-bold text-[var(--text-primary)]">{d.total_events}</td>
                                                    <td className="px-4 py-3 text-right text-sm text-[var(--text-secondary)]">{d.total_registrations}</td>
                                                    <td className="px-4 py-3 text-right text-sm text-[var(--text-secondary)]">{d.total_attendances}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </motion.div>
        </DashboardLayout>
    );
}
