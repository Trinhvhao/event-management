'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CardHeader } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useStatisticsStore } from '@/store/statisticsStore';
import { DateRangePicker } from '@/components/admin/shared/DateRangePicker';
import { eventService } from '@/services/eventService';
import { Category, Department } from '@/types';
import { toast } from 'sonner';
import { BarChart3, Calendar, Users, TrendingUp, RefreshCw, Download, Activity, Award, ChevronDown, Layers3, Building2, Wallet, ReceiptText, Clock, DollarSign } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ComposedChart,
} from 'recharts';

// Brand color palette for charts
const CHART_COLORS = ['#00358F', '#F26600', '#00A651', '#FFB800', '#FF4000', '#7C3AED', '#06b6d4'];

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
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1">{label}</p>
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

// Custom tooltip for charts
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

// Chart wrapper component
function ChartCard({ title, subtitle, icon, children, className = '' }: {
    title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={`bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden ${className}`}>
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

export default function AdminStatisticsPage() {
    const {
        metrics, trends, chartData, loading, error, filters,
        fetchStatistics, updateDateRange, updateFilters, clearFilters,
    } = useStatisticsStore();

    // DEBUG: Log store data
    console.log('[AdminStats] Store metrics:', metrics);
    console.log('[AdminStats] Store chartData:', chartData);
    console.log('[AdminStats] Store trends:', trends);
    console.log('[AdminStats] Store loading:', loading);
    console.log('[AdminStats] Store error:', error);

    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
    const [isExporting, setIsExporting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    useEffect(() => { fetchStatistics(); }, [fetchStatistics]);

    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [categoryData, departmentData] = await Promise.all([
                    eventService.getCategories(),
                    eventService.getDepartments(),
                ]);
                setCategories(categoryData);
                setDepartments(departmentData);
            } catch (loadError) {
                console.error('Failed to load statistics filters:', loadError);
            }
        };

        void loadFilterOptions();
    }, []);

    // Apply date range filter
    useEffect(() => {
        updateDateRange(dateRange);
    }, [dateRange, updateDateRange]);

    const hasActiveFilters =
        Boolean(dateRange.from) ||
        Boolean(dateRange.to) ||
        Boolean(filters.category_id) ||
        Boolean(filters.department_id);

    // Helper to escape CSV field values
    const escapeCSVField = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Helper to format date for filename
    const formatDateForFilename = (date: Date | null): string => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    };

    // Build CSV content from current chart data
    const buildCSVContent = (): string => {
        const lines: string[] = [];

        // Section 1: Report header
        lines.push('Báo cáo Thống kê Quản trị');
        lines.push('');

        // Section 2: Date range
        const dateFrom = dateRange.from ? formatDateForFilename(dateRange.from) : 'Tất cả';
        const dateTo = dateRange.to ? formatDateForFilename(dateRange.to) : 'Tất cả';
        lines.push(`Khoảng thời gian,${escapeCSVField(dateFrom)} - ${escapeCSVField(dateTo)}`);
        lines.push('');

        // Section 3: KPI Metrics
        lines.push('--- Chỉ số KPI ---');
        lines.push('Thống kê,Giá trị,% thay đổi');
        const metricsData = metrics || {
            totalUsers: 0, totalEvents: 0, totalRegistrations: 0, activeOrganizers: 0
        };
        const trendsData = trends || {
            totalUsers: { percentage: 0, direction: 'neutral' as const },
            totalEvents: { percentage: 0, direction: 'neutral' as const },
            totalRegistrations: { percentage: 0, direction: 'neutral' as const },
            activeOrganizers: { percentage: 0, direction: 'neutral' as const },
        };
        lines.push(`Tổng người dùng,${metricsData.totalUsers},${trendsData.totalUsers.percentage}%`);
        lines.push(`Tổng sự kiện,${metricsData.totalEvents},${trendsData.totalEvents.percentage}%`);
        lines.push(`Tổng đăng ký,${metricsData.totalRegistrations},${trendsData.totalRegistrations.percentage}%`);
        lines.push(`Organizers hoạt động,${metricsData.activeOrganizers},${trendsData.activeOrganizers.percentage}%`);
        lines.push('');

        // Section 4: Registration Trend
        lines.push('--- Xu hướng đăng ký theo ngày ---');
        lines.push('Ngày,Số đăng ký');
        const registrationTrend = chartData?.userRegistrationTrend || [];
        if (registrationTrend.length > 0) {
            registrationTrend.forEach((row) => {
                lines.push(`${escapeCSVField(row.date)},${row.count}`);
            });
        } else {
            lines.push('Không có dữ liệu,');
        }
        lines.push('');

        // Section 5: Event Status Distribution
        lines.push('--- Phân bổ trạng thái sự kiện ---');
        lines.push('Trạng thái,Số lượng,Tỷ lệ %');
        const eventStatus = chartData?.eventStatusDistribution || [];
        if (eventStatus.length > 0) {
            eventStatus.forEach((row) => {
                lines.push(`${escapeCSVField(row.status)},${row.count},${row.percentage}%`);
            });
        } else {
            lines.push('Không có dữ liệu,,');
        }
        lines.push('');

        // Section 6: Events by Category
        lines.push('--- Sự kiện theo danh mục ---');
        lines.push('Danh mục,Số sự kiện');
        const eventsByCategory = chartData?.eventsByCategory || [];
        if (eventsByCategory.length > 0) {
            eventsByCategory.forEach((row) => {
                lines.push(`${escapeCSVField(row.categoryName || row.categoryId)},${row.count}`);
            });
        } else {
            lines.push('Không có dữ liệu,');
        }
        lines.push('');

        // Section 7: Registrations by Department
        lines.push('--- Đăng ký theo khoa ---');
        lines.push('Khoa,Số đăng ký');
        const registrationsByDept = chartData?.registrationsByDepartment || [];
        if (registrationsByDept.length > 0) {
            registrationsByDept.forEach((row) => {
                lines.push(`${escapeCSVField(row.departmentName || row.departmentId)},${row.count}`);
            });
        } else {
            lines.push('Không có dữ liệu,');
        }
        lines.push('');

        // Section 8: Payment KPIs
        lines.push('--- Chỉ số Thanh toán ---');
        const paymentData = (chartData?.paymentMetrics || {
            totalRevenue: 0,
            totalPaidCount: 0,
            totalPendingAmount: 0,
            totalPendingCount: 0,
            totalFailedAmount: 0,
            totalFailedCount: 0,
            averageOrderValue: 0,
        }) as {
            totalRevenue: number;
            totalPaidCount: number;
            totalPendingAmount: number;
            totalPendingCount: number;
            totalFailedAmount: number;
            totalFailedCount: number;
            averageOrderValue: number;
        };
        lines.push('Chỉ số,Giá trị');
        lines.push(`Tổng doanh thu,${(paymentData.totalRevenue || 0).toLocaleString('vi-VN')} VNĐ`);
        lines.push(`Giao dịch thành công,${paymentData.totalPaidCount || 0}`);
        lines.push(`Số tiền chờ thanh toán,${(paymentData.totalPendingAmount || 0).toLocaleString('vi-VN')} VNĐ`);
        lines.push(`Giao dịch đang chờ,${paymentData.totalPendingCount || 0}`);
        lines.push(`Số tiền thất bại,${(paymentData.totalFailedAmount || 0).toLocaleString('vi-VN')} VNĐ`);
        lines.push(`Giao dịch thất bại,${paymentData.totalFailedCount || 0}`);
        lines.push(`Giá trị TB/đơn,${(paymentData.averageOrderValue || 0).toLocaleString('vi-VN')} VNĐ`);
        lines.push('');

        // Section 9: Payment Trend
        lines.push('--- Doanh thu theo ngày ---');
        lines.push('Ngày,Doanh thu (VNĐ),Số giao dịch');
        const paymentTrend = chartData?.paymentTrend || [];
        if (paymentTrend.length > 0) {
            paymentTrend.forEach((row) => {
                lines.push(`${escapeCSVField(row.date)},${row.amount},${row.count}`);
            });
        } else {
            lines.push('Không có dữ liệu,,');
        }
        lines.push('');

        // Section 10: Monthly Payment Trend
        lines.push('--- Doanh thu theo tháng (Năm hiện tại) ---');
        lines.push('Tháng,Doanh thu (VNĐ),Số giao dịch');
        const monthlyTrend = chartData?.monthlyPaymentTrend || [];
        if (monthlyTrend.length > 0) {
            monthlyTrend.forEach((row) => {
                lines.push(`${escapeCSVField(row.month)},${row.amount},${row.count}`);
            });
        } else {
            lines.push('Không có dữ liệu,,');
        }
        lines.push('');

        // Section 11: Payment by Method
        lines.push('--- Doanh thu theo phương thức ---');
        lines.push('Phương thức,Số giao dịch,Doanh thu (VNĐ)');
        const paymentByMethod = chartData?.paymentByMethod || [];
        if (paymentByMethod.length > 0) {
            paymentByMethod.forEach((row) => {
                lines.push(`${escapeCSVField(row.method)},${row.count},${row.amount}`);
            });
        } else {
            lines.push('Không có dữ liệu,,');
        }
        lines.push('');

        // Section 12: Payment by Status
        lines.push('--- Giao dịch theo trạng thái ---');
        lines.push('Trạng thái,Số giao dịch,Số tiền (VNĐ)');
        const paymentByStatus = chartData?.paymentByStatus || [];
        if (paymentByStatus.length > 0) {
            paymentByStatus.forEach((row) => {
                lines.push(`${escapeCSVField(row.status)},${row.count},${row.amount}`);
            });
        } else {
            lines.push('Không có dữ liệu,,');
        }
        lines.push('');

        // Section 13: Top Events by Revenue
        lines.push('--- Top sự kiện theo doanh thu ---');
        lines.push('Sự kiện,Số giao dịch,Doanh thu (VNĐ)');
        const topEvents = chartData?.paymentByEvent || [];
        if (topEvents.length > 0) {
            topEvents.forEach((row) => {
                lines.push(`${escapeCSVField(row.eventName)},${row.count},${row.amount}`);
            });
        } else {
            lines.push('Không có dữ liệu,,');
        }
        lines.push('');

        // Section 14: Yearly Summary
        lines.push('--- Doanh thu theo năm ---');
        lines.push('Năm,Doanh thu (VNĐ),Số giao dịch');
        const yearlySummary = chartData?.yearlyPaymentSummary || [];
        if (yearlySummary.length > 0) {
            yearlySummary.forEach((row) => {
                lines.push(`${escapeCSVField(row.year)},${row.amount},${row.count}`);
            });
        } else {
            lines.push('Không có dữ liệu,,');
        }

        return lines.join('\n');
    };

    // Trigger CSV file download
    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await fetchStatistics();
            await new Promise((resolve) => setTimeout(resolve, 300));
            const csvContent = buildCSVContent();
            const today = new Date().toISOString().split('T')[0];
            const filename = `thong-ke-quan-tri-${today}.csv`;
            downloadCSV(csvContent, filename);
            toast.success('Đã xuất báo cáo thống kê thành công!');
        } catch (error) {
            toast.error('Không thể xuất báo cáo. Vui lòng thử lại.');
        } finally {
            setIsExporting(false);
        }
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

    // Events by category data for horizontal bar chart
    const categoryData = useMemo(() => {
        const rows = chartData?.eventsByCategory || [];
        return rows.map((row: { categoryId: string; categoryName: string; count: number }, i: number) => ({
            categoryName: row.categoryName || row.categoryId,
            count: row.count,
            fill: CHART_COLORS[i % CHART_COLORS.length],
        }));
    }, [chartData]);

    // Department radar chart data
    const radarData = useMemo(() => {
        const rows = chartData?.registrationsByDepartment || [];
        return rows.map((row: { departmentId: string; departmentName: string; count: number }, i: number) => ({
            department: row.departmentName || row.departmentId,
            count: row.count,
            fullMark: Math.max(...(chartData?.registrationsByDepartment || []).map((r: { count: number }) => r.count), 1),
            fill: CHART_COLORS[i % CHART_COLORS.length],
        }));
    }, [chartData]);

    // Status labels
    const STATUS_LABELS: Record<string, string> = {
        upcoming: 'Sắp diễn ra', ongoing: 'Đang diễn ra',
        completed: 'Đã kết thúc', cancelled: 'Đã hủy',
        pending: 'Chờ duyệt', approved: 'Đã duyệt',
    };

    // Payment status labels
    const PAYMENT_STATUS_LABELS: Record<string, string> = {
        pending: 'Chờ thanh toán',
        paid: 'Đã thanh toán',
        failed: 'Thất bại',
        cancelled: 'Đã hủy',
        expired: 'Hết hạn',
        refunded: 'Đã hoàn tiền',
    };

    // Payment method labels
    const PAYMENT_METHOD_LABELS: Record<string, string> = {
        payos: 'PayOS',
        vnpay: 'VNPay',
        bank_transfer: 'Chuyển khoản',
        cash: 'Tiền mặt',
    };

    // Payment data from chartData
    const paymentMetrics = chartData?.paymentMetrics || null;

    // Payment trend data for area chart (daily)
    const paymentTrendData = useMemo(() => {
        return (chartData?.paymentTrend || []).map((r: { date: string; amount: number; count: number }) => ({
            date: r.date,
            'Doanh thu (VNĐ)': r.amount,
            'Số giao dịch': r.count,
        }));
    }, [chartData]);

    // Monthly payment trend for current year
    const monthlyPaymentTrendData = useMemo(() => {
        return (chartData?.monthlyPaymentTrend || []).map((r: { month: string; amount: number; count: number }) => ({
            month: r.month,
            'Doanh thu (VNĐ)': r.amount,
            'Số giao dịch': r.count,
        }));
    }, [chartData]);

    // Yearly payment summary
    const yearlyPaymentData = useMemo(() => {
        return (chartData?.yearlyPaymentSummary || []).map((r: { year: string; amount: number; count: number }) => ({
            year: r.year,
            'Doanh thu (VNĐ)': r.amount,
            'Số giao dịch': r.count,
        }));
    }, [chartData]);

    // Payment by method pie chart
    const paymentByMethodData = useMemo(() => {
        const rows = chartData?.paymentByMethod || [];
        return rows.map((row: { method: string; count: number; amount: number }, i: number) => ({
            name: PAYMENT_METHOD_LABELS[row.method] || row.method,
            value: row.amount,
            count: row.count,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }));
    }, [chartData]);

    const totalPaymentByMethod = paymentByMethodData.reduce((s, r) => s + r.value, 0);

    // Payment by status data
    const paymentByStatusData = useMemo(() => {
        const rows = chartData?.paymentByStatus || [];
        return rows.map((row: { status: string; count: number; amount: number }, i: number) => ({
            name: PAYMENT_STATUS_LABELS[row.status] || row.status,
            value: row.count,
            amount: row.amount,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }));
    }, [chartData]);

    const totalPaymentByStatus = paymentByStatusData.reduce((s, r) => s + r.value, 0);

    // Payment by event data
    const paymentByEventData = useMemo(() => {
        const rows = chartData?.paymentByEvent || [];
        return rows.map((row: { eventId: number; eventName: string; count: number; amount: number }, i: number) => ({
            eventName: row.eventName,
            count: row.count,
            amount: row.amount,
            fill: CHART_COLORS[i % CHART_COLORS.length],
        }));
    }, [chartData]);

    // Format currency
    const formatCurrency = (value: number): string => {
        if (value >= 1_000_000_000) {
            return `${(value / 1_000_000_000).toFixed(1)}B`;
        }
        if (value >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(1)}M`;
        }
        if (value >= 1_000) {
            return `${(value / 1_000).toFixed(1)}K`;
        }
        return value.toLocaleString('vi-VN');
    };

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
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Admin</p>
                                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Thống kê quản trị</h1>
                                <p className="text-sm text-[var(--text-muted)]">Tổng hợp số liệu toàn hệ thống</p>
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
                                disabled={isExporting}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-navy)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                            >
                                {isExporting ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                {isExporting ? 'Đang xuất...' : 'Xuất báo cáo'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter row */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-card)]">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Khoảng thời gian</label>
                        <DateRangePicker value={dateRange} onChange={setDateRange} />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Danh mục</label>
                            <div className="relative h-[46px]">
                                <select
                                    value={filters.category_id}
                                    onChange={(e) => updateFilters({ category_id: e.target.value })}
                                    className="input-base w-full h-full appearance-none bg-transparent pl-11 pr-10 rounded-xl border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#00358F] focus:border-[#00358F] transition-all"
                                >
                                    <option value="">Tất cả danh mục</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                <Layers3 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Đơn vị</label>
                            <div className="relative h-[46px]">
                                <select
                                    value={filters.department_id}
                                    onChange={(e) => updateFilters({ department_id: e.target.value })}
                                    className="input-base w-full h-full appearance-none bg-transparent pl-11 pr-10 rounded-xl border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#00358F] focus:border-[#00358F] transition-all"
                                >
                                    <option value="">Tất cả đơn vị</option>
                                    {departments.map((department) => (
                                        <option key={department.id} value={department.id}>
                                            {department.name}
                                        </option>
                                    ))}
                                </select>
                                <Building2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                            </div>
                        </div>

                        {hasActiveFilters && (
                        <button
                            onClick={() => {
                                setDateRange({ from: null, to: null });
                                clearFilters();
                            }}
                            className="inline-flex h-[46px] items-center justify-center gap-1.5 self-end rounded-xl border border-[var(--color-brand-red)]/20 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] px-4 text-xs font-semibold text-[var(--color-brand-red)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)]"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
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

                {/* Charts Row 1: Registration Trends (Area) + Status Distribution (Donut) */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    {/* Registration Trend — Area Chart 2/3 width */}
                    <div className="xl:col-span-2">
                        <ChartCard
                            title="Xu hướng đăng ký"
                            subtitle="Đăng ký theo ngày gần nhất"
                            icon={<Activity className="w-4 h-4" />}
                        >
                            {loading || trendData.length === 0 ? (
                                <div className="flex items-center justify-center h-72">
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
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={trendData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00358F" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#00358F" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis 
                                            dataKey="date" 
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
                                            dataKey="đăng_ký" 
                                            stroke="#00358F" 
                                            strokeWidth={2.5} 
                                            fill="url(#colorReg)" 
                                            dot={false} 
                                            activeDot={{ r: 5, fill: '#00358F', strokeWidth: 0 }}
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                    </div>

                    {/* Status Distribution — Donut Chart 1/3 width */}
                    <div>
                        <ChartCard
                            title="Phân bổ trạng thái"
                            subtitle="Sự kiện theo status"
                            icon={<BarChart3 className="w-4 h-4" />}
                        >
                            {loading || statusData.length === 0 ? (
                                <div className="flex items-center justify-center h-72">
                                    {loading ? (
                                        <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)] text-center py-12">Chưa có dữ liệu</p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie 
                                                    data={statusData} 
                                                    cx="50%" 
                                                    cy="50%" 
                                                    innerRadius={60} 
                                                    outerRadius={90} 
                                                    paddingAngle={3} 
                                                    dataKey="value"
                                                    animationDuration={1200}
                                                    animationBegin={0}
                                                >
                                                    {statusData.map((entry, i) => (
                                                        <Cell 
                                                            key={entry.name} 
                                                            fill={entry.color} 
                                                            stroke="none"
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    content={<ChartTooltip />}
                                                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Center label */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-center">
                                                <p className="text-2xl font-extrabold text-[var(--text-primary)]">{totalStatus}</p>
                                                <p className="text-xs text-[var(--text-muted)]">Tổng sự kiện</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Legend */}
                                    <div className="space-y-2.5 mt-4">
                                        {statusData.map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                                                    <span className="text-[var(--text-secondary)] font-medium">
                                                        {STATUS_LABELS[entry.name] || entry.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[var(--text-muted)]">
                                                        {totalStatus > 0 ? ((entry.value / totalStatus) * 100).toFixed(1) : 0}%
                                                    </span>
                                                    <span className="font-bold text-[var(--text-primary)]">{entry.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </ChartCard>
                    </div>
                </div>

                {/* Charts Row 2: Events by Category (Horizontal Bar) + Department Comparison (Radar) */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {/* Events by Category — Horizontal Bar Chart */}
                    <ChartCard
                        title="Sự kiện theo danh mục"
                        subtitle="Phân bổ theo categories"
                        icon={<Calendar className="w-4 h-4" />}
                    >
                        {loading || categoryData.length === 0 ? (
                            <div className="flex items-center justify-center h-72">
                                {loading ? (
                                    <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                ) : (
                                    <p className="text-sm text-[var(--text-muted)] text-center">Chưa có dữ liệu</p>
                                )}
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart layout="vertical" data={categoryData} margin={{ left: 20, right: 20 }}>
                                    <defs>
                                        {categoryData.map((entry, i) => (
                                            <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor={entry.fill} stopOpacity={0.8} />
                                                <stop offset="100%" stopColor={entry.fill} stopOpacity={1} />
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
                                        dataKey="categoryName" 
                                        tick={{ fontSize: 12, fill: '#374151' }} 
                                        width={120} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <Tooltip 
                                        content={<ChartTooltip />}
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                                        cursor={{ fill: '#f1f5f9' }}
                                    />
                                    <Bar 
                                        dataKey="count" 
                                        radius={[0, 6, 6, 0]} 
                                        barSize={20} 
                                        animationDuration={1500}
                                        background={{ fill: '#f8fafc' }}
                                    >
                                        {categoryData.map((entry, i) => (
                                            <Cell 
                                                key={entry.categoryName} 
                                                fill={`url(#barGrad${i})`}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    {/* Department Comparison — Radar Chart */}
                    <ChartCard
                        title="So sánh theo khoa"
                        subtitle="Đăng ký theo department"
                        icon={<Users className="w-4 h-4" />}
                    >
                        {loading || radarData.length === 0 ? (
                            <div className="flex items-center justify-center h-72">
                                {loading ? (
                                    <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                ) : (
                                    <p className="text-sm text-[var(--text-muted)] text-center">Chưa có dữ liệu</p>
                                )}
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis 
                                        dataKey="department" 
                                        tick={{ fontSize: 11, fill: '#64748b' }} 
                                    />
                                    <PolarRadiusAxis 
                                        tick={{ fontSize: 10, fill: '#94a3b8' }} 
                                        axisLine={false}
                                    />
                                    <Radar
                                        name="Đăng ký"
                                        dataKey="count"
                                        stroke="#00358F"
                                        fill="#00358F"
                                        fillOpacity={0.3}
                                        strokeWidth={2}
                                        animationDuration={1500}
                                    />
                                    <Tooltip 
                                        content={<ChartTooltip />}
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
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
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Ngày</th>
                                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Số đăng ký</th>
                                    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">% Tổng</th>
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

                {/* Payment Statistics Section */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-gradient-to-r from-[var(--color-brand-green)]/8 via-transparent to-transparent p-6 shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-green)] via-[var(--color-brand-gold)] to-transparent" />
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-green)] to-[#008f47] flex items-center justify-center shadow-[var(--shadow-brand)]">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-green)]">Thống kê</p>
                            <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">Quản lý Thanh toán</h2>
                            <p className="text-sm text-[var(--text-muted)]">Theo dõi doanh thu và giao dịch</p>
                        </div>
                    </div>

                    {/* Payment KPI Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
                        {/* Total Revenue */}
                        <div className="bg-white rounded-xl border border-[var(--border-default)] p-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">Tổng doanh thu</p>
                                    {loading ? (
                                        <Skeleton width={100} height={28} />
                                    ) : (
                                        <p className="text-xl font-extrabold text-[var(--color-brand-green)]">
                                            {formatCurrency(paymentMetrics?.totalRevenue || 0)}<span className="text-xs font-normal text-[var(--text-muted)] ml-1">VNĐ</span>
                                        </p>
                                    )}
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        {paymentMetrics?.totalPaidCount || 0} giao dịch thành công
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-green)_12%,transparent)] flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-[var(--color-brand-green)]" />
                                </div>
                            </div>
                        </div>

                        {/* Pending Amount */}
                        <div className="bg-white rounded-xl border border-[var(--border-default)] p-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">Chờ thanh toán</p>
                                    {loading ? (
                                        <Skeleton width={100} height={28} />
                                    ) : (
                                        <p className="text-xl font-extrabold text-[var(--color-brand-orange)]">
                                            {formatCurrency(paymentMetrics?.totalPendingAmount || 0)}<span className="text-xs font-normal text-[var(--text-muted)] ml-1">VNĐ</span>
                                        </p>
                                    )}
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        {paymentMetrics?.totalPendingCount || 0} giao dịch đang chờ
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-orange)_12%,transparent)] flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-[var(--color-brand-orange)]" />
                                </div>
                            </div>
                        </div>

                        {/* Failed Amount */}
                        <div className="bg-white rounded-xl border border-[var(--border-default)] p-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">Giao dịch thất bại</p>
                                    {loading ? (
                                        <Skeleton width={100} height={28} />
                                    ) : (
                                        <p className="text-xl font-extrabold text-[var(--color-brand-red)]">
                                            {formatCurrency(paymentMetrics?.totalFailedAmount || 0)}<span className="text-xs font-normal text-[var(--text-muted)] ml-1">VNĐ</span>
                                        </p>
                                    )}
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        {paymentMetrics?.totalFailedCount || 0} giao dịch thất bại
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] flex items-center justify-center">
                                    <ReceiptText className="w-5 h-5 text-[var(--color-brand-red)]" />
                                </div>
                            </div>
                        </div>

                        {/* Average Order Value */}
                        <div className="bg-white rounded-xl border border-[var(--border-default)] p-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">Giá trị TB</p>
                                    {loading ? (
                                        <Skeleton width={100} height={28} />
                                    ) : (
                                        <p className="text-xl font-extrabold text-[var(--color-brand-navy)]">
                                            {formatCurrency(paymentMetrics?.averageOrderValue || 0)}<span className="text-xs font-normal text-[var(--text-muted)] ml-1">VNĐ</span>
                                        </p>
                                    )}
                                    <p className="text-xs text-[var(--text-muted)] mt-1">/Giao dịch</p>
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-navy)_12%,transparent)] flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-[var(--color-brand-navy)]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Charts Row 1: Daily Revenue + Monthly Revenue */}
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-6">
                        {/* Daily Payment Trend */}
                        <ChartCard
                            title="Doanh thu theo ngày"
                            subtitle="Biến động doanh thu hàng ngày"
                            icon={<DollarSign className="w-4 h-4" />}
                        >
                            {loading || paymentTrendData.length === 0 ? (
                                <div className="flex items-center justify-center h-64">
                                    {loading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-green)] animate-spin" />
                                            <span className="text-sm text-[var(--text-muted)] font-medium">Đang tải dữ liệu...</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)] text-center py-12">Chưa có dữ liệu doanh thu</p>
                                    )}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <ComposedChart data={paymentTrendData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00A651" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#00A651" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value) => formatCurrency(value)}
                                        />
                                        <Tooltip
                                            content={<ChartTooltip />}
                                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="Doanh thu (VNĐ)"
                                            stroke="#00A651"
                                            strokeWidth={2.5}
                                            fill="url(#colorRevenue)"
                                            dot={false}
                                            activeDot={{ r: 5, fill: '#00A651', strokeWidth: 0 }}
                                            animationDuration={1500}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>

                        {/* Monthly Revenue Trend (Current Year) */}
                        <ChartCard
                            title="Doanh thu theo tháng"
                            subtitle="Năm hiện tại"
                            icon={<Calendar className="w-4 h-4" />}
                        >
                            {loading || monthlyPaymentTrendData.length === 0 ? (
                                <div className="flex items-center justify-center h-64">
                                    {loading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-green)] animate-spin" />
                                            <span className="text-sm text-[var(--text-muted)] font-medium">Đang tải dữ liệu...</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)] text-center py-12">Chưa có dữ liệu</p>
                                    )}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={monthlyPaymentTrendData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="barGradPayment" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#00A651" stopOpacity={0.8} />
                                                <stop offset="100%" stopColor="#00A651" stopOpacity={1} />
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
                                            tickFormatter={(value) => formatCurrency(value)}
                                        />
                                        <Tooltip
                                            content={<ChartTooltip />}
                                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                                            formatter={(value) => [formatCurrency(Number(value) || 0) + ' VNĐ', 'Doanh thu']}
                                        />
                                        <Bar
                                            dataKey="Doanh thu (VNĐ)"
                                            fill="url(#barGradPayment)"
                                            radius={[6, 6, 0, 0]}
                                            barSize={28}
                                            animationDuration={1500}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                    </div>

                    {/* Payment Charts Row 2: By Method + By Status */}
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-6">
                        {/* Payment by Method */}
                        <ChartCard
                            title="Theo phương thức"
                            subtitle="Phân bổ doanh thu theo phương thức thanh toán"
                            icon={<Wallet className="w-4 h-4" />}
                        >
                            {loading || paymentByMethodData.length === 0 ? (
                                <div className="flex items-center justify-center h-64">
                                    {loading ? (
                                        <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-green)] animate-spin" />
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
                                                    data={paymentByMethodData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={75}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    animationDuration={1200}
                                                    animationBegin={0}
                                                >
                                                    {paymentByMethodData.map((entry, i) => (
                                                        <Cell
                                                            key={entry.name}
                                                            fill={entry.color}
                                                            stroke="none"
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    content={<ChartTooltip />}
                                                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                                                    formatter={(value) => [formatCurrency(Number(value) || 0) + ' VNĐ', 'Doanh thu']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-center">
                                                <p className="text-xl font-extrabold text-[var(--text-primary)]">{formatCurrency(totalPaymentByMethod)}</p>
                                                <p className="text-xs text-[var(--text-muted)]">Tổng</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2.5 mt-4">
                                        {paymentByMethodData.map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                                                    <span className="text-[var(--text-secondary)] font-medium">{entry.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-[var(--text-muted)]">{entry.count} giao dịch</span>
                                                    <span className="font-bold text-[var(--text-primary)]">{formatCurrency(entry.value)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </ChartCard>

                        {/* Payment by Status */}
                        <ChartCard
                            title="Theo trạng thái"
                            subtitle="Phân bổ giao dịch theo trạng thái"
                            icon={<ReceiptText className="w-4 h-4" />}
                        >
                            {loading || paymentByStatusData.length === 0 ? (
                                <div className="flex items-center justify-center h-64">
                                    {loading ? (
                                        <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-green)] animate-spin" />
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
                                                    data={paymentByStatusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={75}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    animationDuration={1200}
                                                    animationBegin={0}
                                                >
                                                    {paymentByStatusData.map((entry, i) => (
                                                        <Cell
                                                            key={entry.name}
                                                            fill={entry.color}
                                                            stroke="none"
                                                        />
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
                                                <p className="text-xl font-extrabold text-[var(--text-primary)]">{totalPaymentByStatus}</p>
                                                <p className="text-xs text-[var(--text-muted)]">Tổng GD</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2.5 mt-4">
                                        {paymentByStatusData.map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                                                    <span className="text-[var(--text-secondary)] font-medium">{entry.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-[var(--text-muted)]">{formatCurrency(entry.amount)}</span>
                                                    <span className="font-bold text-[var(--text-primary)]">{entry.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </ChartCard>
                    </div>

                    {/* Yearly Summary + Top Events */}
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {/* Yearly Payment Summary */}
                        <ChartCard
                            title="Theo năm"
                            subtitle="Doanh thu qua các năm"
                            icon={<TrendingUp className="w-4 h-4" />}
                        >
                            {loading || yearlyPaymentData.length === 0 ? (
                                <div className="flex items-center justify-center h-64">
                                    {loading ? (
                                        <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-green)] animate-spin" />
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)] text-center">Chưa có dữ liệu</p>
                                    )}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={yearlyPaymentData} margin={{ left: 10, right: 10 }}>
                                        <defs>
                                            <linearGradient id="yearBarGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#00A651" stopOpacity={0.8} />
                                                <stop offset="100%" stopColor="#00A651" stopOpacity={1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis
                                            dataKey="year"
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value) => formatCurrency(value)}
                                        />
                                        <Tooltip
                                            content={<ChartTooltip />}
                                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                                            formatter={(value) => [formatCurrency(Number(value) || 0) + ' VNĐ', 'Doanh thu']}
                                        />
                                        <Bar
                                            dataKey="Doanh thu (VNĐ)"
                                            fill="url(#yearBarGrad)"
                                            radius={[6, 6, 0, 0]}
                                            barSize={40}
                                            animationDuration={1500}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>

                        {/* Top Events by Revenue */}
                        <ChartCard
                            title="Top sự kiện"
                            subtitle="Doanh thu cao nhất theo sự kiện"
                            icon={<Calendar className="w-4 h-4" />}
                        >
                            {loading || paymentByEventData.length === 0 ? (
                                <div className="flex items-center justify-center h-64">
                                    {loading ? (
                                        <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-green)] animate-spin" />
                                    ) : (
                                        <p className="text-sm text-[var(--text-muted)] text-center">Chưa có dữ liệu</p>
                                    )}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart layout="vertical" data={paymentByEventData} margin={{ left: 20, right: 20 }}>
                                        <defs>
                                            {paymentByEventData.map((entry, i) => (
                                                <linearGradient key={i} id={`eventBarGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor={entry.fill} stopOpacity={0.8} />
                                                    <stop offset="100%" stopColor={entry.fill} stopOpacity={1} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value) => formatCurrency(value)}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="eventName"
                                            tick={{ fontSize: 11, fill: '#374151' }}
                                            width={100}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            content={<ChartTooltip />}
                                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                                            formatter={(value) => [formatCurrency(Number(value) || 0) + ' VNĐ', 'Doanh thu']}
                                            cursor={{ fill: '#f1f5f9' }}
                                        />
                                        <Bar
                                            dataKey="amount"
                                            radius={[0, 6, 6, 0]}
                                            barSize={16}
                                            animationDuration={1500}
                                        >
                                            {paymentByEventData.map((entry, i) => (
                                                <Cell
                                                    key={entry.eventName}
                                                    fill={`url(#eventBarGrad${i})`}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                    </div>

                    {/* Payment Detail Table */}
                    <div className="mt-6 bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                        <div className="px-5 pt-5 pb-0 border-b border-[var(--border-light)]">
                            <CardHeader title="Chi tiết theo ngày" subtitle="Doanh thu và giao dịch gần đây" icon={<ReceiptText className="w-5 h-5" />} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[var(--bg-muted)]">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Ngày</th>
                                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Doanh thu</th>
                                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Số giao dịch</th>
                                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">% Tổng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-light)]">
                                    {(chartData?.paymentTrend || []).slice(-10).reverse().map((row: { date: string; amount: number; count: number }) => {
                                        const total = (chartData?.paymentTrend || []).reduce((s: number, r: { amount: number }) => s + r.amount, 0);
                                        const pct = total > 0 ? ((row.amount / total) * 100).toFixed(1) : '0.0';
                                        return (
                                            <tr key={row.date} className="hover:bg-[color-mix(in_srgb,var(--color-brand-green)_3%,transparent)] transition-colors">
                                                <td className="px-5 py-3 text-sm font-medium text-[var(--text-secondary)]">{row.date}</td>
                                                <td className="px-5 py-3 text-right text-sm font-bold text-[var(--color-brand-green)]">{row.amount.toLocaleString('vi-VN')} VNĐ</td>
                                                <td className="px-5 py-3 text-right text-sm font-bold text-[var(--text-primary)]">{row.count.toLocaleString('vi-VN')}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden max-w-[120px]">
                                                            <div className="h-full rounded-full bg-[var(--color-brand-green)]" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-xs text-[var(--text-muted)] font-medium w-12 text-right">{pct}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {!loading && (!chartData?.paymentTrend || chartData.paymentTrend.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-14 gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                        <Wallet className="w-7 h-7 text-[var(--text-muted)]" />
                                    </div>
                                    <p className="text-sm font-semibold text-[var(--text-secondary)]">Không có dữ liệu thanh toán</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
