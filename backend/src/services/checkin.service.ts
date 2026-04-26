import prisma from '../config/database';
import { UserRole, AttendanceStatus } from '@prisma/client';
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
    attendance?: {
        id: number;
        checked_in_at: Date;
        checked_out_at: Date | null;
        status: AttendanceStatus;
        checked_by: number;
    } | null;
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
    attendance: true,
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
    const { start_time, end_time, status } = registration.event;

    if (status !== 'ongoing' && status !== 'completed') {
        throw new ValidationError('Sự kiện chưa bắt đầu hoặc đã kết thúc');
    }

    if (now < start_time) {
        const minutesUntil = Math.ceil((start_time.getTime() - now.getTime()) / 60000);
        throw new ValidationError(`Chưa đến giờ check-in. Còn ${minutesUntil} phút nữa mới được check-in.`);
    }

    if (now > end_time) {
        throw new ValidationError(`Đã hết giờ check-in. Sự kiện kết thúc lúc ${formatDateTime(end_time)}.`);
    }
};

const formatDateTime = (date: Date): string => {
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const completeCheckin = async (registration: RegistrationWithRelations, checkedBy: number) => {
    const now = new Date();

    const attendance = await prisma.$transaction(async (tx) => {
        const existingAttendance = await tx.attendance.findUnique({
            where: { registration_id: registration.id },
        });

        if (existingAttendance) {
            if (existingAttendance.status === 'checked_in') {
                throw new ConflictError('Đã check-in rồi. Không thể check-in lại.');
            }
            if (existingAttendance.status === 'checked_out') {
                throw new ValidationError('Sinh viên đã check-out. Không thể check-in lại.');
            }
            throw new ConflictError('Đã check-in rồi');
        }

        // Update registration status to attended
        await tx.registration.update({
            where: { id: registration.id },
            data: { status: 'attended' },
        });

        const createdAttendance = await tx.attendance.create({
            data: {
                registration_id: registration.id,
                checked_in_at: now,
                checked_by: checkedBy,
                status: 'checked_in',
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
                semester: currentSemester,
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

    if (registration.status === 'cancelled') {
        throw new ValidationError('Đăng ký đã bị hủy. Không thể check-in.');
    }

    if (registration.status === 'attended') {
        const att = registration.attendance;
        if (att && att.status === 'checked_in') {
            throw new ConflictError('Đã check-in rồi. Không thể check-in lại.');
        }
        if (att && att.status === 'checked_out') {
            throw new ValidationError('Sinh viên đã check-out. Không thể check-in lại.');
        }
        throw new ConflictError('Đã check-in rồi. Không thể check-in lại.');
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
            throw new NotFoundError('Không tìm thấy thông tin đăng ký. Mã QR có thể đã bị xóa.');
        }

        if (registration.event_id !== qrData.event_id || registration.user_id !== qrData.user_id) {
            throw new ValidationError('Mã QR không khớp với thông tin đăng ký');
        }
    } else {
        registration = (await prisma.registration.findFirst({
            where: { qr_code: normalizedQrCode },
            include: buildRegistrationInclude(),
        })) as RegistrationWithRelations | null;
    }

    if (!registration) {
        throw new ValidationError('Mã QR không hợp lệ hoặc không tồn tại trong hệ thống');
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
            throw new NotFoundError('Không tìm thấy đăng ký');
        }

        if (registration.event_id !== eventId) {
            throw new ValidationError('Đăng ký không thuộc sự kiện đã chọn');
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
            throw new NotFoundError('Không tìm thấy sinh viên với MSSV này');
        }

        registration = (await prisma.registration.findFirst({
            where: {
                event_id: eventId,
                user_id: student.id,
            },
            include: buildRegistrationInclude(),
        })) as RegistrationWithRelations | null;

        if (!registration) {
            throw new NotFoundError('Sinh viên chưa đăng ký sự kiện này');
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

    const [totalRegistrations, totalAttendances, totalCheckouts, activeCheckins] = await Promise.all([
        prisma.registration.count({
            where: {
                event_id: eventId,
                status: { in: ['registered', 'attended'] },
            },
        }),
        prisma.attendance.count({
            where: {
                registration: { event_id: eventId },
            },
        }),
        prisma.attendance.count({
            where: {
                registration: { event_id: eventId },
                status: 'checked_out',
            },
        }),
        prisma.attendance.count({
            where: {
                registration: { event_id: eventId },
                status: 'checked_in',
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
        total_checkouts: totalCheckouts,
        active_checkins: activeCheckins,
        attendance_rate: attendanceRate,
    };
};

export const getAttendanceById = async (attendanceId: number, requester: RequesterContext) => {
    const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
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
                    event: {
                        select: {
                            id: true,
                            title: true,
                            organizer_id: true,
                            deleted_at: true,
                        },
                    },
                },
            },
            checker: {
                select: { id: true, full_name: true },
            },
        },
    });

    if (!attendance) {
        throw new NotFoundError('Không tìm thấy bản ghi điểm danh');
    }

    if (requester.role === 'organizer' && attendance.registration.event.organizer_id !== requester.id) {
        throw new ForbiddenError('Bạn không có quyền xem bản ghi này');
    }

    return attendance;
};

export const checkoutAttendance = async (attendanceId: number, checkedBy: number, userRole: UserRole) => {
    const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: {
            registration: {
                include: {
                    event: { select: { id: true, organizer_id: true, deleted_at: true } },
                },
            },
        },
    });

    if (!attendance) {
        throw new NotFoundError('Không tìm thấy bản ghi điểm danh');
    }

    if (attendance.registration.event.deleted_at) {
        throw new NotFoundError('Event');
    }

    if (userRole === 'organizer' && attendance.registration.event.organizer_id !== checkedBy) {
        throw new ForbiddenError('Bạn không có quyền check-out cho sự kiện này');
    }

    if (attendance.status === 'checked_out') {
        throw new ConflictError('Đã check-out rồi. Không thể check-out lại.');
    }

    const now = new Date();

    return prisma.attendance.update({
        where: { id: attendanceId },
        data: {
            checked_out_at: now,
            status: 'checked_out',
        },
        include: {
            registration: {
                include: {
                    user: {
                        select: { id: true, full_name: true, email: true, student_id: true },
                    },
                    event: {
                        select: {
                            id: true, title: true, start_time: true, end_time: true,
                            training_points: true, organizer_id: true,
                        },
                    },
                },
            },
            checker: { select: { id: true, full_name: true } },
        },
    });
};

export const undoAttendance = async (attendanceId: number, checkedBy: number, userRole: UserRole) => {
    const attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: {
            registration: {
                include: {
                    event: { select: { id: true, organizer_id: true, deleted_at: true } },
                },
            },
        },
    });

    if (!attendance) {
        throw new NotFoundError('Không tìm thấy bản ghi điểm danh');
    }

    if (attendance.registration.event.deleted_at) {
        throw new NotFoundError('Event');
    }

    if (userRole === 'organizer' && attendance.registration.event.organizer_id !== checkedBy) {
        throw new ForbiddenError('Bạn không có quyền thao tác với bản ghi này');
    }

    await prisma.$transaction(async (tx) => {
        await tx.trainingPoint.deleteMany({
            where: {
                user_id: attendance.registration.user_id,
                event_id: attendance.registration.event_id,
            },
        });

        await tx.attendance.delete({
            where: { id: attendanceId },
        });

        await tx.registration.update({
            where: { id: attendance.registration_id },
            data: { status: 'registered' },
        });
    });

    return { deleted: true, attendanceId };
};

// Helper function to get current semester
function getCurrentSemester(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (month >= 9 || month <= 1) {
        const academicYear = month >= 9 ? year : year - 1;
        return `${academicYear}-${academicYear + 1}-1`;
    } else if (month >= 2 && month <= 6) {
        return `${year - 1}-${year}-2`;
    } else {
        return `${year - 1}-${year}-summer`;
    }
}
