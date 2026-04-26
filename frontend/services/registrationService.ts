import axios from '@/lib/axios';
import { Registration, ApiResponse } from '@/types';

interface RegistrationQRCodePayload {
    registration_id: number;
    event_id: number;
    status: 'registered' | 'cancelled';
    registered_at: string;
    qr_code: string;
}

interface WaitlistPositionResponse {
    in_waitlist: boolean;
    position?: number;
    status?: string;
    total_waitlist?: number;
    event_id?: number;
    event_title?: string;
}

interface WaitlistEntry {
    id: number;
    event_id: number;
    user_id: number;
    position: number;
    status: string;
    created_at: string;
    event?: {
        id: number;
        title: string;
        start_time: string;
        end_time: string;
        location: string;
    };
    user?: {
        id: number;
        full_name: string;
        email: string;
    };
}

interface RegistrationWithRelations extends Registration {
    user?: {
        id: number;
        full_name: string;
        email: string;
        student_id?: string;
    };
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

            if (status === 403) {
                return [];
            }

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

    async getRegistrationById(registrationId: number): Promise<RegistrationWithRelations> {
        const response = await axios.get<ApiResponse<RegistrationWithRelations>>(
            `/registrations/${registrationId}`
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

    // Waitlist methods
    async joinWaitlist(eventId: number): Promise<WaitlistEntry> {
        const response = await axios.post<ApiResponse<WaitlistEntry>>(
            `/registrations/waitlist/${eventId}`
        );
        return response.data.data;
    },

    async leaveWaitlist(eventId: number): Promise<void> {
        await axios.delete(`/registrations/waitlist/${eventId}`);
    },

    async getWaitlistPosition(eventId: number): Promise<WaitlistPositionResponse> {
        try {
            const response = await axios.get<ApiResponse<WaitlistPositionResponse>>(
                `/registrations/waitlist/${eventId}`
            );
            return response.data.data;
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response?.status;

            if (status === 403 || status === 404) {
                return { in_waitlist: false };
            }

            throw error;
        }
    },

    async getEventWaitlist(eventId: number): Promise<WaitlistEntry[]> {
        const response = await axios.get<ApiResponse<WaitlistEntry[]>>(
            `/registrations/event/${eventId}/waitlist`
        );
        return response.data.data;
    },
};

export type { RegistrationQRCodePayload, WaitlistPositionResponse, WaitlistEntry, RegistrationWithRelations };
