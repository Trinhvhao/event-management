'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { analyticsService, TimeSeriesData, DepartmentData } from '@/services/analyticsService';
import { toast } from 'sonner';

// Brand-aligned color palette
const COLORS = ['#00358F', '#F26600', '#00A651', '#FFB800', '#FF4000', '#6b7280', '#8b5cf6', '#06b6d4'];

export default function DashboardCharts() {
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
    const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
    const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasAnalyticsError, setHasAnalyticsError] = useState(false);
    const errorToastShownRef = useRef(false);

    const loadAnalyticsData = useCallback(async () => {
        try {
            setLoading(true);
            setHasAnalyticsError(false);

            const [timeSeries, departments] = await Promise.all([
                analyticsService.getTimeSeriesAnalytics(timeRange),
                analyticsService.getDepartmentDistribution(),
            ]);

            setTimeSeriesData(timeSeries);
            setDepartmentData(departments);
            errorToastShownRef.current = false;
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            setHasAnalyticsError(true);
            setTimeSeriesData([]);
            setDepartmentData([]);

            if (!errorToastShownRef.current) {
                toast.error('Không thể tải dữ liệu analytics');
                errorToastShownRef.current = true;
            }
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        loadAnalyticsData();
    }, [loadAnalyticsData]);

    const totalDept = departmentData.reduce((sum, item) => sum + item.value, 0);
    const departmentDataWithColors = departmentData.map((item, index) => ({
        ...item,
        color: COLORS[index % COLORS.length],
    }));

    const chartCardClass = 'bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden';
    const sectionTitle = 'text-base font-bold text-[var(--text-primary)]';
    const sectionSub = 'text-xs text-[var(--text-muted)] mt-0.5';
    const filterBtnBase = 'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200';
    const filterBtnActive = 'bg-[var(--color-brand-navy)] text-white shadow-sm';
    const filterBtnInactive = 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]';

    const loadingEl = (
        <div className="flex items-center justify-center" style={{ height: '320px' }}>
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-xl border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                <span className="text-sm text-[var(--text-muted)] font-medium">Đang tải dữ liệu...</span>
            </div>
        </div>
    );

    const emptyStateEl = (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Không có dữ liệu biểu đồ</p>
            <p className="text-xs text-[var(--text-muted)]">Dữ liệu sẽ hiển thị khi có sự kiện được tạo.</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Combo Chart — Events & Participation */}
            <div className="lg:col-span-2">
                <div className={chartCardClass}>
                    {/* Card header */}
                    <div className="px-6 pt-5 pb-0 flex items-center justify-between border-b border-[var(--border-light)]">
                        <div className="flex items-center gap-3 pb-4">
                            <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                                <TrendingUp className="w-4.5 h-4.5 text-[var(--color-brand-navy)]" />
                            </div>
                            <div>
                                <h3 className={sectionTitle}>Phân tích sự kiện</h3>
                                <p className={sectionSub}>Tổng quan sự kiện & lượt đăng ký</p>
                            </div>
                        </div>

                        {/* Time range filter */}
                        <div className="flex bg-[var(--bg-muted)] rounded-lg p-1 mb-4">
                            {(['week', 'month', 'year'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`${filterBtnBase} ${timeRange === range ? filterBtnActive : filterBtnInactive}`}
                                >
                                    {range === 'week' ? 'Tuần' : range === 'month' ? 'Tháng' : 'Năm'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="px-6 py-5">
                        {loading ? loadingEl : hasAnalyticsError || timeSeriesData.length === 0 ? emptyStateEl : (
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={timeSeriesData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gradEvents" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00358F" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#00358F" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradRegs" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#F26600" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#F26600" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                                        <XAxis
                                            dataKey="period"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: '12px',
                                                boxShadow: 'var(--shadow-lg)',
                                                fontSize: '13px',
                                            }}
                                            cursor={{ fill: 'color-mix(in srgb, var(--color-brand-light) 30%, transparent)' }}
                                        />
                                        <Legend
                                            wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontWeight: 600 }}
                                            iconType="circle"
                                            iconSize={8}
                                        />
                                        <Bar
                                            yAxisId="left"
                                            dataKey="events"
                                            fill="url(#gradEvents)"
                                            radius={[6, 6, 0, 0]}
                                            name="Sự kiện"
                                            barSize={28}
                                        />
                                        <Bar
                                            yAxisId="left"
                                            dataKey="registrations"
                                            fill="url(#gradRegs)"
                                            radius={[6, 6, 0, 0]}
                                            name="Đăng ký"
                                            barSize={28}
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="checkins"
                                            stroke="#00A651"
                                            strokeWidth={2.5}
                                            dot={{ fill: '#00A651', r: 3 }}
                                            name="Check-in"
                                            activeDot={{ r: 5, fill: '#00A651', strokeWidth: 0 }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pie Chart — Events by Department */}
            <div>
                <div className={chartCardClass}>
                    <div className="px-6 pt-5 pb-0 flex items-center justify-between border-b border-[var(--border-light)]">
                        <div className="flex items-center gap-3 pb-4">
                            <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,transparent)] flex items-center justify-center">
                                <Calendar className="w-4.5 h-4.5 text-[var(--color-brand-orange)]" />
                            </div>
                            <div>
                                <h3 className={sectionTitle}>Theo đơn vị</h3>
                                <p className={sectionSub}>Phân bổ sự kiện</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-5">
                        {loading ? loadingEl : departmentData.length === 0 ? emptyStateEl : (
                            <>
                                <div style={{ height: '200px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={departmentDataWithColors}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={52}
                                                outerRadius={82}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {departmentDataWithColors.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'white',
                                                    border: '1px solid var(--border-default)',
                                                    borderRadius: '12px',
                                                    boxShadow: 'var(--shadow-lg)',
                                                    fontSize: '13px',
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Legend list */}
                                <div className="space-y-2.5 mt-2">
                                    {departmentDataWithColors.map((item, index) => {
                                        const percentage = totalDept > 0 ? ((item.value / totalDept) * 100).toFixed(1) : '0.0';
                                        return (
                                            <div key={index} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    <span className="text-sm text-[var(--text-secondary)] font-medium truncate max-w-[120px]">{item.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[var(--text-muted)]">{percentage}%</span>
                                                    <span className="text-sm font-bold text-[var(--text-primary)]">{item.value}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
