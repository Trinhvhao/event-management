'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card, { CardHeader } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, Users, CheckCircle, Star, Building2, Award, TrendingUp } from 'lucide-react';
import { statisticsService, DashboardStats, OrganizerStats, StudentStats, DepartmentStats } from '@/services/statisticsService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const SKELETON_BAR_HEIGHTS = [64, 88, 74, 96] as const;

// Stat box component
function StatBox({ label, value, icon, color, loading }: {
    label: string; value: string; icon: React.ReactNode; color: string; loading?: boolean;
}) {
    return (
        <Card variant="glass" padding="none">
            <div className="stat-card">
                <div className="flex items-center justify-between mb-3">
                    <span className="stat-card-label">{label}</span>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>{icon}</div>
                </div>
                {loading ? (
                    <Skeleton style={{ width: 60, height: 28, borderRadius: 6 }} />
                ) : (
                    <p className="stat-card-value">{value}</p>
                )}
            </div>
        </Card>
    );
}

// Simple bar chart
function SimpleBarChart({ data, loading }: { data: { label: string; value: number; color: string }[]; loading?: boolean }) {
    if (loading || data.length === 0) {
        return (
            <div className="flex items-end gap-3 h-40">
                {SKELETON_BAR_HEIGHTS.map((height, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                        <Skeleton style={{ width: '100%', height, borderRadius: 4 }} />
                    </div>
                ))}
            </div>
        );
    }

    const maxVal = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-3 h-40">
            {data.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1">
                    <span className="text-xs font-semibold text-[var(--dash-text-primary)] mb-1">{item.value}</span>
                    <div
                        className="w-full rounded-t-md transition-all"
                        style={{ height: `${(item.value / maxVal) * 100}%`, background: item.color, minHeight: 4 }}
                    />
                    <span className="text-[10px] text-[var(--dash-text-muted)] mt-2 truncate w-full text-center">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

// Status labels
const statusLabels: Record<string, string> = {
    upcoming: 'Sắp diễn ra',
    ongoing: 'Đang diễn ra',
    completed: 'Đã kết thúc',
    cancelled: 'Đã hủy',
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
};

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

    useEffect(() => {
        loadDashboard();
    }, []);

    useEffect(() => {
        if (activeTab === 'organizer' && !organizerStats) loadOrganizerStats();
        if (activeTab === 'students' && !studentStats) loadStudentStats();
        if (activeTab === 'departments' && !departmentStats) loadDepartmentStats();
    }, [activeTab]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const data = await statisticsService.getDashboard();
            setDashboardStats(data);
        } catch {
            toast.error('Không thể tải thống kê');
        } finally {
            setLoading(false);
        }
    };

    const loadOrganizerStats = async () => {
        try {
            setTabLoading(true);
            const data = await statisticsService.getOrganizerStats();
            setOrganizerStats(data);
        } catch {
            toast.error('Không thể tải thống kê organizer');
        } finally {
            setTabLoading(false);
        }
    };

    const loadStudentStats = async () => {
        try {
            setTabLoading(true);
            const data = await statisticsService.getStudentStats();
            setStudentStats(data);
        } catch {
            toast.error('Không thể tải thống kê sinh viên');
        } finally {
            setTabLoading(false);
        }
    };

    const loadDepartmentStats = async () => {
        try {
            setTabLoading(true);
            const data = await statisticsService.getDepartmentStats();
            setDepartmentStats(data);
        } catch {
            toast.error('Không thể tải thống kê khoa');
        } finally {
            setTabLoading(false);
        }
    };

    // Build tabs based on role
    const tabs: { key: TabKey; label: string }[] = [
        { key: 'overview', label: 'Tổng quan' },
    ];
    if (user?.role === 'organizer' || user?.role === 'admin') {
        tabs.push({ key: 'organizer', label: 'Organizer' });
    }
    if (user?.role === 'admin') {
        tabs.push({ key: 'students', label: 'Sinh viên' });
        tabs.push({ key: 'departments', label: 'Khoa' });
    }

    // Chart data
    const statusEntries = dashboardStats?.events_by_status ? Object.entries(dashboardStats.events_by_status) : [];
    const statusChartData = statusEntries.map(([status, count]) => ({
        label: statusLabels[status] || status,
        value: count as number,
        color: status === 'upcoming' ? '#3b82f6' : status === 'ongoing' ? '#22c55e' : status === 'completed' ? '#8b5cf6' : '#ef4444',
    }));

    const orgStatusEntries = organizerStats?.events_by_status ? Object.entries(organizerStats.events_by_status) : [];
    const orgStatusChartData = orgStatusEntries.map(([status, count]) => ({
        label: statusLabels[status] || status,
        value: count as number,
        color: status === 'upcoming' ? '#3b82f6' : status === 'ongoing' ? '#22c55e' : status === 'completed' ? '#8b5cf6' : '#ef4444',
    }));

    const deptChartData = (departmentStats?.departments || []).map((d, i) => ({
        label: d.code || d.name.slice(0, 10),
        value: d.total_events,
        color: ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4'][i % 6],
    }));

    return (
        <DashboardLayout>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Thống kê</h1>
                        <p className="page-subtitle">Tổng quan hoạt động sự kiện</p>
                    </div>
                </div>

                {/* Tabs */}
                {tabs.length > 1 && (
                    <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === tab.key
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatBox loading={loading} label="Tổng sự kiện" value={String(dashboardStats?.total_events || 0)} icon={<Calendar size={20} />} color="#3b82f6" />
                            <StatBox loading={loading} label="Tổng đăng ký" value={String(dashboardStats?.total_registrations || 0)} icon={<Users size={20} />} color="#22c55e" />
                            <StatBox loading={loading} label="Đã check-in" value={String(dashboardStats?.total_attendances || 0)} icon={<CheckCircle size={20} />} color="#f97316" />
                            <StatBox loading={loading} label="Check-in rate" value={`${dashboardStats?.check_in_rate || 0}%`} icon={<BarChart3 size={20} />} color="#8b5cf6" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card variant="glass" padding="lg">
                                <CardHeader title="Sự kiện theo trạng thái" subtitle="Phân loại theo status" />
                                <SimpleBarChart data={statusChartData} loading={loading} />
                            </Card>
                            {/* Recent events */}
                            {dashboardStats?.recent_events && dashboardStats.recent_events.length > 0 && (
                                <Card variant="glass" padding="lg">
                                    <CardHeader title="Sự kiện gần đây" subtitle="5 sự kiện mới nhất" />
                                    <div className="space-y-3 mt-2">
                                        {dashboardStats.recent_events.map((e) => (
                                            <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-primary truncate">{e.title}</p>
                                                    <p className="text-xs text-gray-500">{new Date(e.start_time).toLocaleDateString('vi-VN')}</p>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    e.status === 'ongoing' ? 'bg-green-50 text-green-700' :
                                                    e.status === 'upcoming' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {statusLabels[e.status] || e.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </>
                )}

                {/* Organizer Tab */}
                {activeTab === 'organizer' && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatBox loading={tabLoading} label="Sự kiện của tôi" value={String(organizerStats?.total_events || 0)} icon={<Calendar size={20} />} color="#3b82f6" />
                            <StatBox loading={tabLoading} label="Tổng đăng ký" value={String(organizerStats?.total_registrations || 0)} icon={<Users size={20} />} color="#22c55e" />
                            <StatBox loading={tabLoading} label="Đã check-in" value={String(organizerStats?.total_attendances || 0)} icon={<CheckCircle size={20} />} color="#f97316" />
                            <StatBox loading={tabLoading} label="Rating TB" value={String(organizerStats?.average_rating?.toFixed(1) || '0.0')} icon={<Star size={20} />} color="#eab308" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card variant="glass" padding="lg">
                                <CardHeader title="Sự kiện theo trạng thái" subtitle="Events của tôi" />
                                <SimpleBarChart data={orgStatusChartData} loading={tabLoading} />
                            </Card>
                        </div>
                    </>
                )}

                {/* Students Tab (admin) */}
                {activeTab === 'students' && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <StatBox loading={tabLoading} label="Tổng sinh viên" value={String(studentStats?.total_students || 0)} icon={<Users size={20} />} color="#3b82f6" />
                            <StatBox loading={tabLoading} label="Sinh viên tích cực" value={String(studentStats?.active_students || 0)} icon={<TrendingUp size={20} />} color="#22c55e" />
                        </div>
                        {studentStats?.top_students && studentStats.top_students.length > 0 && (
                            <Card variant="glass" padding="lg">
                                <CardHeader title="Top sinh viên" subtitle="Theo điểm rèn luyện" />
                                <div className="overflow-x-auto mt-2">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sự kiện</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tổng điểm</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {studentStats.top_students.map((s, i) => (
                                                <tr key={s.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        {i < 3 ? (
                                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                                                                i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-600'
                                                            }`}>{i + 1}</span>
                                                        ) : (
                                                            <span className="text-gray-500">{i + 1}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-primary">{s.full_name}</td>
                                                    <td className="px-4 py-3 text-gray-600">{s.events_attended}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                                                            <Award className="w-3 h-3" /> {s.total_points}
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

                {/* Departments Tab (admin) */}
                {activeTab === 'departments' && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <Card variant="glass" padding="lg">
                                <CardHeader title="Sự kiện theo khoa" subtitle="Phân bổ theo department" />
                                <SimpleBarChart data={deptChartData} loading={tabLoading} />
                            </Card>
                        </div>
                        {departmentStats?.departments && departmentStats.departments.length > 0 && (
                            <Card variant="glass" padding="lg">
                                <CardHeader title="Chi tiết theo khoa" />
                                <div className="overflow-x-auto mt-2">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khoa</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sự kiện</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Đăng ký</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Check-in</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {departmentStats.departments.map((d) => (
                                                <tr key={d.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-primary">{d.name}</td>
                                                    <td className="px-4 py-3 text-gray-500">{d.code}</td>
                                                    <td className="px-4 py-3 text-gray-600">{d.total_events}</td>
                                                    <td className="px-4 py-3 text-gray-600">{d.total_registrations}</td>
                                                    <td className="px-4 py-3 text-gray-600">{d.total_attendances}</td>
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
