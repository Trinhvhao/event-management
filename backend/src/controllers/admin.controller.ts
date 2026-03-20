import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { successResponse } from '../utils/response.util';

export const adminController = {
    async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getUsers(req.query as any);
            res.json(successResponse(result));
        } catch (error) { next(error); }
    },
    async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = Number(req.params.id);
            const result = await adminService.updateUser(userId, req.body);
            res.json(successResponse(result));
        } catch (error) { next(error); }
    },
    async getDashboard(_req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getDashboard();
            res.json(successResponse(result));
        } catch (error) { next(error); }
    },

    // ── Categories ──
    async getCategories(_req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getCategories();
            res.json(successResponse(result));
        } catch (error) { next(error); }
    },
    async createCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.createCategory(req.body);
            res.status(201).json(successResponse(result, 'Tạo danh mục thành công'));
        } catch (error) { next(error); }
    },
    async deleteCategory(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.deleteCategory(Number(req.params.id));
            res.json(successResponse(null, 'Đã xóa danh mục'));
        } catch (error) { next(error); }
    },

    // ── Departments ──
    async getDepartments(_req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.getDepartments();
            res.json(successResponse(result));
        } catch (error) { next(error); }
    },
    async createDepartment(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await adminService.createDepartment(req.body);
            res.status(201).json(successResponse(result, 'Tạo khoa thành công'));
        } catch (error) { next(error); }
    },
    async deleteDepartment(req: Request, res: Response, next: NextFunction) {
        try {
            await adminService.deleteDepartment(Number(req.params.id));
            res.json(successResponse(null, 'Đã xóa khoa'));
        } catch (error) { next(error); }
    },
};
