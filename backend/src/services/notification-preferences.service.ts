import prisma from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';

export interface NotificationPreferences {
    event_reminder: boolean;
    event_update: boolean;
    event_cancelled: boolean;
    registration_confirm: boolean;
    feedback_request: boolean;
    training_points_awarded: boolean;
    checkin_success: boolean;
    email_notifications: boolean; // Master toggle for email
}

export const defaultPreferences: NotificationPreferences = {
    event_reminder: true,
    event_update: true,
    event_cancelled: true,
    registration_confirm: true,
    feedback_request: true,
    training_points_awarded: true,
    checkin_success: true,
    email_notifications: true,
};

export const getNotificationPreferences = async (userId: number): Promise<NotificationPreferences> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            notification_enabled: true,
            notification_preferences: true,
        },
    });

    if (!user) {
        throw new NotFoundError('Người dùng');
    }

    const defaults = { ...defaultPreferences };

    if (user.notification_preferences) {
        try {
            const stored = typeof user.notification_preferences === 'string'
                ? JSON.parse(user.notification_preferences)
                : user.notification_preferences;
            return { ...defaults, ...stored };
        } catch {
            return defaults;
        }
    }

    return defaults;
};

export const updateNotificationPreferences = async (
    userId: number,
    preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
    const current = await getNotificationPreferences(userId);
    const updated = { ...current, ...preferences };

    await prisma.user.update({
        where: { id: userId },
        data: {
            notification_enabled: updated.email_notifications,
            notification_preferences: JSON.stringify({
                event_reminder: updated.event_reminder,
                event_update: updated.event_update,
                event_cancelled: updated.event_cancelled,
                registration_confirm: updated.registration_confirm,
                feedback_request: updated.feedback_request,
                training_points_awarded: updated.training_points_awarded,
                checkin_success: updated.checkin_success,
                email_notifications: updated.email_notifications,
            }),
        },
    });

    return updated;
};
