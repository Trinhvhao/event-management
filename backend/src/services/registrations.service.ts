import prisma from '../config/database';
import QRCode from 'qrcode';
import { sendEmail } from './email.service';
import * as notificationsService from './notifications.service';
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from '../middleware/errorHandler';
import { RegistrationStatus, UserRole } from '@prisma/client';

type RequesterContext = {
    id: number;
    role: UserRole;
};

const parseRegistrationStatus = (status?: string): RegistrationStatus | undefined => {
    if (!status) {
        return undefined;
    }

    if (status === 'registered' || status === 'cancelled') {
        return status;
    }

    throw new ValidationError('Trạng thái đăng ký không hợp lệ');
};

const generateRegistrationQrCode = async (params: {
    registrationId: number;
    eventId: number;
    userId: number;
    eventEndTime: Date;
}) => {
    const qrData = {
        registration_id: params.registrationId,
        event_id: params.eventId,
        user_id: params.userId,
        issued_at: new Date().toISOString(),
        expires_at: params.eventEndTime.toISOString(),
    };

    return QRCode.toDataURL(JSON.stringify(qrData));
};

export const registerForEvent = async (userId: number, eventId: number) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title: true,
            status: true,
            start_time: true,
            end_time: true,
            location: true,
            capacity: true,
            training_points: true,
            registration_deadline: true,
            deleted_at: true,
        },
    });

    if (!event || event.deleted_at) {
        throw new NotFoundError('Sự kiện không tồn tại');
    }

    const now = new Date();

    if (event.status !== 'upcoming' && event.status !== 'approved') {
        throw new ValidationError('Chỉ có thể đăng ký sự kiện sắp diễn ra');
    }

    if (event.end_time <= now) {
        throw new ValidationError('Sự kiện đã kết thúc');
    }

    if (event.start_time <= now) {
        throw new ValidationError('Sự kiện đã bắt đầu, không thể đăng ký');
    }

    if (event.registration_deadline && now > event.registration_deadline) {
        throw new ValidationError('Đã quá hạn đăng ký sự kiện');
    }

    const activeRegistrations = await prisma.registration.count({
        where: {
            event_id: eventId,
            status: 'registered',
        },
    });

    // Capacity should only count active registrations.
    if (activeRegistrations >= event.capacity) {
        throw new ConflictError('Sự kiện đã đầy');
    }

    const existingRegistration = await prisma.registration.findUnique({
        where: {
            user_id_event_id: {
                user_id: userId,
                event_id: eventId,
            },
        },
        select: {
            id: true,
            status: true,
        },
    });

    if (existingRegistration?.status === 'registered') {
        throw new ConflictError('Bạn đã đăng ký sự kiện này rồi');
    }

    if (existingRegistration?.status === 'attended') {
        throw new ConflictError('Bạn đã tham dự sự kiện này rồi');
    }

    let updatedRegistration;

    if (existingRegistration?.status === 'cancelled') {
        const qrCodeString = await generateRegistrationQrCode({
            registrationId: existingRegistration.id,
            eventId,
            userId,
            eventEndTime: event.end_time,
        });

        updatedRegistration = await prisma.registration.update({
            where: { id: existingRegistration.id },
            data: {
                status: 'registered',
                registered_at: now,
                qr_code: qrCodeString,
            },
            include: {
                event: true,
                user: true,
            },
        });
    } else {
        // Create registration with a temporary QR placeholder, then replace with final payload.
        const registration = await prisma.registration.create({
            data: {
                user_id: userId,
                event_id: eventId,
                status: 'registered',
                qr_code: `pending-${Date.now()}-${userId}-${eventId}`,
            },
            include: {
                event: true,
                user: true,
            },
        });

        const qrCodeString = await generateRegistrationQrCode({
            registrationId: registration.id,
            eventId,
            userId,
            eventEndTime: event.end_time,
        });

        updatedRegistration = await prisma.registration.update({
            where: { id: registration.id },
            data: { qr_code: qrCodeString },
            include: {
                event: true,
                user: true,
            },
        });
    }

    await prisma.eventWaitlist.updateMany({
        where: {
            event_id: eventId,
            user_id: userId,
            status: 'waiting',
        },
        data: {
            status: 'promoted',
        },
    });

    // Send confirmation email
    try {
        const qrCodeString = updatedRegistration.qr_code;
        await sendEmail({
            to: updatedRegistration.user.email,
            subject: `Xác nhận đăng ký: ${event.title}`,
            html: `
        <h2>Đăng ký thành công!</h2>
        <p>Xin chào ${updatedRegistration.user.full_name},</p>
        <p>Bạn đã đăng ký thành công sự kiện: <strong>${event.title}</strong></p>
        <p><strong>Thời gian:</strong> ${event.start_time.toLocaleString('vi-VN')}</p>
        <p><strong>Địa điểm:</strong> ${event.location}</p>
        <p><strong>Điểm rèn luyện:</strong> ${event.training_points}</p>
        <p>Vui lòng mang mã QR code khi tham dự sự kiện.</p>
        <img src="${qrCodeString}" alt="QR Code" />
      `
        });
    } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't throw error, registration is still successful
    }

    // Create notification
    try {
        await notificationsService.notifyRegistrationConfirm(
            userId,
            eventId,
            event.title
        );
    } catch (notifError) {
        console.error('Failed to create notification:', notifError);
    }

    return updatedRegistration;
};

