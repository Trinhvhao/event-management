import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

export type BadgeType = 'streak' | 'milestone' | 'achievement' | 'rank';

export interface Badge {
    id: number;
    code: string;
    name: string;
    description: string;
    type: BadgeType;
    icon: string;
    color: string;
    threshold?: number;
    awarded_at: string;
}

export interface LeaderboardEntry {
    rank: number;
    user_id: number;
    full_name: string;
    student_id: string | null;
    department_name: string | null;
    total_points: number;
    total_events: number;
    badges_count: number;
    avatar_color: string;
}

export interface DepartmentLeaderboardEntry {
    department_id: number;
    department_name: string;
    department_code: string;
    total_points: number;
    total_events: number;
    unique_participants: number;
    avg_points: number;
    rank: number;
}

export interface MyBadgesResponse {
    badges: Badge[];
    total: number;
}

export interface LeaderboardResponse {
    data: LeaderboardEntry[];
}

export interface DepartmentLeaderboardResponse {
    data: DepartmentLeaderboardEntry[];
}

export const gamificationService = {
    async getLeaderboard(params?: { limit?: number; semester?: string; department_id?: number }): Promise<LeaderboardEntry[]> {
        const response = await axios.get<ApiResponse<LeaderboardEntry[]>>('/gamification/leaderboard', { params });
        return (response.data as any).data ?? response.data.data ?? [];
    },

    async getDepartmentLeaderboard(params?: { semester?: string }): Promise<DepartmentLeaderboardEntry[]> {
        const response = await axios.get<ApiResponse<DepartmentLeaderboardEntry[]>>('/gamification/leaderboard/departments', { params });
        return (response.data as any).data ?? response.data.data ?? [];
    },

    async getMyBadges(): Promise<MyBadgesResponse> {
        const response = await axios.get<ApiResponse<MyBadgesResponse>>('/gamification/my-badges');
        return (response.data as any).data ?? response.data.data;
    },

    async getUserBadges(userId: number): Promise<MyBadgesResponse> {
        const response = await axios.get<ApiResponse<MyBadgesResponse>>(`/gamification/user/${userId}/badges`);
        return (response.data as any).data ?? response.data.data;
    },
};
