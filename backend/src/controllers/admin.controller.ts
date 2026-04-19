import { Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { getUserAuditLogs } from '../services/audit.service';
import { categoryService } from '../services/category.service';

// Helper to safely get string from query param
const getQueryString = (param: unknown): string | undefined => {
    if (typeof param === 'string') return param;
    if (Array.isArray(param) && typeof param[0] === 'string') return param[0];
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
                page: page ? parseInt(getQueryString(page) || '1') : undefined,
                limit: limit ? parseInt(getQueryString(limit) || '20') : undefined,
                search: getQueryString(search),
                role: getQueryString(role),
                department_id: getQueryString(department_id),
                is_active: getQueryString(is_active),
                sortBy: getQueryString(sortBy),
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
     * PUT /api/admin/users/:id/lock
     * Lock a user account
     */
    async lockUser(req: Request, res: Response): Promise<void> {
        try {
            const userId = Number(req.params.id);
            const adminId = req.user!.id;
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
            const userId = Number(req.params.id);
            const adminId = req.user!.id;
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
            const userId = Number(req.params.id);
            const { role } = req.body;
            const adminId = req.user!.id;
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
                role,
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
            const adminId = req.user!.id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            if (!Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'userIds must be a non-empty array',
                });
                return;
            }

            const parsedUserIds = userIds.map((id: unknown) => Number(id));

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
            const adminId = req.user!.id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            if (!Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'userIds must be a non-empty array',
                });
                return;
            }

            const parsedUserIds = userIds.map((id: unknown) => Number(id));

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
            const userId = Number(req.params.id);
            const { page, limit, actionType } = req.query;

            const result = await getUserAuditLogs(userId, {
                page: page ? parseInt(getQueryString(page) || '1') : undefined,
                limit: limit ? parseInt(getQueryString(limit) || '20') : undefined,
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
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                search: search as string,
                department_id: department_id as string,
                status: status as string,
                eventsCreatedMin: eventsCreatedMin ? parseInt(eventsCreatedMin as string) : undefined,
                eventsCreatedMax: eventsCreatedMax ? parseInt(eventsCreatedMax as string) : undefined,
                totalAttendeesMin: totalAttendeesMin ? parseInt(totalAttendeesMin as string) : undefined,
                totalAttendeesMax: totalAttendeesMax ? parseInt(totalAttendeesMax as string) : undefined,
                sortBy: sortBy as string,
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
            const userId = Number(req.body.userId);
            const adminId = req.user!.id;
            const ipAddress = req.ip || undefined;
            const userAgent = req.get('user-agent') || undefined;

            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'userId is required',
                });
                return;
            }

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
            const userId = Number(req.params.id);
            const adminId = req.user!.id;
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
            const organizerId = Number(req.params.id);
            const { dateFrom, dateTo } = req.query;

            const { organizerService } = await import('../services/organizer.service');

            const metrics = await organizerService.getOrganizerMetrics(
                organizerId,
                dateFrom as string,
                dateTo as string
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
            const adminId = req.user!.id;
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
            const id = Number(req.params.id);
            const adminId = req.user!.id;
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
            const id = Number(req.params.id);
            const reassignParam = getQueryString(req.query.reassignTo);
            const reassignTo = reassignParam ? Number(reassignParam) : undefined;
            const adminId = req.user!.id;
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
            const adminId = req.user!.id;
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
            const id = Number(req.params.id);
            const adminId = req.user!.id;
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
            const id = Number(req.params.id);
            const adminId = req.user!.id;
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
};
