import axios from '@/lib/axios';
import { Notification, ApiResponse } from '@/types';

interface NotificationsResponse {
    notifications: Notification[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
    message: string;
}

export const notificationService = {
    async getAll(params?: { limit?: number; offset?: number }): Promise<NotificationsResponse> {
        const response = await axios.get<ApiResponse<NotificationsResponse>>('/notifications', { params });
        return response.data.data;
    },

    async markAsRead(notificationId: number): Promise<void> {
        await axios.put(`/notifications/${notificationId}/read`);
    },

    async markAllAsRead(): Promise<void> {
        await axios.put('/notifications/read-all');
    },
};
