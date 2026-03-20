import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

interface CheckinResult {
    attendance: { id: number; registration_id: number; checked_in_at: string };
    user: { id: number; full_name: string; email: string; student_id?: string };
    event: { id: number; title: string };
    pointsAwarded: number;
}

interface CheckinStats {
    totalRegistrations: number;
    totalCheckedIn: number;
    checkInRate: number;
    recentCheckins: {
        id: number;
        checked_in_at: string;
        user: { id: number; full_name: string; student_id?: string };
    }[];
}

export const checkinService = {
    async processCheckin(qrData: string): Promise<CheckinResult> {
        const response = await axios.post<ApiResponse<CheckinResult>>('/checkin', {
            qr_data: qrData,
        });
        return response.data.data;
    },

    async getEventStats(eventId: number): Promise<CheckinStats> {
        const response = await axios.get<ApiResponse<CheckinStats>>(
            `/checkin/event/${eventId}/stats`
        );
        return response.data.data;
    },
};
