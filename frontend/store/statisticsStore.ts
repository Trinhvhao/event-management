import { create } from 'zustand';
import { adminStatisticsService } from '@/services/adminStatisticsService';

interface Metrics {
    totalUsers: number;
    totalEvents: number;
    totalRegistrations: number;
    activeOrganizers: number;
}

interface Trend {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'neutral';
}

interface Trends {
    totalUsers: Trend;
    totalEvents: Trend;
    totalRegistrations: Trend;
    activeOrganizers: Trend;
}

interface PaymentMetrics {
    totalRevenue: number;
    totalPaidCount: number;
    totalPendingAmount: number;
    totalPendingCount: number;
    totalFailedAmount: number;
    totalFailedCount: number;
    averageOrderValue: number;
}

interface ChartData {
    userRegistrationTrend: Array<{ date: string; count: number }>;
    eventsByCategory: Array<{ categoryId: string; categoryName: string; count: number }>;
    registrationsByDepartment: Array<{ departmentId: string; departmentName: string; count: number }>;
    eventStatusDistribution: Array<{ status: string; count: number; percentage: number }>;
    paymentMetrics: PaymentMetrics;
    paymentTrend: Array<{ date: string; amount: number; count: number }>;
    paymentByMethod: Array<{ method: string; count: number; amount: number }>;
    paymentByStatus: Array<{ status: string; count: number; amount: number }>;
    paymentByEvent: Array<{ eventId: number; eventName: string; count: number; amount: number }>;
    monthlyPaymentTrend: Array<{ month: string; amount: number; count: number }>;
    yearlyPaymentSummary: Array<{ year: string; amount: number; count: number }>;
}

interface DateRange {
    from: Date | null;
    to: Date | null;
}

interface StatisticsFilters {
    department_id: string;
    category_id: string;
}

interface StatisticsState {
    metrics: Metrics | null;
    trends: Trends | null;
    chartData: ChartData | null;
    dateRange: DateRange;
    filters: StatisticsFilters;
    loading: boolean;
    error: string | null;

    // Actions
    fetchStatistics: () => Promise<void>;
    updateDateRange: (range: DateRange) => void;
    updateFilters: (filters: Partial<StatisticsFilters>) => void;
    clearFilters: () => void;
    retry: () => Promise<void>;
}

const toErrorMessage = (error: unknown): string => {
    const err = error as {
        response?: { data?: { message?: string; error?: { message?: string } } };
        message?: string;
    };

    return (
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Request failed'
    );
};

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
    metrics: null,
    trends: null,
    chartData: null,
    dateRange: {
        from: null,
        to: null,
    },
    filters: {
        department_id: '',
        category_id: '',
    },
    loading: false,
    error: null,

    fetchStatistics: async () => {
        set({ loading: true, error: null });
        try {
            const { dateRange, filters } = get();
            const params = {
                ...(dateRange.from && { dateFrom: dateRange.from.toISOString() }),
                ...(dateRange.to && { dateTo: dateRange.to.toISOString() }),
                ...(filters.department_id && { department_id: Number(filters.department_id) || undefined }),
                ...(filters.category_id && { category_id: Number(filters.category_id) || undefined }),
            };

            console.log('[StatisticsStore] Fetching with params:', params);

            const [metricsData, chartsData] = await Promise.all([
                adminStatisticsService.getDashboard(params),
                adminStatisticsService.getCharts(params),
            ]);

            console.log('[StatisticsStore] metricsData:', JSON.stringify(metricsData, null, 2));
            console.log('[StatisticsStore] chartsData:', JSON.stringify(chartsData, null, 2));
            console.log('[StatisticsStore] chartsData keys:', Object.keys(chartsData || {}));

            // Service already extracts response.data.data, so:
            // metricsData = { metrics: {...}, trends: {...} }
            // chartsData = { userRegistrationTrend: [...], eventStatusDistribution: [...], ... }

            const metrics = metricsData.metrics ?? null;
            const trends = metricsData.trends ?? null;

            console.log('[StatisticsStore] Setting metrics:', metrics);
            console.log('[StatisticsStore] Setting trends:', trends);
            console.log('[StatisticsStore] Setting chartData:', chartsData);

            set({
                metrics: metrics,
                trends: trends,
                chartData: chartsData,
                loading: false,
            });
        } catch (error) {
            console.error('[StatisticsStore] Error:', error);
            set({ error: toErrorMessage(error), loading: false });
        }
    },

    updateDateRange: (range) => {
        set({ dateRange: range });
        get().fetchStatistics();
    },

    updateFilters: (newFilters) => {
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
        }));
        get().fetchStatistics();
    },

    clearFilters: () => {
        set({
            dateRange: { from: null, to: null },
            filters: { department_id: '', category_id: '' },
        });
        get().fetchStatistics();
    },

    retry: async () => {
        await get().fetchStatistics();
    },
}));
