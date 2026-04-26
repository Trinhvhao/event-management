import axios from '@/lib/axios';
import { ApiResponse } from '@/types';

type AttendanceStatus = 'checked_in' | 'checked_out';

interface CheckinResult {
    attendance: {
        id: number;
        registration_id: number;
        checked_in_at: string;
        checked_out_at: string | null;
        status: AttendanceStatus;
        checked_by: number;
    };
    student: { id: number; full_name: string; email: string; student_id?: string };
    event: { id: number; title: string; training_points: number };
}

interface AttendanceRecord {
    id: number;
    registration_id: number;
    checked_in_at: string;
    checked_out_at: string | null;
    status: AttendanceStatus;
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

interface AttendanceDetail extends AttendanceRecord {
    checker?: {
        id: number;
        full_name: string;
    };
    registration: AttendanceRecord['registration'] & {
        event?: {
            id: number;
            title: string;
            organizer_id?: number;
        };
    };
}

interface AttendanceStats {
    total_registrations: number;
    total_attendances: number;
    total_checkouts: number;
    active_checkins: number;
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

    /** Check-in thủ công bằng registration_id hoặc student_id + event_id */
    async processManualCheckin(payload: ManualCheckinPayload): Promise<CheckinResult> {
        const response = await axios.post<ApiResponse<CheckinResult>>('/checkin/manual', payload);
        return response.data.data;
    },

    /** Lấy danh sách điểm danh theo sự kiện */
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

    /** Lấy chi tiết 1 bản ghi điểm danh */
    async getAttendance(attendanceId: number): Promise<AttendanceDetail> {
        const response = await axios.get<ApiResponse<AttendanceDetail>>(
            `/checkin/${attendanceId}`
        );
        return response.data.data;
    },

    /** Check-out sinh viên đã check-in */
    async checkoutAttendance(attendanceId: number): Promise<{ attendance: AttendanceRecord }> {
        const response = await axios.post<ApiResponse<{ attendance: AttendanceRecord }>>(
            `/checkin/${attendanceId}/checkout`
        );
        return response.data.data;
    },

    /** Hủy bản ghi điểm danh (undo) */
    async undoAttendance(attendanceId: number): Promise<{ deleted: boolean; attendanceId: number }> {
        const response = await axios.delete<ApiResponse<{ deleted: boolean; attendanceId: number }>>(
            `/checkin/${attendanceId}`
        );
        return response.data.data;
    },
};

export type { CheckinResult, AttendanceRecord, AttendanceStats };
export type { AttendanceDetail };
