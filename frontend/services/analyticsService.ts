import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

export interface TimeSeriesData {
    period: string;
    events: number;
    registrations: number;
    checkins: number;
}

export interface DepartmentData {
    name: string;
    value: number;
}

const getStatusCode = (error: unknown) => {
    const err = error as { response?: { status?: number } };
    return err.response?.status;
};

let analyticsRouteUnavailable = false;

const getWithFallback = async <T>(paths: string[], fallbackValue: T) => {
    if (analyticsRouteUnavailable) {
        return fallbackValue;
    }

    let lastError: unknown = null;

    for (const path of paths) {
        try {
            const response = await axios.get<ApiResponse<T>>(path);
            analyticsRouteUnavailable = false;
            return response.data.data;
        } catch (error) {
            lastError = error;
            const status = getStatusCode(error);

            // Try next endpoint candidate only when route is missing.
            if (status === 404) {
                continue;
            }

            throw error;
        }
    }

    if (getStatusCode(lastError) === 404) {
        analyticsRouteUnavailable = true;
        return fallbackValue;
    }

    throw lastError;
};

export const analyticsService = {
    async getTimeSeriesAnalytics(timeRange: 'week' | 'month' | 'year' = 'month'): Promise<TimeSeriesData[]> {
        return getWithFallback<TimeSeriesData[]>([
            `/analytics/time-series?timeRange=${timeRange}`,
        ], []);
    },

    async getDepartmentDistribution(): Promise<DepartmentData[]> {
        return getWithFallback<DepartmentData[]>([
            '/analytics/department-distribution',
        ], []);
    },
};
