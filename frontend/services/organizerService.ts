import axios from '@/lib/axios';

interface GetOrganizersParams {
    page?: number;
    limit?: number;
    search?: string;
    department_id?: string;
    status?: string;
    eventsCreatedMin?: number;
    eventsCreatedMax?: number;
    totalAttendeesMin?: number;
    totalAttendeesMax?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

interface OrganizerMetrics {
    eventsCreated: number;
    totalAttendees: number;
    averageRating: number;
    upcomingEvents: number;
    completedEvents: number;
    eventsByCategory?: Array<{ categoryId: string; categoryName: string; count: number }>;
    attendanceTrend?: Array<{ month: string; count: number }>;
    ratingTrend?: Array<{ month: string; rating: number }>;
}

export const organizerService = {
    // Get organizers with filters and pagination
    async getOrganizers(params: GetOrganizersParams) {
        const response = await axios.get('/admin/organizers', { params });
        return response.data;
    },

    // Grant organizer rights to a user
    async grantOrganizerRights(userId: string) {
        const response = await axios.post('/admin/organizers/grant', { userId: Number(userId) });
        return response.data.data;
    },

    // Revoke organizer rights from a user
    async revokeOrganizerRights(userId: string) {
        const response = await axios.delete(`/admin/organizers/${Number(userId)}/revoke`);
        return response.data.data;
    },

    // Get detailed metrics for an organizer
    async getOrganizerMetrics(
        organizerId: string,
        params?: { dateFrom?: string; dateTo?: string }
    ): Promise<OrganizerMetrics> {
        const response = await axios.get(`/admin/organizers/${organizerId}/metrics`, { params });
        return response.data.data;
    },
};
