import axios from '@/lib/axios';

interface StatisticsQuery {
    dateFrom?: string;
    dateTo?: string;
    department_id?: string;
    category_id?: string;
}

export const adminStatisticsService = {
    async getDashboard(params?: StatisticsQuery) {
        const response = await axios.get('/admin/statistics/dashboard', { params });
        return response.data;
    },

    async getCharts(params?: StatisticsQuery) {
        const response = await axios.get('/admin/statistics/charts', { params });
        return response.data;
    },
};