export const getMyRegistrations = async (userId: number, status?: string) => {
    const where: any = { user_id: userId };
    const parsedStatus = parseRegistrationStatus(status);

    if (parsedStatus) {
        where.status = parsedStatus;
    }

    const registrations = await prisma.registration.findMany({
        where,
        include: {
            event: {
                include: {
                    organizer: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true
                        }
                    }
                }
            }
        },
        orderBy: {
            registered_at: 'desc'
        }
    });

    return registrations;
};

export const cancelRegistration = async (userId: number, registrationId: number) => {
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { event: true },
    });

    if (!registration) {
        throw new NotFoundError('Registration');
    }

    if (registration.user_id !== userId) {
        throw new ForbiddenError('Bạn không có quyền hủy đăng ký này');
    }

    if (registration.status === 'cancelled') {
        throw new ConflictError('Đăng ký đã bị hủy trước đó');
    }

    const now = new Date();

    if (registration.event.status === 'cancelled' || registration.event.status === 'completed') {
        throw new ConflictError('Không thể hủy đăng ký của sự kiện đã kết thúc hoặc đã bị hủy');
    }

    if (registration.event.start_time <= now) {
        throw new ConflictError('Không thể hủy đăng ký sau khi sự kiện đã bắt đầu');
    }

    // Check if can cancel (24 hours before event)
    const hoursUntilEvent =
        (registration.event.start_time.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 24) {
        throw new ConflictError('Không thể hủy đăng ký trong vòng 24 giờ trước sự kiện');
    }

    // Update status to cancelled
    await prisma.registration.update({
        where: { id: registrationId },
        data: { status: 'cancelled' }
    });

    return true;
};

export const getEventRegistrations = async (
    eventId: number,
    status: string | undefined,
    requester: RequesterContext
) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            organizer_id: true,
            deleted_at: true,
        },
    });

    if (!event || event.deleted_at) {
        throw new NotFoundError('Sự kiện không tồn tại');
    }

    if (requester.role === 'organizer' && event.organizer_id !== requester.id) {
        throw new ForbiddenError('Bạn không có quyền xem danh sách đăng ký của sự kiện này');
    }

    const where: any = { event_id: eventId };
    const parsedStatus = parseRegistrationStatus(status);

    if (parsedStatus) {
        where.status = parsedStatus;
    }

    const registrations = await prisma.registration.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    student_id: true,
                    department_id: true
                }
            }
        },
        orderBy: {
            registered_at: 'desc'
        }
    });

    return registrations;
};

export const getRegistrationById = async (registrationId: number) => {
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            event: true,
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    student_id: true
                }
            }
        }
    });

    if (!registration) {
        throw new NotFoundError('Registration');
    }

    return registration;
};

export const getRegistrationByIdWithAccess = async (
    registrationId: number,
    requester: RequesterContext
) => {
    const registration = await getRegistrationById(registrationId);

    if (requester.role === 'student' && registration.user_id !== requester.id) {
        throw new ForbiddenError('Bạn không có quyền xem đăng ký này');
    }

    if (
        requester.role === 'organizer' &&
        registration.event.organizer_id !== requester.id
    ) {
        throw new ForbiddenError('Bạn không có quyền xem đăng ký này');
    }

    return registration;
};

export const getRegistrationQRCodeWithAccess = async (
    registrationId: number,
    requester: RequesterContext
) => {
    const registration = await getRegistrationByIdWithAccess(registrationId, requester);

    if (registration.status === 'cancelled') {
        throw new ConflictError('Đăng ký đã bị hủy, không thể lấy QR code');
    }

    return {
        registration_id: registration.id,
        event_id: registration.event_id,
        status: registration.status,
        registered_at: registration.registered_at,
        qr_code: registration.qr_code,
    };
};

// =====================
// Waitlist Functions
// =====================

