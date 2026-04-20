'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card, { CardHeader } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useStatisticsStore } from '@/store/statisticsStore';
import { DateRangePicker } from '@/components/admin/shared/DateRangePicker';
import { BarChart3, Calendar, Users, TrendingUp, RefreshCw, Download, Activity, Award } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

// Brand color palette for charts
const CHART_COLORS = ['#00358F', '#F26600', '#00A651', '#FFB800', '#FF4000', '#8b5cf6', '#06b6d4'];

function MetricCard({
    label, value, trend, icon, color, loading
}: {
    label: string; value: number | string; trend?: { percentage: number; direction: 'up' | 'down' | 'neutral' };
    icon: React.ReactNode; color: string; loading?: boolean;
}) {
    const trendUp = trend?.direction === 'up';
    const trendColor = trendUp
        ? 'text-[var(--color-brand-green)]'
        : trend?.direction === 'down'
            ? 'text-[var(--color-brand-red)]'
            : 'text-[var(--text-muted)]';

    return (
        <div className="bg-white rounded-2xl border border-[var(--border-default)] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden">
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: color }} />

            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1">{label}</p>
                    {loading ? (
                        <Skeleton width={80} height={32} />
                    ) : (
                        <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">
                            {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
                        </p>
                    )}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
                            <TrendingUp className={`w-3.5 h-3.5 ${trend.direction === 'down' ? 'rotate-180' : ''}`} />
                            <span className="text-xs font-bold">
                                {trend.percentage > 0 ? '+' : ''}{trend.percentage}% so với kỳ trước
                            </span>
                        </div>
                    )}
                </div>
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                    style={{ background: color }}
                >
                    <div className="text-white">{icon}</div>
                </div>
            </div>
        </div>
    );
}

// Recharts custom tooltip
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-lg)] px-4 py-3">
            <p className="text-xs font-bold text-[var(--text-primary)] mb-2">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                    <span className="text-[var(--text-muted)]">{entry.name}:</span>
                    <span className="font-bold text-[var(--text-primary)]">{entry.value.toLocaleString('vi-VN')}</span>
                </div>
            ))}
        </div>
    );
}

