import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

interface DashboardStats {
    total_events: number;
    total_registrations: number;
    total_attendances: number;
    check_in_rate: number;
    events_by_status: Record<string, number>;
    recent_events: Array<{ id: number; title: string; status: string; start_time: string }>;
}

interface OrganizerStats {
    total_events: number;
    total_registrations: number;
    total_attendances: number;
    average_rating: number;
    events_by_status: Record<string, number>;
}

interface EventStats {
    event_id: number;
    total_registrations: number;
    total_attendances: number;
    attendance_rate: number;
    average_rating: number;
    feedback_count: number;
}

interface StudentStats {
    total_students: number;
    active_students: number;
    top_students: Array<{ id: number; full_name: string; total_points: number; events_attended: number }>;
}

interface DepartmentStats {
    departments: Array<{
        id: number;
        name: string;
        code: string;
        total_events: number;
        total_registrations: number;
        total_attendances: number;
    }>;
}

export const statisticsService = {
    /** Thống kê dashboard (admin/organizer) */
    async getDashboard(): Promise<DashboardStats> {
        const response = await axios.get<ApiResponse<DashboardStats>>('/statistics/dashboard');
        return response.data.data;
    },

    /** Thống kê organizer hiện tại */
    async getOrganizerStats(): Promise<OrganizerStats> {
        const response = await axios.get<ApiResponse<OrganizerStats>>('/statistics/my');
        return response.data.data;
    },

    /** Thống kê sự kiện cụ thể */
    async getEventStats(eventId: number): Promise<EventStats> {
        const response = await axios.get<ApiResponse<EventStats>>(`/statistics/events/${eventId}`);
        return response.data.data;
    },

    /** Thống kê sinh viên (admin only) */
    async getStudentStats(): Promise<StudentStats> {
        const response = await axios.get<ApiResponse<StudentStats>>('/statistics/students');
        return response.data.data;
    },

    /** Thống kê theo khoa (admin only) */
    async getDepartmentStats(): Promise<DepartmentStats> {
        const response = await axios.get<ApiResponse<DepartmentStats>>('/statistics/departments');
        return response.data.data;
    },
};

export type { DashboardStats, OrganizerStats, EventStats, StudentStats, DepartmentStats };
