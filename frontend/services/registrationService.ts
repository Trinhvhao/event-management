import axios from '@/lib/axios';
import { Registration, ApiResponse } from '@/types';

export const registrationService = {
    async register(eventId: number): Promise<Registration> {
        const response = await axios.post<ApiResponse<Registration>>('/registrations', {
            event_id: eventId,
        });
        return response.data.data;
    },

    async cancel(registrationId: number): Promise<void> {
        await axios.delete(`/registrations/${registrationId}`);
    },

    async getMyRegistrations(): Promise<Registration[]> {
        const response = await axios.get<ApiResponse<Registration[]>>('/registrations/my');
        return response.data.data;
    },

    async getEventRegistrations(eventId: number): Promise<Registration[]> {
        const response = await axios.get<ApiResponse<Registration[]>>(
            `/registrations/event/${eventId}`
        );
        return response.data.data;
    },
};
