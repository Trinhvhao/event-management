import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

interface TrainingPoint {
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
    points: TrainingPoint[];
}

interface MyPointsResponse {
    grand_total: number;
    total_events: number;
    semesters: SemesterPoints[];
    message: string;
}

interface TrainingPointsStatistics {
    [key: string]: unknown;
}

export const trainingPointsService = {
    async getMyPoints(): Promise<MyPointsResponse> {
        const response = await axios.get<ApiResponse<MyPointsResponse>>('/training-points/my-points');
        return response.data.data;
    },

    async getMyPointsHistory(): Promise<TrainingPoint[]> {
        const response = await axios.get<ApiResponse<TrainingPoint[]>>('/training-points/my-points/history');
        return response.data.data;
    },

    async getCurrentSemester(): Promise<{ semester: string }> {
        const response = await axios.get<ApiResponse<{ semester: string }>>('/training-points/current-semester');
        return response.data.data;
    },

    /** Admin: get a user's training points */
    async getUserPoints(userId: number): Promise<MyPointsResponse> {
        const response = await axios.get<ApiResponse<MyPointsResponse>>(`/training-points/user/${userId}`);
        return response.data.data;
    },

    /** Admin: get training points statistics */
    async getStatistics(): Promise<TrainingPointsStatistics> {
        const response = await axios.get<ApiResponse<TrainingPointsStatistics>>('/training-points/statistics');
        return response.data.data;
    },
};
