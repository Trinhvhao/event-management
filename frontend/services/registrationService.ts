import axios from '@/lib/axios';
import { Registration, ApiResponse } from '@/types';

interface RegistrationQRCodePayload {
    registration_id: number;
    event_id: number;
    status: 'registered' | 'cancelled';
    registered_at: string;
    qr_code: string;
}

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
        try {
            const response = await axios.get<ApiResponse<Registration[]>>('/registrations/my');
            return response.data.data;
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response?.status;

            if (status !== 404) {
                throw error;
            }

            const fallback = await axios.get<ApiResponse<Registration[]>>('/registrations/my-registrations');
            return fallback.data.data;
        }
    },

    async getEventRegistrations(eventId: number): Promise<Registration[]> {
        const response = await axios.get<ApiResponse<Registration[]>>(
            `/registrations/event/${eventId}`
        );
        return response.data.data;
    },

    async getRegistrationQRCode(registrationId: number): Promise<RegistrationQRCodePayload> {
        try {
            const response = await axios.get<ApiResponse<RegistrationQRCodePayload>>(
                `/registrations/${registrationId}/qrcode`
            );
            return response.data.data;
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response?.status;

            if (status !== 404) {
                throw error;
            }

            const fallback = await axios.get<ApiResponse<RegistrationQRCodePayload>>(
                `/registrations/${registrationId}/qr`
            );
            return fallback.data.data;
        }
    },
};