export const joinWaitlist = async (userId: number, eventId: number) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title: true,
            status: true,
            start_time: true,
            end_time: true,
            capacity: true,
            registration_deadline: true,
            deleted_at: true,
        },
    });

    if (!event || event.deleted_at) {
        throw new NotFoundError('Sự kiện không tồn tại');
    }

    if (event.status !== 'upcoming' && event.status !== 'approved') {
        throw new ValidationError('Chỉ có thể vào danh sách chờ sự kiện sắp diễn ra');
    }

    if (event.end_time <= new Date()) {
        throw new ValidationError('Sự kiện đã kết thúc');
    }

    if (event.registration_deadline && new Date() > event.registration_deadline) {
        throw new ValidationError('Đã quá hạn đăng ký sự kiện');
    }

    const activeRegistrations = await prisma.registration.count({
        where: {
            event_id: eventId,
            status: 'registered',
        },
    });

    if (activeRegistrations < event.capacity) {
        throw new ConflictError('Sự kiện vẫn còn chỗ trống, không thể vào danh sách chờ');
    }

    // Check if already registered
    const existingRegistration = await prisma.registration.findUnique({
        where: {
            user_id_event_id: {
                user_id: userId,
                event_id: eventId,
            },
        },
    });

    if (existingRegistration?.status === 'registered') {
        throw new ConflictError('Bạn đã đăng ký sự kiện này rồi');
    }

    if (existingRegistration?.status === 'attended') {
        throw new ConflictError('Bạn đã tham dự sự kiện này rồi');
    }

    // Check if already in waitlist
    const existingWaitlist = await prisma.eventWaitlist.findUnique({
        where: {
            event_id_user_id: {
                event_id: eventId,
                user_id: userId,
            },
        },
    });

    if (existingWaitlist && existingWaitlist.status === 'waiting') {
        throw new ConflictError('Bạn đã có trong danh sách chờ của sự kiện này');
    }

    // Get next position
    const lastInWaitlist = await prisma.eventWaitlist.findFirst({
        where: {
            event_id: eventId,
            status: 'waiting',
        },
        orderBy: {
            position: 'desc',
        },
    });

    const nextPosition = (lastInWaitlist?.position ?? 0) + 1;

    // Create waitlist entry
    const waitlistEntry = await prisma.eventWaitlist.upsert({
        where: {
            event_id_user_id: {
                event_id: eventId,
                user_id: userId,
            },
        },
        update: {
            position: nextPosition,
            status: 'waiting',
        },
        create: {
            event_id: eventId,
            user_id: userId,
            position: nextPosition,
            status: 'waiting',
        },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    start_time: true,
                    end_time: true,
                    location: true,
                },
            },
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                },
            },
        },
    });

    return waitlistEntry;
};

export const leaveWaitlist = async (userId: number, eventId: number) => {
    const waitlistEntry = await prisma.eventWaitlist.findUnique({
        where: {
            event_id_user_id: {
                event_id: eventId,
                user_id: userId,
            },
        },
    });

    if (!waitlistEntry) {
        throw new NotFoundError('Bạn không có trong danh sách chờ của sự kiện này');
    }

    if (waitlistEntry.status !== 'waiting') {
        throw new ConflictError('Yêu cầu không hợp lệ');
    }

    // Update status to cancelled
    await prisma.eventWaitlist.update({
        where: { id: waitlistEntry.id },
        data: { status: 'cancelled' },
    });

    // Reorder remaining waitlist positions
    await prisma.eventWaitlist.updateMany({
        where: {
            event_id: eventId,
            status: 'waiting',
            position: {
                gt: waitlistEntry.position,
            },
        },
        data: {
            position: {
                decrement: 1,
            },
        },
    });

    return true;
};

export const getWaitlistPosition = async (userId: number, eventId: number) => {
    const waitlistEntry = await prisma.eventWaitlist.findUnique({
        where: {
            event_id_user_id: {
                event_id: eventId,
                user_id: userId,
            },
        },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    capacity: true,
                },
            },
        },
    });

    if (!waitlistEntry || waitlistEntry.status !== 'waiting') {
        return null;
    }

    // Count total waitlist size
    const totalWaitlist = await prisma.eventWaitlist.count({
        where: {
            event_id: eventId,
            status: 'waiting',
        },
    });

    return {
        position: waitlistEntry.position,
        status: waitlistEntry.status,
        total_waitlist: totalWaitlist,
        event_id: eventId,
        event_title: waitlistEntry.event.title,
    };
};

export const getEventWaitlist = async (
    eventId: number,
    requester: RequesterContext
) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            organizer_id: true,
            deleted_at: true,
        },
    });

    if (!event || event.deleted_at) {
        throw new NotFoundError('Sự kiện không tồn tại');
    }

    if (requester.role === 'organizer' && event.organizer_id !== requester.id) {
        throw new ForbiddenError('Bạn không có quyền xem danh sách chờ của sự kiện này');
    }

    const waitlist = await prisma.eventWaitlist.findMany({
        where: {
            event_id: eventId,
            status: 'waiting',
        },
        include: {
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    student_id: true,
                    department_id: true,
                },
            },
        },
        orderBy: {
            position: 'asc',
        },
    });

    return waitlist;
};
