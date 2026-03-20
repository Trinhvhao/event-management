import axios from '@/lib/axios';
import { Feedback, ApiResponse } from '@/types';

export const feedbackService = {
    async create(data: { event_id: number; rating: number; comment?: string }): Promise<Feedback> {
        const response = await axios.post<ApiResponse<Feedback>>('/feedback', data);
        return response.data.data;
    },

    async getByEvent(eventId: number): Promise<Feedback[]> {
        const response = await axios.get<ApiResponse<Feedback[]>>(`/feedback/event/${eventId}`);
        return response.data.data;
    },

    async getMyFeedbacks(): Promise<Feedback[]> {
        const response = await axios.get<ApiResponse<Feedback[]>>('/feedback/my');
        return response.data.data;
    },
};
