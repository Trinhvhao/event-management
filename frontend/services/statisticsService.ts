import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

interface DashboardStats {
    totalEvents: number;
    totalUsers: number;
    totalRegistrations: number;
    totalAttendances: number;
    eventsByStatus: { status: string; count: number }[];
    usersByRole: { role: string; count: number }[];
    checkInRate: number;
}

export const statisticsService = {
    async getDashboard(): Promise<DashboardStats> {
        const response = await axios.get<ApiResponse<DashboardStats>>(
            '/statistics/dashboard'
        );
        return response.data.data;
    },

    async getEventStats(eventId: number): Promise<{
        registrations: number;
        attendances: number;
        checkInRate: number;
        avgRating: number;
        feedbackCount: number;
    }> {
        const response = await axios.get<ApiResponse<any>>(
            `/statistics/events/${eventId}`
        );
        return response.data.data;
    },
};
