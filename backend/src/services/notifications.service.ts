import prisma from '../config/database';
import { NotificationType } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler';

interface CreateNotificationData {
    user_id: number;
    type: NotificationType;
    title: string;
    message: string;
    event_id?: number;
}

export const createNotification = async (data: CreateNotificationData) => {
    const notification = await prisma.notification.create({
        data: {
            user_id: data.user_id,
            type: data.type,
            title: data.title,
            message: data.message,
            event_id: data.event_id,
            is_read: false,
        },
    });

    return notification;
};

export const getMyNotifications = async (
    userId: number,
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
) => {
    const where: any = { user_id: userId };

    if (unreadOnly) {
        where.is_read = false;
    }

    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where,
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        start_time: true,
                        location: true,
                    },
                },
            },
            orderBy: {
                sent_at: 'desc',
            },
            take: limit,
            skip: offset,
        }),
        prisma.notification.count({ where }),
    ]);

    return {
        notifications,
        total,
        limit,
        offset,
        has_more: offset + limit < total,
    };
};

export const getUnreadCount = async (userId: number) => {
    const count = await prisma.notification.count({
        where: {
            user_id: userId,
            is_read: false,
        },
    });

    return count;
};

export const markAsRead = async (userId: number, notificationId: number) => {
    // Check ownership
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
    });

    if (!notification) {
        throw new NotFoundError('Notification');
    }

    if (notification.user_id !== userId) {
        throw new ForbiddenError('Bạn không có quyền đánh dấu thông báo này');
    }

    if (notification.is_read) {
        return notification; // Already read
    }

    const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { is_read: true },
    });

    return updated;
};

export const markAllAsRead = async (userId: number) => {
    const result = await prisma.notification.updateMany({
        where: {
            user_id: userId,
            is_read: false,
        },
        data: {
            is_read: true,
        },
    });

    return result.count;
};

export const deleteNotification = async (userId: number, notificationId: number) => {
    // Check ownership
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
    });

    if (!notification) {
        throw new NotFoundError('Notification');
    }

    if (notification.user_id !== userId) {
        throw new ForbiddenError('Bạn không có quyền xóa thông báo này');
    }

    await prisma.notification.delete({
        where: { id: notificationId },
    });

    return true;
};

// Helper functions to create specific notification types

export const notifyRegistrationConfirm = async (
    userId: number,
    eventId: number,
    eventTitle: string
) => {
    return createNotification({
        user_id: userId,
        type: 'registration_confirm',
        title: 'Đăng ký thành công',
        message: `Bạn đã đăng ký thành công sự kiện "${eventTitle}". Vui lòng mang QR code khi tham dự.`,
        event_id: eventId,
    });
};

export const notifyEventReminder = async (
    userId: number,
    eventId: number,
    eventTitle: string,
    hoursUntil: number
) => {
    return createNotification({
        user_id: userId,
        type: 'event_reminder',
        title: 'Nhắc nhở sự kiện',
        message: `Sự kiện "${eventTitle}" sẽ diễn ra sau ${hoursUntil} giờ nữa. Đừng quên tham dự!`,
        event_id: eventId,
    });
};

export const notifyEventUpdate = async (
    userId: number,
    eventId: number,
    eventTitle: string,
    changes: string
) => {
    return createNotification({
        user_id: userId,
        type: 'event_update',
        title: 'Cập nhật sự kiện',
        message: `Sự kiện "${eventTitle}" đã có thay đổi: ${changes}`,
        event_id: eventId,
    });
};

export const notifyEventCancelled = async (
    userId: number,
    eventId: number,
    eventTitle: string
) => {
    return createNotification({
        user_id: userId,
        type: 'event_cancelled',
        title: 'Sự kiện bị hủy',
        message: `Sự kiện "${eventTitle}" đã bị hủy. Xin lỗi vì sự bất tiện này.`,
        event_id: eventId,
    });
};

export const notifyCheckinSuccess = async (
    userId: number,
    eventId: number,
    eventTitle: string,
    points: number
) => {
    return createNotification({
        user_id: userId,
        type: 'checkin_success' as NotificationType,
        title: 'Check-in thành công',
        message: `Bạn đã check-in thành công sự kiện "${eventTitle}". Bạn nhận được ${points} điểm rèn luyện.`,
        event_id: eventId,
    });
};

export const notifyPointsAwarded = async (
    userId: number,
    eventId: number,
    eventTitle: string,
    points: number
) => {
    return createNotification({
        user_id: userId,
        type: 'points_awarded' as NotificationType,
        title: 'Cộng điểm rèn luyện',
        message: `Bạn đã nhận được ${points} điểm rèn luyện từ sự kiện "${eventTitle}".`,
        event_id: eventId,
    });
};

export const notifyOrganizerRightsGranted = async (userId: number) => {
    return createNotification({
        user_id: userId,
        type: 'event_update',
        title: 'Được cấp quyền Ban tổ chức',
        message:
            'Tài khoản của bạn đã được cấp quyền Ban tổ chức. Bạn có thể tạo và quản lý sự kiện của mình từ bây giờ.',
    });
};

export const notifyOrganizerRightsRevoked = async (userId: number) => {
    return createNotification({
        user_id: userId,
        type: 'event_update',
        title: 'Thu hồi quyền Ban tổ chức',
        message:
            'Quyền Ban tổ chức của bạn đã được thu hồi. Nếu có thắc mắc, vui lòng liên hệ quản trị viên.',
    });
};
