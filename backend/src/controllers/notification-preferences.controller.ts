import { Response } from 'express';
import * as notificationPreferencesService from '../services/notification-preferences.service';
import type { AuthRequest } from '../middleware/auth';

export const getPreferences = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const preferences = await notificationPreferencesService.getNotificationPreferences(userId);
        res.json({ success: true, data: preferences });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi lấy cài đặt thông báo' },
        });
    }
};

export const updatePreferences = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const preferences = req.body; // Partial<NotificationPreferences>

        const updated = await notificationPreferencesService.updateNotificationPreferences(userId, preferences);
        res.json({ success: true, data: updated });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        res.status(err.status || 500).json({
            success: false,
            error: { message: err.message || 'Lỗi khi cập nhật cài đặt thông báo' },
        });
    }
};
