import prisma from '../config/database';
import { createAuditLog } from './audit.service';

interface GetUsersParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    department_id?: string;
    is_active?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const adminService = {
    /**
     * Get users with filters, sorting, and pagination
     */
    async getUsers(params: GetUsersParams) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        const sortBy = params.sortBy || 'created_at';
        const sortOrder = params.sortOrder || 'desc';

        // Build where clause
        const where: any = {};

        if (params.search) {
            where.OR = [
                { full_name: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        if (params.role) {
            where.role = params.role;
        }

        if (params.department_id) {
            where.department_id = Number(params.department_id);
        }

        if (params.is_active !== undefined && params.is_active !== '') {
            where.is_active = params.is_active === 'true';
        }

        // Execute query
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    [sortBy]: sortOrder,
                },
                include: {
                    department: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            }),
            prisma.user.count({ where }),
        ]);

        return {
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Lock a user account
     */
    async lockUser(userId: number, adminId: number, ipAddress?: string, userAgent?: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.is_active) {
            throw new Error('User is already locked');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { is_active: false },
            include: {
                department: true,
            },
        });

        // Create audit log
        await createAuditLog({
            actionType: 'user_locked',
            adminId,
            userId,
            entityType: 'user',
            entityId: userId,
            oldValue: { is_active: true },
            newValue: { is_active: false },
            ipAddress,
            userAgent,
        });

        return updatedUser;
    },

    /**
     * Unlock a user account
     */
    async unlockUser(userId: number, adminId: number, ipAddress?: string, userAgent?: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        if (user.is_active) {
            throw new Error('User is already active');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { is_active: true },
            include: {
                department: true,
            },
        });

        // Create audit log
        await createAuditLog({
            actionType: 'user_unlocked',
            adminId,
            userId,
            entityType: 'user',
            entityId: userId,
            oldValue: { is_active: false },
            newValue: { is_active: true },
            ipAddress,
            userAgent,
        });

        return updatedUser;
    },

    /**
     * Change user role
     */
    async changeUserRole(
        userId: number,
        newRole: string,
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        // Business rule: cannot change own role
        if (userId === adminId) {
            throw new Error('Cannot change your own role');
        }

        // Business rule: cannot remove last admin
        if (user.role === 'admin' && newRole !== 'admin') {
            const adminCount = await prisma.user.count({
                where: { role: 'admin', is_active: true },
            });
            if (adminCount <= 1) {
                throw new Error('Cannot remove the last admin');
            }
        }

        const oldRole = user.role;
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: newRole as any },
            include: {
                department: true,
            },
        });

        // Create audit log
        await createAuditLog({
            actionType: 'role_changed',
            adminId,
            userId,
            entityType: 'user',
            entityId: userId,
            oldValue: { role: oldRole },
            newValue: { role: newRole },
            ipAddress,
            userAgent,
        });

        return updatedUser;
    },

    /**
     * Bulk lock users
     */
    async bulkLock(userIds: number[], adminId: number, ipAddress?: string, userAgent?: string) {
        const results = {
            successCount: 0,
            failureCount: 0,
            failures: [] as Array<{ userId: number; error: string }>,
        };

        for (const userId of userIds) {
            try {
                // Skip current admin
                if (userId === adminId) {
                    results.failureCount++;
                    results.failures.push({
                        userId,
                        error: 'Cannot lock your own account',
                    });
                    continue;
                }

                await this.lockUser(userId, adminId, ipAddress, userAgent);
                results.successCount++;
            } catch (error) {
                results.failureCount++;
                results.failures.push({
                    userId,
                    error: (error as Error).message,
                });
            }
        }

        return results;
    },

    /**
     * Bulk unlock users
     */
    async bulkUnlock(userIds: number[], adminId: number, ipAddress?: string, userAgent?: string) {
        const results = {
            successCount: 0,
            failureCount: 0,
            failures: [] as Array<{ userId: number; error: string }>,
        };

        for (const userId of userIds) {
            try {
                await this.unlockUser(userId, adminId, ipAddress, userAgent);
                results.successCount++;
            } catch (error) {
                results.failureCount++;
                results.failures.push({
                    userId,
                    error: (error as Error).message,
                });
            }
        }

        return results;
    },
};
