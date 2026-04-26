import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

interface TrainingPointRecord {
    id: number;
    user_id: number;
    event_id: number;
    points: number;
    semester: string;
    earned_at: string;
    event: {
        id: number;
        title: string;
        start_time: string;
        category_id: number;
    };
}

interface SemesterPoints {
    semester: string;
    total_points: number;
    events_count: number;
    points: TrainingPointRecord[];
}

interface MyPointsResponse {
    grand_total: number;
    total_events: number;
    semesters: SemesterPoints[];
    message?: string;
}

interface UserSummary {
    id: number;
    full_name: string;
    email?: string;
    student_id: string | null;
}

interface UserTrainingPointsResponse extends MyPointsResponse {
    user: UserSummary;
}

interface PointsHistoryResponse {
    points: TrainingPointRecord[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
    message?: string;
}

interface PointsHistoryQuery {
    semester?: string;
    limit?: number;
    offset?: number;
}

interface TrainingPointsStatistics {
    total_points_awarded: number;
    total_users_with_points: number;
    top_users: Array<{
        user: UserSummary | null;
        total_points: number;
    }>;
    semester_statistics: Array<{
        semester: string;
        total_points: number;
        events_count: number;
    }>;
    message?: string;
}

interface AwardTrainingPointsPayload {
    user_id: number;
    event_id: number;
    points?: number;
    semester?: string;
}

interface AwardTrainingPointsResponse {
    id: number;
    user_id: number;
    event_id: number;
    points: number;
    semester: string;
    earned_at: string;
    user: {
        id: number;
        full_name: string;
        student_id: string | null;
    };
    event: {
        id: number;
        title: string;
    };
}

interface ExportTrainingPointsQuery {
    semester?: string;
    event_id?: number;
    user_id?: number;
}

interface ExportTrainingPointsRecord {
    id: number;
    user_id: number;
    student_id: string | null;
    full_name: string;
    email: string;
    event_id: number;
    event_title: string;
    points: number;
    semester: string;
    earned_at: string;
}

interface ExportTrainingPointsResponse {
    total_records: number;
    total_points: number;
    filters: {
        semester?: string;
        event_id?: number;
        user_id?: number;
        scope: 'admin' | 'organizer' | 'student';
    };
    records: ExportTrainingPointsRecord[];
}

export const trainingPointsService = {
    async getMyPoints(): Promise<MyPointsResponse> {
        const response = await axios.get<ApiResponse<MyPointsResponse>>('/training-points/my-points');
        return (response.data as any).data ?? response.data;
    },

    async getMyPointsHistory(params?: PointsHistoryQuery): Promise<PointsHistoryResponse> {
        const response = await axios.get<ApiResponse<PointsHistoryResponse>>('/training-points/my-points/history', {
            params,
        });
        return (response.data as any).data ?? response.data;
    },

    async getCurrentSemester(): Promise<{ semester: string }> {
        const response = await axios.get<ApiResponse<{ semester: string }>>('/training-points/current-semester');
        return response.data.data;
    },

    /** Admin: get a user's training points */
    async getUserPoints(userId: number): Promise<UserTrainingPointsResponse> {
        const response = await axios.get<ApiResponse<UserTrainingPointsResponse>>(`/training-points/user/${userId}`);
        return (response.data as any).data ?? response.data;
    },

    /** Admin: get training points statistics */
    async getStatistics(): Promise<TrainingPointsStatistics> {
        const response = await axios.get<ApiResponse<TrainingPointsStatistics>>('/training-points/statistics');
        return (response.data as any).data ?? response.data;
    },

    /** Organizer/Admin: award training points for an attended event */
    async awardPoints(payload: AwardTrainingPointsPayload): Promise<AwardTrainingPointsResponse> {
        const response = await axios.post<ApiResponse<AwardTrainingPointsResponse>>('/training-points/award', payload);
        return response.data.data;
    },

    /** Organizer/Admin: export training points dataset (json) */
    async exportPoints(params?: ExportTrainingPointsQuery): Promise<ExportTrainingPointsResponse> {
        const response = await axios.get<ApiResponse<ExportTrainingPointsResponse>>('/training-points/export', {
            params: {
                ...params,
                format: 'json',
            },
        });
        return (response.data as any).data ?? response.data;
    },

    /** Organizer/Admin: export training points dataset (csv blob) */
    async exportPointsCsv(params?: ExportTrainingPointsQuery): Promise<Blob> {
        const response = await axios.get('/training-points/export', {
            params: {
                ...params,
                format: 'csv',
            },
            responseType: 'blob',
        });

        return response.data as Blob;
    },
};

export type {
    TrainingPointRecord,
    SemesterPoints,
    MyPointsResponse,
    UserTrainingPointsResponse,
    PointsHistoryResponse,
    TrainingPointsStatistics,
    AwardTrainingPointsPayload,
    AwardTrainingPointsResponse,
    PointsHistoryQuery,
    ExportTrainingPointsQuery,
    ExportTrainingPointsResponse,
};
