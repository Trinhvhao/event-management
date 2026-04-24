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

