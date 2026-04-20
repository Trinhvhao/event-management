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

interface UnreadCountResponse {
    unread_count?: number;
    count?: number;
}

export const notificationService = {
    async getAll(params?: { limit?: number; offset?: number; unread_only?: boolean }): Promise<NotificationsResponse> {
        const response = await axios.get<ApiResponse<NotificationsResponse>>('/notifications', { params });
        return response.data.data;
    },

    async getUnreadCount(): Promise<number> {
        const response = await axios.get<ApiResponse<UnreadCountResponse>>('/notifications/unread-count');
        return response.data.data.unread_count ?? response.data.data.count ?? 0;
    },

    async markAsRead(notificationId: number): Promise<void> {
        await axios.put(`/notifications/${notificationId}/read`);
    },

    async markAllAsRead(): Promise<void> {
        await axios.put('/notifications/read-all');
    },

    async delete(notificationId: number): Promise<void> {
        await axios.delete(`/notifications/${notificationId}`);
    },
};
