import prisma from '../config/database';
import { UserRole } from '@prisma/client';

export const adminService = {
    /**
     * Lấy danh sách users có phân trang, tìm kiếm, lọc theo vai trò
     * Dành cho admin quản lý tài khoản người dùng
     */
    async getUsers(query: { page?: number; limit?: number; search?: string; role?: string }) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        // Điều kiện lọc: tìm theo tên/email + lọc theo role
        const where: any = {};

        if (query.search) {
            where.OR = [
                { full_name: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { student_id: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        if (query.role) {
            where.role = query.role;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true, email: true, full_name: true, student_id: true,
                    role: true, is_active: true, email_verified: true,
                    department_id: true, created_at: true,
                    department: { select: { name: true } },
                },
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);

        return {
            data: users,
            pagination: {
                total,
                page,
                pageSize: limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Cập nhật thông tin user (kích hoạt/vô hiệu hóa, đổi vai trò)
     * Chỉ admin mới có quyền thực hiện
     */
    async updateUser(userId: number, data: { role?: UserRole; is_active?: boolean }) {
        return prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true, email: true, full_name: true, role: true, is_active: true,
            },
        });
    },

    /**
     * Thống kê nhanh cho admin dashboard
     */
    async getDashboard() {
        const [totalUsers, activeUsers, totalEvents] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { is_active: true } }),
            prisma.event.count({ where: { deleted_at: null } }),
        ]);

        return { totalUsers, activeUsers, totalEvents };
    },

    // ── CRUD Categories ──

    /** Lấy danh sách danh mục kèm số lượng events */
    async getCategories() {
        return prisma.category.findMany({
            include: { _count: { select: { events: true } } },
            orderBy: { name: 'asc' },
        });
    },

    /** Tạo danh mục mới */
    async createCategory(data: { name: string; description?: string }) {
        return prisma.category.create({ data });
    },

    /** Xóa danh mục (chỉ khi không có events nào) */
    async deleteCategory(id: number) {
        const count = await prisma.event.count({ where: { category_id: id } });
        if (count > 0) throw new Error(`Không thể xóa — danh mục đang có ${count} sự kiện`);
        return prisma.category.delete({ where: { id } });
    },

    // ── CRUD Departments ──

    /** Lấy danh sách khoa/phòng ban kèm số lượng users + events */
    async getDepartments() {
        return prisma.department.findMany({
            include: { _count: { select: { users: true, events: true } } },
            orderBy: { name: 'asc' },
        });
    },

    /** Tạo khoa/phòng ban mới */
    async createDepartment(data: { name: string; code: string; description?: string }) {
        return prisma.department.create({ data });
    },

    /** Xóa khoa/phòng ban (chỉ khi không có users hay events) */
    async deleteDepartment(id: number) {
        const [userCount, eventCount] = await Promise.all([
            prisma.user.count({ where: { department_id: id } }),
            prisma.event.count({ where: { department_id: id } }),
        ]);
        if (userCount > 0 || eventCount > 0) {
            throw new Error(`Không thể xóa — khoa đang có ${userCount} users và ${eventCount} events`);
        }
        return prisma.department.delete({ where: { id } });
    },
};
