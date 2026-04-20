import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

interface CheckinResult {
    attendance: { id: number; registration_id: number; checked_in_at: string };
    student: { id: number; full_name: string; email: string; student_id?: string };
    event: { id: number; title: string; training_points: number };
}

interface AttendanceRecord {
    id: number;
    registration_id: number;
    checked_in_at: string;
    checked_by: number;
    registration: {
        user: {
            id: number;
            full_name: string;
            email: string;
            student_id?: string;
        };
    };
}

interface AttendanceStats {
    total_registrations: number;
    total_attendances: number;
    attendance_rate: number;
}

interface ManualCheckinPayload {
    event_id: number;
    registration_id?: number;
    student_id?: string;
}

export const checkinService = {
    /** Check-in bằng QR scan */
    async processCheckin(qrCode: string): Promise<CheckinResult> {
        const response = await axios.post<ApiResponse<CheckinResult>>('/checkin/scan', {
            qr_code: qrCode,
        });
        return response.data.data;
    },

    /** Check-in thủ công theo registration_id hoặc student_id + event_id */
    async processManualCheckin(payload: ManualCheckinPayload): Promise<CheckinResult> {
        const response = await axios.post<ApiResponse<CheckinResult>>('/checkin/manual', payload);
        return response.data.data;
    },

    /** Lấy danh sách đã check-in theo sự kiện */
    async getEventAttendances(eventId: number): Promise<AttendanceRecord[]> {
        const response = await axios.get<ApiResponse<AttendanceRecord[]>>(
            `/checkin/event/${eventId}`
        );
        return response.data.data;
    },

    /** Lấy thống kê điểm danh theo sự kiện */
    async getAttendanceStats(eventId: number): Promise<AttendanceStats> {
        const response = await axios.get<ApiResponse<AttendanceStats>>(
            `/checkin/event/${eventId}/stats`
        );
        return response.data.data;
    },
};

export type { CheckinResult, AttendanceRecord, AttendanceStats };
