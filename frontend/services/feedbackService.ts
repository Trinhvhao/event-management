import axios from '@/lib/axios';
import { Feedback, ApiResponse } from '@/types';

interface FeedbackListResponse {
    feedbacks: (Feedback & { user?: { id: number | null; full_name: string; student_id: string | null } })[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
}

interface FeedbackSummary {
    event_id: number;
    total_feedbacks: number;
    average_rating: number;
    rating_distribution: Record<number, number>;
    anonymous_count: number;
    with_comment_count: number;
    with_suggestions_count: number;
}

interface TopRatedEvent {
    id: number;
    title: string;
    start_time: string;
    average_rating: number;
    feedback_count: number;
}

export const feedbackService = {
    /** Gửi đánh giá cho sự kiện (cần đã tham dự) */
    async submitFeedback(data: {
        event_id: number;
        rating: number;
        comment?: string;
        suggestions?: string;
        is_anonymous?: boolean;
    }): Promise<Feedback> {
        const response = await axios.post<ApiResponse<Feedback>>('/feedback', data);
        return response.data.data;
    },

    /** Lấy danh sách đánh giá của sự kiện (public) */
    async getEventFeedbacks(eventId: number, params?: { limit?: number; offset?: number }): Promise<FeedbackListResponse> {
        const response = await axios.get<ApiResponse<FeedbackListResponse>>(
            `/feedback/event/${eventId}`,
            { params }
        );
        return response.data.data;
    },

    /** Lấy đánh giá của mình cho sự kiện */
    async getMyFeedback(eventId: number): Promise<Feedback | null> {
        try {
            const response = await axios.get<ApiResponse<Feedback>>(`/feedback/my-feedback/${eventId}`);
            return response.data.data;
        } catch (error: unknown) {
            const err = error as { response?: { status?: number } };
            if (err.response?.status === 404) return null;
            throw error;
        }
    },

    /** Lấy tóm tắt đánh giá sự kiện (organizer/admin) */
    async getFeedbackSummary(eventId: number): Promise<FeedbackSummary> {
        const response = await axios.get<ApiResponse<FeedbackSummary>>(
            `/feedback/event/${eventId}/summary`
        );
        return response.data.data;
    },

    /** Lấy sự kiện được đánh giá cao nhất (public) */
    async getTopRatedEvents(limit?: number): Promise<TopRatedEvent[]> {
        const response = await axios.get<ApiResponse<TopRatedEvent[]>>(
            '/feedback/top-rated',
            { params: { limit } }
        );
        return response.data.data;
    },
};

export type { FeedbackListResponse, FeedbackSummary, TopRatedEvent };
