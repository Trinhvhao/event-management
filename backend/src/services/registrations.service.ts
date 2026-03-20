import prisma from '../config/database';
import QRCode from 'qrcode';
import { sendEmail } from './email.service';
import * as notificationsService from './notifications.service';

export const registerForEvent = async (userId: number, eventId: number) => {
    // Check if event exists and is upcoming
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
            _count: {
                select: { registrations: true }
            }
        }
    });

    if (!event) {
        throw new Error('Sự kiện không tồn tại');
    }

    if (event.status !== 'upcoming') {
        throw new Error('Chỉ có thể đăng ký sự kiện sắp diễn ra');
    }

    // Check capacity
    if (event._count.registrations >= event.capacity) {
        throw new Error('Sự kiện đã đầy');
    }

    // Check if already registered
    const existingRegistration = await prisma.registration.findFirst({
        where: {
            user_id: userId,
            event_id: eventId,
            status: 'registered'
        }
    });

    if (existingRegistration) {
        throw new Error('Bạn đã đăng ký sự kiện này rồi');
    }

    // Generate QR code data
    const qrData = {
        registration_id: Date.now(), // Temporary, will update after creation
        event_id: eventId,
        user_id: userId,
        issued_at: new Date().toISOString(),
        expires_at: event.end_time.toISOString()
    };

    // Create registration
    const registration = await prisma.registration.create({
        data: {
            user_id: userId,
            event_id: eventId,
            status: 'registered',
            qr_code: '' // Will update after generating QR
        },
        include: {
            event: true,
            user: true
        }
    });

    // Update QR data with actual registration ID
    qrData.registration_id = registration.id;
    const qrCodeString = await QRCode.toDataURL(JSON.stringify(qrData));

    // Update registration with QR code
    const updatedRegistration = await prisma.registration.update({
        where: { id: registration.id },
        data: { qr_code: qrCodeString },
        include: {
            event: true,
            user: true
        }
    });

    // Send confirmation email
    try {
        await sendEmail({
            to: registration.user.email,
            subject: `Xác nhận đăng ký: ${event.title}`,
            html: `
        <h2>Đăng ký thành công!</h2>
        <p>Xin chào ${registration.user.full_name},</p>
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

    if (status) {
        where.status = status;
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
        include: { event: true }
    });

    if (!registration) {
        throw new Error('Đăng ký không tồn tại');
    }

    if (registration.user_id !== userId) {
        throw new Error('Bạn không có quyền hủy đăng ký này');
    }

    if (registration.status === 'cancelled') {
        throw new Error('Đăng ký đã bị hủy trước đó');
    }

    // Check if can cancel (24 hours before event)
    const hoursUntilEvent = (registration.event.start_time.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 24) {
        throw new Error('Không thể hủy đăng ký trong vòng 24 giờ trước sự kiện');
    }

    // Update status to cancelled
    await prisma.registration.update({
        where: { id: registrationId },
        data: { status: 'cancelled' }
    });

    return true;
};

export const getEventRegistrations = async (eventId: number, status?: string) => {
    const where: any = { event_id: eventId };

    if (status) {
        where.status = status;
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
        throw new Error('Đăng ký không tồn tại');
    }

    return registration;
};

