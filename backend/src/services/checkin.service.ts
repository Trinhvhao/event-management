import prisma from '../config/database';
import * as notificationsService from './notifications.service';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../middleware/errorHandler';

interface QRCodeData {
    registration_id: number;
    event_id: number;
    user_id: number;
    issued_at: string;
    expires_at: string;
}

export const checkinWithQR = async (qrCode: string, checkedBy: number, userRole: string) => {
    // Decode QR code
    let qrData: QRCodeData;
    try {
        // QR code is base64 encoded JSON
        const decoded = Buffer.from(qrCode.split(',')[1] || qrCode, 'base64').toString();
        qrData = JSON.parse(decoded);
    } catch (error) {
        throw new ValidationError('QR code không hợp lệ');
    }

    // Validate QR data structure
    if (!qrData.registration_id || !qrData.event_id || !qrData.user_id) {
        throw new ValidationError('QR code không đúng định dạng');
    }

    // Check if QR expired
    const now = new Date();
    const expiresAt = new Date(qrData.expires_at);
    if (now > expiresAt) {
        throw new ValidationError('QR code đã hết hạn');
    }

    // Get registration with event details
    const registration = await prisma.registration.findUnique({
        where: { id: qrData.registration_id },
        include: {
            event: true,
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    student_id: true,
                },
            },
        },
    });

    if (!registration) {
        throw new NotFoundError('Đăng ký không tồn tại');
    }

    // Validate registration matches QR data
    if (
        registration.event_id !== qrData.event_id ||
        registration.user_id !== qrData.user_id
    ) {
        throw new ValidationError('QR code không khớp với đăng ký');
    }

    // Security: Students can only check-in with their own QR code
    // Organizers and admins can check-in anyone
    if (userRole === 'student' && registration.user_id !== checkedBy) {
        throw new ForbiddenError('Bạn chỉ có thể check-in với QR code của chính mình');
    }

    // Check registration status
    if (registration.status === 'cancelled') {
        throw new ValidationError('Đăng ký đã bị hủy');
    }

    // Check time window
    const eventStartTime = registration.event.start_time;
    const eventEndTime = registration.event.end_time;

    if (now < eventStartTime) {
        throw new ValidationError('Chưa đến giờ check-in');
    }

    if (now > eventEndTime) {
        throw new ValidationError('Đã quá giờ check-in');
    }

    // Check if already checked in
    const existingAttendance = await prisma.attendance.findFirst({
        where: { registration_id: registration.id },
    });

    if (existingAttendance) {
        throw new ConflictError('Đã check-in rồi');
    }

    // Create attendance record and award training points in transaction
    const result = await prisma.$transaction(async (tx) => {
        // Create attendance
        const attendance = await tx.attendance.create({
            data: {
                registration_id: registration.id,
                checked_in_at: now,
                checked_by: checkedBy,
            },
            include: {
                registration: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                full_name: true,
                                email: true,
                                student_id: true,
                            },
                        },
                        event: true,
                    },
                },
            },
        });

        // Award training points
        const currentSemester = getCurrentSemester();
        await tx.trainingPoint.create({
            data: {
                user_id: registration.user_id,
                event_id: registration.event_id,
                points: registration.event.training_points,
                semester: currentSemester,
                earned_at: now,
            },
        });

        return attendance;
    });

    // Create notification for successful check-in
    try {
        await notificationsService.notifyCheckinSuccess(
            registration.user_id,
            registration.event_id,
            registration.event.title,
            registration.event.training_points
        );
    } catch (notifError) {
        console.error('Failed to create notification:', notifError);
    }

    return result;
};

export const getAttendanceByEvent = async (eventId: number) => {
    const attendances = await prisma.attendance.findMany({
        where: {
            registration: {
                event_id: eventId,
            },
        },
        include: {
            registration: {
                include: {
                    user: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true,
                            student_id: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            checked_in_at: 'desc',
        },
    });

    return attendances;
};

export const getAttendanceStats = async (eventId: number) => {
    const [totalRegistrations, totalAttendances] = await Promise.all([
        prisma.registration.count({
            where: {
                event_id: eventId,
                status: 'registered',
            },
        }),
        prisma.attendance.count({
            where: {
                registration: {
                    event_id: eventId,
                },
            },
        }),
    ]);

    const attendanceRate =
        totalRegistrations > 0
            ? Math.round((totalAttendances / totalRegistrations) * 100 * 100) / 100
            : 0;

    return {
        total_registrations: totalRegistrations,
        total_attendances: totalAttendances,
        attendance_rate: attendanceRate,
    };
};

// Helper function to get current semester
function getCurrentSemester(): string {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

    // Semester 1: September - January
    if (month >= 9 || month <= 1) {
        const academicYear = month >= 9 ? year : year - 1;
        return `${academicYear}-${academicYear + 1}-1`;
    }
    // Semester 2: February - June
    else if (month >= 2 && month <= 6) {
        return `${year - 1}-${year}-2`;
    }
    // Summer: July - August
    else {
        return `${year - 1}-${year}-summer`;
    }
}
