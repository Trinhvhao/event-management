'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card, { CardHeader } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, Users, CheckCircle, Star, Award, TrendingUp, Activity, Trophy } from 'lucide-react';
import { statisticsService, DashboardStats, OrganizerStats, StudentStats, DepartmentStats } from '@/services/statisticsService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

// Chart palette
const CHART_COLORS = ['#00358F', '#F26600', '#00A651', '#FFB800', '#FF4000', '#8b5cf6'];

// Recharts custom tooltip
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
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1.5">{label}</p>
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

function BarChartCard({ data, loading, title, subtitle }: {
    data: { label: string; value: number; color: string }[];
    loading?: boolean;
    title: string;
    subtitle?: string;
}) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <Card variant="glass" padding="lg">
            <CardHeader title={title} subtitle={subtitle} icon={<BarChart3 className="w-5 h-5" />} />
            {loading ? (
                <div className="flex items-end gap-3 h-36">
                    {SKELETON_HEIGHTS.map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center">
                            <Skeleton style={{ width: '100%', height: h, borderRadius: 6 }} />
                        </div>
                    ))}
                </div>
            ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 gap-2">
                    <p className="text-sm text-[var(--text-muted)]">Không có dữ liệu</p>
                </div>
            ) : (
                <div className="flex items-end gap-3 h-36">
                    {data.map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center flex-1 group">
                            <span className="text-xs font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--color-brand-navy)] transition-colors">{item.value.toLocaleString('vi-VN')}</span>
                            <div
                                className="w-full rounded-t-lg transition-all duration-700"
                                style={{ height: `${(item.value / max) * 100}%`, background: item.color, minHeight: 4 }}
                            />
                            <span className="text-[10px] text-[var(--text-muted)] mt-2 truncate w-full text-center leading-tight">{item.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
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
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Statistics</p>
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
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatBox loading={loading} label="Tổng sự kiện" value={String(dashboardStats?.total_events || 0)} icon={<Calendar size={20} />} color="#00358F" />
                            <StatBox loading={loading} label="Tổng đăng ký" value={String(dashboardStats?.total_registrations || 0)} icon={<Users size={20} />} color="#00A651" />
                            <StatBox loading={loading} label="Đã check-in" value={String(dashboardStats?.total_attendances || 0)} icon={<CheckCircle size={20} />} color="#F26600" />
                            <StatBox loading={loading} label="Check-in rate" value={`${dashboardStats?.check_in_rate || 0}%`} icon={<BarChart3 size={20} />} color="#8b5cf6" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <BarChartCard loading={loading} data={statusChartData} title="Sự kiện theo trạng thái" subtitle="Phân loại theo status" />

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
                        </div>
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
                        <BarChartCard loading={tabLoading} data={orgStatusChartData} title="Sự kiện theo trạng thái" subtitle="Events của tôi" />
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
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">#</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Họ tên</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Sự kiện</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Tổng điểm</th>
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
                        <BarChartCard loading={tabLoading} data={deptChartData} title="Sự kiện theo khoa" subtitle="Phân bổ theo department" />
                        {departmentStats?.departments && departmentStats.departments.length > 0 && (
                            <Card variant="glass" padding="lg">
                                <CardHeader title="Chi tiết theo khoa" icon={<BarChart3 className="w-5 h-5" />} />
                                <div className="overflow-x-auto mt-1">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-[var(--border-light)]">
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Khoa</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Mã</th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Sự kiện</th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Đăng ký</th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Check-in</th>
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
