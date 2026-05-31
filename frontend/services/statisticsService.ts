import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

interface DashboardStats {
    total_events: number;
    total_registrations: number;
    total_attendances: number;
    check_in_rate: number;
    events_by_status: Record<string, number>;
    recent_events: Array<{ id: number; title: string; status: string; start_time: string }>;
    users_by_role: Array<{ role: string; count: number }>;
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
        const data = response.data.data;

        // Map camelCase BE response to snake_case FE interface
        return {
            total_events: (data as any).totalEvents ?? (data as any).total_events ?? 0,
            total_registrations: (data as any).totalRegistrations ?? (data as any).total_registrations ?? 0,
            total_attendances: (data as any).totalAttendances ?? (data as any).total_attendances ?? 0,
            check_in_rate: (data as any).checkInRate ?? (data as any).check_in_rate ?? 0,
            events_by_status: (data as any).events_by_status ?? (data as any).eventsByStatus ?? {},
            recent_events: (data as any).recentEvents ?? (data as any).recent_events ?? [],
            users_by_role: (data as any).usersByRole ?? (data as any).users_by_role ?? [],
        };
    },

    /** Thống kê organizer hiện tại */
    async getOrganizerStats(): Promise<OrganizerStats> {
        const response = await axios.get<ApiResponse<OrganizerStats>>('/statistics/my');
        const data = response.data.data;
        return {
            total_events: (data as any).totalEvents ?? (data as any).total_events ?? 0,
            total_registrations: (data as any).totalRegistrations ?? (data as any).total_registrations ?? 0,
            total_attendances: (data as any).totalAttendances ?? (data as any).total_attendances ?? 0,
            average_rating: (data as any).avgRating ?? (data as any).average_rating ?? 0,
            events_by_status: (data as any).events_by_status ?? (data as any).eventsByStatus ?? {},
        };
    },

    /** Thống kê sự kiện cụ thể */
    async getEventStats(eventId: number): Promise<EventStats> {
        const response = await axios.get<ApiResponse<EventStats>>(`/statistics/events/${eventId}`);
        const data = response.data.data;
        return {
            event_id: eventId,
            total_registrations: (data as any).registrations ?? (data as any).total_registrations ?? 0,
            total_attendances: (data as any).attendances ?? (data as any).total_attendances ?? 0,
            attendance_rate: (data as any).checkInRate ?? (data as any).attendance_rate ?? 0,
            average_rating: (data as any).avgRating ?? (data as any).average_rating ?? 0,
            feedback_count: (data as any).feedbackCount ?? (data as any).feedback_count ?? 0,
        };
    },

    /** Thống kê sinh viên (admin only) */
    async getStudentStats(): Promise<StudentStats> {
        const response = await axios.get<ApiResponse<StudentStats>>('/statistics/students');
        const data = response.data.data;
        return {
            total_students: (data as any).totalStudents ?? (data as any).total_students ?? 0,
            active_students: (data as any).activeStudents ?? (data as any).active_students ?? 0,
            top_students: (data as any).top_students ?? (data as any).topStudents ?? [],
        };
    },

    /** Thống kê theo khoa (admin only) */
    async getDepartmentStats(): Promise<DepartmentStats> {
        const response = await axios.get<ApiResponse<DepartmentStats>>('/statistics/departments');
        const data = response.data.data;
        // BE returns an array directly (not wrapped in object with departments key)
        const departments = Array.isArray(data) ? data : ((data as any).departments ?? []);
        return {
            departments: departments.map((d: any) => ({
                id: d.id,
                name: d.name,
                code: d.code,
                total_events: d.eventsCount ?? d.total_events ?? 0,
                total_registrations: d.registrationsCount ?? d.total_registrations ?? 0,
                total_attendances: d.total_attendances ?? 0,
            })),
        };
    },
};

export type { DashboardStats, OrganizerStats, EventStats, StudentStats, DepartmentStats };
