import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

interface StatisticsQuery {
    dateFrom?: string;
    dateTo?: string;
    department_id?: number;
    category_id?: number;
}

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

interface DashboardStatisticsPayload {
    metrics: Metrics;
    trends: {
        totalUsers: Trend;
        totalEvents: Trend;
        totalRegistrations: Trend;
        activeOrganizers: Trend;
    };
}

interface ChartsStatisticsPayload {
    userRegistrationTrend: Array<{ date: string; count: number }>;
    eventsByCategory: Array<{ categoryId: string; categoryName: string; count: number }>;
    registrationsByDepartment: Array<{ departmentId: string; departmentName: string; count: number }>;
    eventStatusDistribution: Array<{ status: string; count: number; percentage: number }>;
}

export const adminStatisticsService = {
    async getDashboard(params?: StatisticsQuery): Promise<DashboardStatisticsPayload> {
        // Map FE string params to BE integer params
        const apiParams: Record<string, string | number | undefined> = { ...params };
        if (apiParams.department_id) apiParams.department_id = Number(apiParams.department_id) || undefined;
        if (apiParams.category_id) apiParams.category_id = Number(apiParams.category_id) || undefined;

        const response = await axios.get<ApiResponse<DashboardStatisticsPayload>>('/admin/statistics/dashboard', { params: apiParams });
        return response.data.data;
    },

    async getCharts(params?: StatisticsQuery): Promise<ChartsStatisticsPayload> {
        const apiParams: Record<string, string | number | undefined> = { ...params };
        if (apiParams.department_id) apiParams.department_id = Number(apiParams.department_id) || undefined;
        if (apiParams.category_id) apiParams.category_id = Number(apiParams.category_id) || undefined;

        const response = await axios.get<ApiResponse<ChartsStatisticsPayload>>('/admin/statistics/charts', { params: apiParams });
        return response.data.data;
    },
};
