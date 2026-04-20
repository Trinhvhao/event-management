'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card, { CardHeader } from '@/components/ui/Card';
import { useStatisticsStore } from '@/store/statisticsStore';
import { BarChart3, Calendar, Users, TrendingUp } from 'lucide-react';

function MetricCard({
    label,
    value,
    trend,
    icon,
}: {
    label: string;
    value: number;
    trend?: { percentage: number; direction: 'up' | 'down' | 'neutral' };
    icon: React.ReactNode;
}) {
    const trendClass =
        trend?.direction === 'up'
            ? 'text-green-600'
            : trend?.direction === 'down'
              ? 'text-red-600'
              : 'text-gray-500';

    return (
        <Card variant="glass" padding="lg">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{value.toLocaleString('vi-VN')}</p>
                    {trend && (
                        <p className={`mt-1 text-xs ${trendClass}`}>
                            {trend.percentage > 0 ? '+' : ''}
                            {trend.percentage}%
                        </p>
                    )}
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brandLightBlue/20 text-brandBlue">
                    {icon}
                </div>
            </div>
        </Card>
    );
}

export default function AdminStatisticsPage() {
    const {
        metrics,
        trends,
        chartData,
        loading,
        error,
        fetchStatistics,
        updateDateRange,
        updateFilters,
        filters,
    } = useStatisticsStore();

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        fetchStatistics();
    }, [fetchStatistics]);

    const statusRows = useMemo(() => chartData?.eventStatusDistribution || [], [chartData]);

    const applyDateFilter = () => {
        updateDateRange({
            from: dateFrom ? new Date(`${dateFrom}T00:00:00`) : null,
            to: dateTo ? new Date(`${dateTo}T23:59:59`) : null,
        });
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Thống kê quản trị</h1>
                        <p className="text-sm text-gray-500">Tổng hợp số liệu hệ thống theo bộ lọc.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:items-end">
                        <label className="text-xs text-gray-500">
                            Từ ngày
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                        </label>
                        <label className="text-xs text-gray-500">
                            Đến ngày
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                        </label>
                        <button
                            onClick={applyDateFilter}
                            className="rounded-lg bg-brandBlue px-4 py-2 text-sm font-medium text-white hover:bg-brandBlue/90"
                        >
                            Áp dụng
                        </button>
                        <button
                            onClick={() => {
                                setDateFrom('');
                                setDateTo('');
                                updateDateRange({ from: null, to: null });
                            }}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Xóa ngày
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:items-center">
                    <input
                        placeholder="Lọc theo department_id"
                        value={filters.department_id}
                        onChange={(e) => updateFilters({ department_id: e.target.value })}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                        placeholder="Lọc theo category_id"
                        value={filters.category_id}
                        onChange={(e) => updateFilters({ category_id: e.target.value })}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                </div>

                {error && (
                    <Card variant="solid" padding="md" className="border border-red-200 bg-red-50 text-red-700">
                        {error}
                    </Card>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Tổng người dùng"
                        value={metrics?.totalUsers || 0}
                        trend={trends?.totalUsers}
                        icon={<Users className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Tổng sự kiện"
                        value={metrics?.totalEvents || 0}
                        trend={trends?.totalEvents}
                        icon={<Calendar className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Tổng đăng ký"
                        value={metrics?.totalRegistrations || 0}
                        trend={trends?.totalRegistrations}
                        icon={<BarChart3 className="h-5 w-5" />}
                    />
                    <MetricCard
                        label="Organizer hoạt động"
                        value={metrics?.activeOrganizers || 0}
                        trend={trends?.activeOrganizers}
                        icon={<TrendingUp className="h-5 w-5" />}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Card variant="glass" padding="lg">
                        <CardHeader title="Đăng ký theo ngày" subtitle={loading ? 'Đang tải...' : 'Xu hướng gần nhất'} />
                        <div className="space-y-2 text-sm">
                            {(chartData?.userRegistrationTrend || []).slice(-10).map((row) => (
                                <div key={row.date} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                                    <span className="text-gray-600">{row.date}</span>
                                    <span className="font-medium text-gray-900">{row.count}</span>
                                </div>
                            ))}
                            {!loading && (!chartData || chartData.userRegistrationTrend.length === 0) && (
                                <p className="text-gray-500">Không có dữ liệu.</p>
                            )}
                        </div>
                    </Card>

                    <Card variant="glass" padding="lg">
                        <CardHeader title="Phân bổ theo trạng thái" subtitle={loading ? 'Đang tải...' : 'Sự kiện theo status'} />
                        <div className="space-y-2 text-sm">
                            {statusRows.map((row) => (
                                <div key={row.status} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                                    <span className="capitalize text-gray-600">{row.status}</span>
                                    <span className="font-medium text-gray-900">
                                        {row.count} ({row.percentage}%)
                                    </span>
                                </div>
                            ))}
                            {!loading && statusRows.length === 0 && <p className="text-gray-500">Không có dữ liệu.</p>}
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
