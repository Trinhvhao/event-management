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

interface ChartData {
    userRegistrationTrend: Array<{ date: string; count: number }>;
    eventsByCategory: Array<{ categoryId: string; categoryName: string; count: number }>;
    registrationsByDepartment: Array<{ departmentId: string; departmentName: string; count: number }>;
    eventStatusDistribution: Array<{ status: string; count: number; percentage: number }>;
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
                ...(filters.department_id && { department_id: filters.department_id }),
                ...(filters.category_id && { category_id: filters.category_id }),
            };

            const [metricsData, chartsData] = await Promise.all([
                adminStatisticsService.getDashboard(params),
                adminStatisticsService.getCharts(params),
            ]);

            set({
                metrics: metricsData.metrics,
                trends: metricsData.trends,
                chartData: chartsData,
                loading: false,
            });
        } catch (error) {
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