export default function AdminStatisticsPage() {
    const {
        metrics, trends, chartData, loading, error,
        fetchStatistics, updateDateRange, updateFilters, filters,
    } = useStatisticsStore();

    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => { fetchStatistics(); }, [fetchStatistics]);

    // Apply date range filter
    useEffect(() => {
        updateDateRange(dateRange);
    }, [dateRange, updateDateRange]);

    const handleApplyFilters = () => {
        updateFilters({ department_id: departmentFilter, category_id: categoryFilter });
    };

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => setIsExporting(false), 1500);
    };

    // Status distribution for pie chart
    const statusData = useMemo(() => {
        const rows = chartData?.eventStatusDistribution || [];
        return rows.map((row: { status: string; count: number }, i: number) => ({
            name: row.status,
            value: row.count,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }));
    }, [chartData]);

    const totalStatus = statusData.reduce((s, r) => s + r.value, 0);

    // Registration trend data
    const trendData = useMemo(() => {
        return (chartData?.userRegistrationTrend || []).map((r: { date: string; count: number }) => ({
            date: r.date,
            đăng_ký: r.count,
        }));
    }, [chartData]);

    return (
        <DashboardLayout>
            <div className="space-y-6 p-4 md:p-6">

                {/* Page header */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Admin Statistics</p>
                                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Thống kê quản trị</h1>
                                <p className="text-sm text-[var(--text-muted)]">Tổng hợp số liệu hệ thống</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => fetchStatistics()}
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition-all hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] active:scale-95"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Làm mới
                            </button>
                            <button
                                onClick={handleExport}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-navy)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition-all hover:opacity-90 active:scale-95"
                            >
                                <Download className="w-4 h-4" />
                                {isExporting ? 'Đang xuất...' : 'Xuất báo cáo'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters row */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end flex-1">
                            <div className="flex flex-col gap-1.5 flex-1 max-w-[200px]">
                                <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Khoảng thời gian</label>
                                <DateRangePicker value={dateRange} onChange={setDateRange} />
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1 max-w-[180px]">
                                <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Khoa</label>
                                <input
                                    type="text"
                                    placeholder="ID khoa..."
                                    value={departmentFilter}
                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                    className="input-base text-sm"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1 max-w-[180px]">
                                <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Danh mục</label>
                                <input
                                    type="text"
                                    placeholder="ID danh mục..."
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="input-base text-sm"
                                />
                            </div>
                            <button
                                onClick={handleApplyFilters}
                                className="btn btn-primary"
                            >
                                Áp dụng
                            </button>
                        </div>
                        {(departmentFilter || categoryFilter || dateRange.from) && (
                            <button
                                onClick={() => {
                                    setDateRange({ from: null, to: null });
                                    setDepartmentFilter('');
                                    setCategoryFilter('');
                                    updateDateRange({ from: null, to: null });
                                    updateFilters({ department_id: '', category_id: '' });
                                }}
                                className="btn btn-ghost btn-sm"
                            >
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-xl border border-[var(--color-brand-red)]/20 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] p-4 text-sm text-[var(--color-brand-red)] font-medium">
                        {error}
                    </div>
                )}

                {/* Metric Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard loading={loading} label="Tổng người dùng" value={metrics?.totalUsers || 0} trend={trends?.totalUsers} icon={<Users className="w-5 h-5" />} color="#00358F" />
                    <MetricCard loading={loading} label="Tổng sự kiện" value={metrics?.totalEvents || 0} trend={trends?.totalEvents} icon={<Calendar className="w-5 h-5" />} color="#F26600" />
                    <MetricCard loading={loading} label="Tổng đăng ký" value={metrics?.totalRegistrations || 0} trend={trends?.totalRegistrations} icon={<Activity className="w-5 h-5" />} color="#00A651" />
                    <MetricCard loading={loading} label="Organizer hoạt động" value={metrics?.activeOrganizers || 0} trend={trends?.activeOrganizers} icon={<Award className="w-5 h-5" />} color="#8b5cf6" />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    {/* Registration Trend — 2/3 width */}
                    <div className="xl:col-span-2">
                        <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden h-full">
                            <div className="px-5 pt-5 pb-0 border-b border-[var(--border-light)]">
                                <CardHeader
                                    title="Xu hướng đăng ký"
                                    subtitle="Đăng ký theo ngày gần nhất"
                                    icon={<Activity className="w-5 h-5" />}
                                />
                            </div>
                            <div className="px-5 py-5">
                                {loading || trendData.length === 0 ? (
                                    <div className="flex items-center justify-center h-64">
                                        {loading ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                                <span className="text-sm text-[var(--text-muted)] font-medium">Đang tải dữ liệu...</span>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-[var(--text-muted)] text-center py-12">Chưa có dữ liệu đăng ký</p>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ height: '280px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="gradReg" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#00358F" stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor="#00358F" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Line type="monotone" dataKey="đăng_ký" name="Đăng ký" stroke="#00358F" strokeWidth={2.5} dot={{ fill: '#00358F', r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Distribution Pie — 1/3 width */}
                    <div>
                        <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden h-full">
                            <div className="px-5 pt-5 pb-0 border-b border-[var(--border-light)]">
                                <CardHeader title="Phân bổ trạng thái" subtitle="Sự kiện theo status" icon={<BarChart3 className="w-5 h-5" />} />
                            </div>
                            <div className="px-5 py-5">
                                {loading || statusData.length === 0 ? (
                                    <div className="flex items-center justify-center h-64">
                                        {loading ? (
                                            <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                        ) : (
                                            <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ height: '160px' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                                                        {statusData.map((entry, i) => (
                                                            <Cell key={i} fill={entry.color} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<ChartTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2.5 mt-2">
                                            {statusData.map((entry, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                                                        <span className="text-[var(--text-secondary)] font-medium capitalize">{entry.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-[var(--text-muted)]">{totalStatus > 0 ? ((entry.value / totalStatus) * 100).toFixed(1) : 0}%</span>
                                                        <span className="font-bold text-[var(--text-primary)]">{entry.value}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Registration Trend Table */}
                <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                    <div className="px-5 pt-5 pb-0 border-b border-[var(--border-light)]">
                        <CardHeader title="Chi tiết đăng ký theo ngày" subtitle="Danh sách đăng ký gần đây" icon={<Calendar className="w-5 h-5" />} />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-muted)]">
                                <tr>
                                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Ngày</th>
                                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Số đăng ký</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">% Tổng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-light)]">
                                {(chartData?.userRegistrationTrend || []).slice(-10).map((row: { date: string; count: number }, i: number) => {
                                    const total = (chartData?.userRegistrationTrend || []).reduce((s: number, r: { count: number }) => s + r.count, 0);
                                    const pct = total > 0 ? ((row.count / total) * 100).toFixed(1) : '0.0';
                                    return (
                                        <tr key={row.date} className="hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors">
                                            <td className="px-5 py-3 text-sm font-medium text-[var(--text-secondary)]">{row.date}</td>
                                            <td className="px-5 py-3 text-right text-sm font-bold text-[var(--text-primary)]">{row.count.toLocaleString('vi-VN')}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden max-w-[120px]">
                                                        <div className="h-full rounded-full bg-[var(--color-brand-navy)]" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-xs text-[var(--text-muted)] font-medium w-12 text-right">{pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {!loading && (!chartData?.userRegistrationTrend || chartData.userRegistrationTrend.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-14 gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                    <Activity className="w-7 h-7 text-[var(--text-muted)]" />
                                </div>
                                <p className="text-sm font-semibold text-[var(--text-secondary)]">Không có dữ liệu đăng ký</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
