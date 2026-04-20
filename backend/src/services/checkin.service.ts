import prisma from '../config/database';
import { UserRole } from '@prisma/client';
import * as notificationsService from './notifications.service';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../middleware/errorHandler';

interface QRCodeData {
    registration_id: number;
    event_id: number;
    user_id: number;
    issued_at?: string;
    expires_at?: string;
}

type RequesterContext = {
    id: number;
    role: UserRole;
};

interface RegistrationWithRelations {
    id: number;
    user_id: number;
    event_id: number;
    registered_at: Date;
    status: string;
    qr_code: string;
    event: {
        id: number;
        title: string;
        start_time: Date;
        end_time: Date;
        training_points: number;
        status: 'pending' | 'approved' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
        organizer_id: number;
        deleted_at: Date | null;
    };
    user: {
        id: number;
        full_name: string;
        email: string;
        student_id: string | null;
    };
}

const buildRegistrationInclude = () => ({
    event: {
        select: {
            id: true,
            title: true,
            start_time: true,
            end_time: true,
            training_points: true,
            status: true,
            organizer_id: true,
            deleted_at: true,
        },
    },
    user: {
        select: {
            id: true,
            full_name: true,
            email: true,
            student_id: true,
        },
    },
});

const tryParseQrPayload = (rawPayload: string): QRCodeData | null => {
    try {
        const parsed = JSON.parse(rawPayload) as QRCodeData;

        if (!parsed.registration_id || !parsed.event_id || !parsed.user_id) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
};

const decodeQrPayload = (qrCode: string): QRCodeData | null => {
    const normalized = qrCode.trim();
    if (!normalized) {
        return null;
    }

    if (normalized.startsWith('{')) {
        return tryParseQrPayload(normalized);
    }

    const encodedPayload = normalized.split(',')[1] || normalized;
    try {
        const decoded = Buffer.from(encodedPayload, 'base64').toString('utf8');
        return tryParseQrPayload(decoded);
    } catch {
        return null;
    }
};

const assertRequesterCanManageEvent = (
    registration: RegistrationWithRelations,
    checkedBy: number,
    userRole: UserRole
) => {
    if (registration.event.deleted_at) {
        throw new NotFoundError('Event');
    }

    if (userRole === 'organizer' && registration.event.organizer_id !== checkedBy) {
        throw new ForbiddenError('Bạn không có quyền check-in cho sự kiện này');
    }
};

const assertEventCanCheckin = (registration: RegistrationWithRelations, now: Date) => {
    if (registration.event.status !== 'ongoing') {
        throw new ValidationError('Sự kiện chưa ở trạng thái đang diễn ra');
    }

    if (now < registration.event.start_time) {
        throw new ValidationError('Chưa đến giờ check-in');
    }

    if (now > registration.event.end_time) {
        throw new ValidationError('Đã quá giờ check-in');
    }
};

const completeCheckin = async (registration: RegistrationWithRelations, checkedBy: number) => {
    const now = new Date();

    const attendance = await prisma.$transaction(async (tx) => {
        const existingAttendance = await tx.attendance.findUnique({
            where: { registration_id: registration.id },
        });

        if (existingAttendance) {
            throw new ConflictError('Đã check-in rồi');
        }

        const createdAttendance = await tx.attendance.create({
            data: {
                registration_id: registration.id,
                checked_in_at: now,
                checked_by: checkedBy,
            },
            include: {
                registration: {
                    include: buildRegistrationInclude(),
                },
            },
        });

        const currentSemester = getCurrentSemester();
        await tx.trainingPoint.upsert({
            where: {
                user_id_event_id: {
                    user_id: registration.user_id,
                    event_id: registration.event_id,
                },
            },
            create: {
                user_id: registration.user_id,
                event_id: registration.event_id,
                points: registration.event.training_points,
                semester: currentSemester,
                earned_at: now,
            },
            update: {
                points: registration.event.training_points,
            },
        });

        return createdAttendance;
    });

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

    return attendance;
};

const processCheckinForRegistration = async (
    registration: RegistrationWithRelations,
    checkedBy: number,
    userRole: UserRole
) => {
    assertRequesterCanManageEvent(registration, checkedBy, userRole);

    if (registration.status !== 'registered') {
        throw new ValidationError('Đăng ký đã bị hủy');
    }

    assertEventCanCheckin(registration, new Date());

    return completeCheckin(registration, checkedBy);
};

export const checkinWithQR = async (qrCode: string, checkedBy: number, userRole: UserRole) => {
    const normalizedQrCode = qrCode.trim();
    if (!normalizedQrCode) {
        throw new ValidationError('QR code không được để trống');
    }

    const qrData = decodeQrPayload(normalizedQrCode);
    let registration: RegistrationWithRelations | null = null;

    if (qrData) {
        registration = (await prisma.registration.findUnique({
            where: { id: qrData.registration_id },
            include: buildRegistrationInclude(),
        })) as RegistrationWithRelations | null;

        if (!registration) {
            throw new NotFoundError('Registration');
        }

        if (registration.event_id !== qrData.event_id || registration.user_id !== qrData.user_id) {
            throw new ValidationError('QR code không khớp với đăng ký');
        }
    } else {
        registration = (await prisma.registration.findFirst({
            where: { qr_code: normalizedQrCode },
            include: buildRegistrationInclude(),
        })) as RegistrationWithRelations | null;
    }

    if (!registration) {
        throw new ValidationError('QR code không hợp lệ');
    }

    return processCheckinForRegistration(registration, checkedBy, userRole);
};

export const checkinManual = async (
    params: {
        eventId: number;
        registrationId?: number;
        studentId?: string;
    },
    checkedBy: number,
    userRole: UserRole
) => {
    const { eventId, registrationId, studentId } = params;

    if (!registrationId && !studentId) {
        throw new ValidationError('Cần cung cấp registration_id hoặc student_id');
    }

    let registration: RegistrationWithRelations | null = null;

    if (registrationId) {
        registration = (await prisma.registration.findUnique({
            where: { id: registrationId },
            include: buildRegistrationInclude(),
        })) as RegistrationWithRelations | null;

        if (!registration) {
            throw new NotFoundError('Registration');
        }

        if (registration.event_id !== eventId) {
            throw new ValidationError('registration_id không thuộc event_id đã chọn');
        }
    } else {
        const student = await prisma.user.findFirst({
            where: {
                student_id: studentId,
                role: 'student',
            },
            select: { id: true },
        });

        if (!student) {
            throw new NotFoundError('User');
        }

        registration = (await prisma.registration.findFirst({
            where: {
                event_id: eventId,
                user_id: student.id,
            },
            include: buildRegistrationInclude(),
        })) as RegistrationWithRelations | null;

        if (!registration) {
            throw new NotFoundError('Registration');
        }
    }

    return processCheckinForRegistration(registration, checkedBy, userRole);
};

const assertEventAttendanceAccess = async (eventId: number, requester: RequesterContext) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            organizer_id: true,
            deleted_at: true,
        },
    });

    if (!event || event.deleted_at) {
        throw new NotFoundError('Event');
    }

    if (requester.role === 'organizer' && event.organizer_id !== requester.id) {
        throw new ForbiddenError('Bạn không có quyền xem điểm danh của sự kiện này');
    }
};

export const getAttendanceByEvent = async (eventId: number, requester: RequesterContext) => {
    await assertEventAttendanceAccess(eventId, requester);

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

export const getAttendanceStats = async (eventId: number, requester: RequesterContext) => {
    await assertEventAttendanceAccess(eventId, requester);

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
