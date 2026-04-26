import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { adminService } from '../services/admin.service';
import { getUserAuditLogs, getAuditLogs } from '../services/audit.service';
import { categoryService } from '../services/category.service';
import { adminStatisticsService } from '../services/admin-statistics.service';
import {
    getAuthenticatedUser,
    getQueryString,
    parseOptionalPositiveInt,
    parsePositiveInt,
    parseQueryInt,
} from '../utils/request.util';

const toUserSortBy = (
    value: unknown
): 'created_at' | 'last_login' | 'full_name' | 'email' | undefined => {
    const parsed = getQueryString(value);
    if (!parsed) return undefined;

    if (
        parsed === 'created_at' ||
        parsed === 'last_login' ||
        parsed === 'full_name' ||
        parsed === 'email'
    ) {
        return parsed;
    }

    return undefined;
};

export const adminController = {
    /**
     * GET /api/admin/users
     * Get all users with filters and pagination
     */
    async getUsers(req: Request, res: Response): Promise<void> {
        try {
            const {
                page,
                limit,
                search,
                role,
                department_id,
                is_active,
                sortBy,
                sortOrder,
            } = req.query;

            const result = await adminService.getUsers({
                page: parseQueryInt(page, 1, 'page', { min: 1 }),
                limit: parseQueryInt(limit, 20, 'limit', { min: 1 }),
                search: getQueryString(search),
                role: getQueryString(role) as UserRole | undefined,
                department_id: parseOptionalPositiveInt(department_id, 'department_id'),
                is_active:
                    getQueryString(is_active) === undefined
                        ? undefined
                        : getQueryString(is_active) === 'true',
                sortBy: toUserSortBy(sortBy),
                sortOrder: getQueryString(sortOrder) as 'asc' | 'desc' | undefined,
            });

            res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users',
                error: (error as Error).message,
            });
        }
    },

    /**
     * POST /api/admin/users/import
     * Import users from CSV file
     */
    async importUsers(req: Request, res: Response): Promise<void> {
        try {
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const result = await adminService.importUsers(
                req,
                adminId,
                ipAddress,
                userAgent
            );

            res.json({
                success: true,
                message: `Đã nhập ${result.success} người dùng thành công`,
                imported: result.success,
                failed: result.failed,
                errors: result.errors,
            });
        } catch (error) {
            console.error('Import users error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * PUT /api/admin/users/:id/lock
     * Lock a user account
     */
    async lockUser(req: Request, res: Response): Promise<void> {
        try {
            const userId = parsePositiveInt(req.params.id, 'id');
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const user = await adminService.lockUser(userId, adminId, ipAddress, userAgent);

            res.json({
                success: true,
                message: 'User locked successfully',
                data: user,
            });
        } catch (error) {
            console.error('Lock user error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * PUT /api/admin/users/:id/unlock
     * Unlock a user account
     */
    async unlockUser(req: Request, res: Response): Promise<void> {
        try {
            const userId = parsePositiveInt(req.params.id, 'id');
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const user = await adminService.unlockUser(userId, adminId, ipAddress, userAgent);

            res.json({
                success: true,
                message: 'User unlocked successfully',
                data: user,
            });
        } catch (error) {
            console.error('Unlock user error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * PUT /api/admin/users/:id/role
     * Change user role
     */
    async changeUserRole(req: Request, res: Response): Promise<void> {
        try {
            const userId = parsePositiveInt(req.params.id, 'id');
            const { role } = req.body;
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            if (!role) {
                res.status(400).json({
                    success: false,
                    message: 'Role is required',
                });
                return;
            }

            if (!['admin', 'organizer', 'student'].includes(role)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid role',
                });
                return;
            }

            const user = await adminService.changeUserRole(
                userId,
                role as UserRole,
                adminId,
                ipAddress,
                userAgent
            );

            res.json({
                success: true,
                message: 'User role changed successfully',
                data: user,
            });
        } catch (error) {
            console.error('Change user role error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * POST /api/admin/users/bulk-lock
     * Bulk lock users
     */
    async bulkLock(req: Request, res: Response): Promise<void> {
        try {
            const { userIds } = req.body;
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            if (!Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'userIds must be a non-empty array',
                });
                return;
            }

            const parsedUserIds = userIds.map((id: unknown, index: number) =>
                parsePositiveInt(id, `userIds[${index}]`)
            );

            const result = await adminService.bulkLock(
                parsedUserIds,
                adminId,
                ipAddress,
                userAgent
            );

            res.json({
                success: true,
                message: `Locked ${result.successCount} users`,
                ...result,
            });
        } catch (error) {
            console.error('Bulk lock error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to bulk lock users',
                error: (error as Error).message,
            });
        }
    },

    /**
     * POST /api/admin/users/bulk-unlock
     * Bulk unlock users
     */
    async bulkUnlock(req: Request, res: Response): Promise<void> {
        try {
            const { userIds } = req.body;
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            if (!Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'userIds must be a non-empty array',
                });
                return;
            }

            const parsedUserIds = userIds.map((id: unknown, index: number) =>
                parsePositiveInt(id, `userIds[${index}]`)
            );

            const result = await adminService.bulkUnlock(
                parsedUserIds,
                adminId,
                ipAddress,
                userAgent
            );

            res.json({
                success: true,
                message: `Unlocked ${result.successCount} users`,
                ...result,
            });
        } catch (error) {
            console.error('Bulk unlock error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to bulk unlock users',
                error: (error as Error).message,
            });
        }
    },

    /**
     * GET /api/admin/users/:id/audit-logs
     * Get audit logs for a user
     */
    async getUserAuditLogs(req: Request, res: Response): Promise<void> {
        try {
            const userId = parsePositiveInt(req.params.id, 'id');
            const { page, limit, actionType } = req.query;

            const result = await getUserAuditLogs(userId, {
                page: parseQueryInt(page, 1, 'page', { min: 1 }),
                limit: parseQueryInt(limit, 20, 'limit', { min: 1 }),
                actionType: getQueryString(actionType),
            });

            res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            console.error('Get user audit logs error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch audit logs',
                error: (error as Error).message,
            });
        }
    },

    /**
     * GET /api/admin/audit-logs
     * Get all audit logs with filters
     */
    async getAllAuditLogs(req: Request, res: Response): Promise<void> {
        try {
            const { page, limit, adminId, userId, actionType, entityType, dateFrom, dateTo } = req.query;

            const result = await getAuditLogs({
                page: parseQueryInt(page, 1, 'page', { min: 1 }),
                limit: parseQueryInt(limit, 20, 'limit', { min: 1, max: 100 }),
                adminId: parseOptionalPositiveInt(adminId, 'adminId'),
                userId: parseOptionalPositiveInt(userId, 'userId'),
                actionType: getQueryString(actionType),
                entityType: getQueryString(entityType),
                dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
                dateTo: dateTo ? new Date(dateTo as string) : undefined,
            });

            res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            console.error('Get all audit logs error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch audit logs',
                error: (error as Error).message,
            });
        }
    },

    /**
     * GET /api/admin/roles/matrix
     * Get role permission matrix
     */
    async getRoleMatrix(_req: Request, res: Response): Promise<void> {
        try {
            const matrix = await adminService.getRoleMatrix();

            res.json({
                success: true,
                data: matrix,
            });
        } catch (error) {
            console.error('Get role matrix error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch role matrix',
                error: (error as Error).message,
            });
        }
    },

    /**
     * GET /api/admin/roles/statistics
     * Get role distribution statistics
     */
    async getRoleStatistics(_req: Request, res: Response): Promise<void> {
        try {
            const statistics = await adminService.getRoleStatistics();

            res.json({
                success: true,
                data: statistics,
            });
        } catch (error) {
            console.error('Get role statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch role statistics',
                error: (error as Error).message,
            });
        }
    },

    /**
     * GET /api/admin/organizers
     * Get all organizers with metrics
     */
    async getOrganizers(req: Request, res: Response): Promise<void> {
        try {
            const {
                page,
                limit,
                search,
                department_id,
                status,
                eventsCreatedMin,
                eventsCreatedMax,
                totalAttendeesMin,
                totalAttendeesMax,
                sortBy,
                sortOrder,
            } = req.query;

            const { organizerService } = await import('../services/organizer.service');

            const result = await organizerService.getOrganizers({
                page: parseQueryInt(page, 1, 'page', { min: 1 }),
                limit: parseQueryInt(limit, 20, 'limit', { min: 1 }),
                search: getQueryString(search),
                department_id: parseOptionalPositiveInt(department_id, 'department_id'),
                status: getQueryString(status),
                eventsCreatedMin: parseOptionalPositiveInt(eventsCreatedMin, 'eventsCreatedMin'),
                eventsCreatedMax: parseOptionalPositiveInt(eventsCreatedMax, 'eventsCreatedMax'),
                totalAttendeesMin: parseOptionalPositiveInt(totalAttendeesMin, 'totalAttendeesMin'),
                totalAttendeesMax: parseOptionalPositiveInt(totalAttendeesMax, 'totalAttendeesMax'),
                sortBy: getQueryString(sortBy),
                sortOrder: sortOrder as 'asc' | 'desc',
            });

            res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            console.error('Get organizers error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch organizers',
                error: (error as Error).message,
            });
        }
    },

    /**
     * POST /api/admin/organizers/grant
     * Grant organizer rights to a user
     */
    async grantOrganizerRights(req: Request, res: Response): Promise<void> {
        try {
            const userId = parsePositiveInt(req.body.userId, 'userId');
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const { organizerService } = await import('../services/organizer.service');

            const user = await organizerService.grantOrganizerRights(
                userId,
                adminId,
                ipAddress,
                userAgent
            );

            res.json({
                success: true,
                message: 'Organizer rights granted successfully',
                data: user,
            });
        } catch (error) {
            console.error('Grant organizer rights error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * DELETE /api/admin/organizers/:id/revoke
     * Revoke organizer rights from a user
     */
    async revokeOrganizerRights(req: Request, res: Response): Promise<void> {
        try {
            const userId = parsePositiveInt(req.params.id, 'id');
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const { organizerService } = await import('../services/organizer.service');

            const user = await organizerService.revokeOrganizerRights(
                userId,
                adminId,
                ipAddress,
                userAgent
            );

            res.json({
                success: true,
                message: 'Organizer rights revoked successfully',
                data: user,
            });
        } catch (error) {
            console.error('Revoke organizer rights error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * GET /api/admin/organizers/:id/metrics
     * Get detailed metrics for an organizer
     */
    async getOrganizerMetrics(req: Request, res: Response): Promise<void> {
        try {
            const organizerId = parsePositiveInt(req.params.id, 'id');
            const { dateFrom, dateTo } = req.query;

            const { organizerService } = await import('../services/organizer.service');

            const metrics = await organizerService.getOrganizerMetrics(
                organizerId,
                getQueryString(dateFrom),
                getQueryString(dateTo)
            );

            res.json({
                success: true,
                data: metrics,
            });
        } catch (error) {
            console.error('Get organizer metrics error:', error);
            res.status(404).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * GET /api/admin/categories
     * Get all categories
     */
    async getCategories(_req: Request, res: Response): Promise<void> {
        try {
            const categories = await categoryService.getCategories();
            res.json({
                success: true,
                data: categories,
            });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch categories',
                error: (error as Error).message,
            });
        }
    },

    /**
     * POST /api/admin/categories
     * Create a category
     */
    async createCategory(req: Request, res: Response): Promise<void> {
        try {
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const category = await categoryService.createCategory(
                req.body,
                adminId,
                ipAddress,
                userAgent
            );

            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: category,
            });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * PUT /api/admin/categories/:id
     * Update a category
     */
    async updateCategory(req: Request, res: Response): Promise<void> {
        try {
            const id = parsePositiveInt(req.params.id, 'id');
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const category = await categoryService.updateCategory(
                id,
                req.body,
                adminId,
                ipAddress,
                userAgent
            );

            res.json({
                success: true,
                message: 'Category updated successfully',
                data: category,
            });
        } catch (error) {
            console.error('Update category error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * DELETE /api/admin/categories/:id
     * Delete a category (optionally reassign events)
     */
    async deleteCategory(req: Request, res: Response): Promise<void> {
        try {
            const id = parsePositiveInt(req.params.id, 'id');
            const reassignParam = getQueryString(req.query.reassignTo);
            const reassignTo = parseOptionalPositiveInt(reassignParam, 'reassignTo');
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const result = await categoryService.deleteCategory(
                id,
                reassignTo,
                adminId,
                ipAddress,
                userAgent
            );

            res.json(result);
        } catch (error) {
            console.error('Delete category error:', error);
            const err = error as Error & { statusCode?: number };
            res.status(err.statusCode || 400).json({
                success: false,
                message: err.message,
            });
        }
    },

    /**
     * GET /api/admin/departments
     * Get all departments
     */
    async getDepartments(_req: Request, res: Response): Promise<void> {
        try {
            const departments = await categoryService.getDepartments();
            res.json({
                success: true,
                data: departments,
            });
        } catch (error) {
            console.error('Get departments error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch departments',
                error: (error as Error).message,
            });
        }
    },

    /**
     * POST /api/admin/departments
     * Create a department
     */
    async createDepartment(req: Request, res: Response): Promise<void> {
        try {
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const department = await categoryService.createDepartment(
                req.body,
                adminId,
                ipAddress,
                userAgent
            );

            res.status(201).json({
                success: true,
                message: 'Department created successfully',
                data: department,
            });
        } catch (error) {
            console.error('Create department error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * PUT /api/admin/departments/:id
     * Update a department
     */
    async updateDepartment(req: Request, res: Response): Promise<void> {
        try {
            const id = parsePositiveInt(req.params.id, 'id');
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const department = await categoryService.updateDepartment(
                id,
                req.body,
                adminId,
                ipAddress,
                userAgent
            );

            res.json({
                success: true,
                message: 'Department updated successfully',
                data: department,
            });
        } catch (error) {
            console.error('Update department error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * DELETE /api/admin/departments/:id
     * Delete a department
     */
    async deleteDepartment(req: Request, res: Response): Promise<void> {
        try {
            const id = parsePositiveInt(req.params.id, 'id');
            const adminId = getAuthenticatedUser(req).id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            const result = await categoryService.deleteDepartment(
                id,
                adminId,
                ipAddress,
                userAgent
            );

            res.json(result);
        } catch (error) {
            console.error('Delete department error:', error);
            const err = error as Error & { statusCode?: number };
            res.status(err.statusCode || 400).json({
                success: false,
                message: err.message,
            });
        }
    },

    /**
     * GET /api/admin/statistics/dashboard
     * Get admin dashboard statistics with optional filters
     */
    async getStatisticsDashboard(req: Request, res: Response): Promise<void> {
        try {
            const { dateFrom, dateTo, department_id, category_id } = req.query;

            const result = await adminStatisticsService.getDashboard({
                dateFrom: getQueryString(dateFrom),
                dateTo: getQueryString(dateTo),
                departmentId: parseOptionalPositiveInt(department_id, 'department_id'),
                categoryId: parseOptionalPositiveInt(category_id, 'category_id'),
            });

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('Get admin dashboard statistics error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },

    /**
     * GET /api/admin/statistics/charts
     * Get admin chart datasets with optional filters
     */
    async getStatisticsCharts(req: Request, res: Response): Promise<void> {
        try {
            const { dateFrom, dateTo, department_id, category_id } = req.query;

            const result = await adminStatisticsService.getCharts({
                dateFrom: getQueryString(dateFrom),
                dateTo: getQueryString(dateTo),
                departmentId: parseOptionalPositiveInt(department_id, 'department_id'),
                categoryId: parseOptionalPositiveInt(category_id, 'category_id'),
            });

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('Get admin chart statistics error:', error);
            res.status(400).json({
                success: false,
                message: (error as Error).message,
            });
        }
    },
};
