import { Request, Response, NextFunction } from 'express';
import * as notificationsService from '../services/notifications.service';
import { successResponse } from '../utils/response.util';

export const getMyNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.id;
        const { limit, offset, unread_only } = req.query;

        const result = await notificationsService.getMyNotifications(
            userId,
            limit ? parseInt(limit as string) : 20,
            offset ? parseInt(offset as string) : 0,
            unread_only === 'true'
        );

        res.json(successResponse(result, 'Lấy danh sách thông báo thành công'));
    } catch (error) {
        next(error);
    }
};

export const getUnreadCount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.id;

        const count = await notificationsService.getUnreadCount(userId);

        res.json(successResponse({ count }, 'Lấy số thông báo chưa đọc thành công'));
    } catch (error) {
        next(error);
    }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const notificationId = parseInt(req.params.id as string);

        const notification = await notificationsService.markAsRead(userId, notificationId);

        res.json(successResponse(notification, 'Đánh dấu đã đọc thành công'));
    } catch (error) {
        next(error);
    }
};

export const markAllAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.id;

        const count = await notificationsService.markAllAsRead(userId);

        res.json(successResponse({ count }, `Đã đánh dấu ${count} thông báo là đã đọc`));
    } catch (error) {
        next(error);
    }
};

export const deleteNotification = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.id;
        const notificationId = parseInt(req.params.id as string);

        await notificationsService.deleteNotification(userId, notificationId);

        res.json(successResponse({ message: 'Xóa thông báo thành công' }));
    } catch (error) {
        next(error);
    }
};


