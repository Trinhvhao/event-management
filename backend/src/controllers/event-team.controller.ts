import { Request, Response, NextFunction } from 'express';
import { eventTeamService } from '../services/event-team.service';
import { successResponse } from '../utils/response.util';
import { EventTeamRole } from '@prisma/client';
import { parsePositiveInt } from '../utils/request.util';

export const eventTeamController = {
    /**
     * Get team members for an event
     * @route   GET /api/events/:eventId/team
     * @access  Private (authenticated)
     */
    async getTeam(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = parsePositiveInt(req.params.eventId, 'eventId');
            const user = (req as any).user;

            // Check if user has any access to this event
            const canView = await eventTeamService.canUserPerformAction(
                eventId,
                user.id,
                user.role,
                'view_feedback'
            );

            if (!canView && user.role !== 'admin') {
                // Also allow main organizer
                const canManage = await eventTeamService.canUserManageTeam(eventId, user.id, user.role);
                if (!canManage) {
                    res.status(403).json({
                        success: false,
                        message: 'You do not have permission to view this event team',
                    });
                    return;
                }
            }

            const members = await eventTeamService.getEventTeam(eventId);

            res.json(successResponse(members, 'Team members retrieved successfully'));
        } catch (error) {
            next(error);
        }
    },

    /**
     * Add a team member to an event
     * @route   POST /api/events/:eventId/team
     * @access  Private (main organizer or admin only)
     */
    async addTeamMember(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = parsePositiveInt(req.params.eventId, 'eventId');
            const { userId, role } = req.body;
            const user = (req as any).user;

            // Check if user can manage team
            const canManage = await eventTeamService.canUserManageTeam(eventId, user.id, user.role);
            if (!canManage) {
                res.status(403).json({
                    success: false,
                    message: 'Only the main organizer or admin can add team members',
                });
                return;
            }

            if (!userId || !role) {
                res.status(400).json({
                    success: false,
                    message: 'userId and role are required',
                });
                return;
            }

            if (!['main_organizer', 'helper'].includes(role)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be main_organizer or helper',
                });
                return;
            }

            const member = await eventTeamService.addTeamMember({
                eventId,
                userId: parsePositiveInt(userId, 'userId'),
                role: role as EventTeamRole,
                addedBy: user.id,
            });

            res.status(201).json(successResponse(member, 'Team member added successfully'));
        } catch (error) {
            next(error);
        }
    },

    /**
     * Remove a team member from an event
     * @route   DELETE /api/events/:eventId/team/:userId
     * @access  Private (main organizer or admin only)
     */
    async removeTeamMember(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = parsePositiveInt(req.params.eventId, 'eventId');
            const targetUserId = parsePositiveInt(req.params.userId, 'userId');
            const user = (req as any).user;

            // Check if user can manage team
            const canManage = await eventTeamService.canUserManageTeam(eventId, user.id, user.role);
            if (!canManage) {
                res.status(403).json({
                    success: false,
                    message: 'Only the main organizer or admin can remove team members',
                });
                return;
            }

            await eventTeamService.removeTeamMember(eventId, targetUserId, user.id);

            res.json(successResponse(null, 'Team member removed successfully'));
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update team member role
     * @route   PUT /api/events/:eventId/team/:userId
     * @access  Private (main organizer or admin only)
     */
    async updateTeamMemberRole(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = parsePositiveInt(req.params.eventId, 'eventId');
            const targetUserId = parsePositiveInt(req.params.userId, 'userId');
            const { role } = req.body;
            const user = (req as any).user;

            // Check if user can manage team
            const canManage = await eventTeamService.canUserManageTeam(eventId, user.id, user.role);
            if (!canManage) {
                res.status(403).json({
                    success: false,
                    message: 'Only the main organizer or admin can update team member roles',
                });
                return;
            }

            if (!role) {
                res.status(400).json({
                    success: false,
                    message: 'role is required',
                });
                return;
            }

            if (!['main_organizer', 'helper'].includes(role)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be main_organizer or helper',
                });
                return;
            }

            const updated = await eventTeamService.updateTeamMemberRole(
                eventId,
                targetUserId,
                role as EventTeamRole,
                user.id
            );

            res.json(successResponse(updated, 'Team member role updated successfully'));
        } catch (error) {
            next(error);
        }
    },

    /**
     * Search available users to add to event team
     * @route   GET /api/events/:eventId/team/search
     * @access  Private (main organizer or admin only)
     */
    async searchAvailableUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = parsePositiveInt(req.params.eventId, 'eventId');
            const { q = '', limit = 10 } = req.query;
            const user = (req as any).user;

            // Check if user can manage team
            const canManage = await eventTeamService.canUserManageTeam(eventId, user.id, user.role);
            if (!canManage) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have permission to search team members',
                });
                return;
            }

            const users = await eventTeamService.searchAvailableUsers(
                eventId,
                typeof q === 'string' ? q : '',
                typeof limit === 'string' ? parseInt(limit) || 10 : 10
            );

            res.json(successResponse(users, 'Users retrieved successfully'));
        } catch (error) {
            next(error);
        }
    },

    /**
     * Transfer main organizer to another team member
     * @route   POST /api/events/:eventId/team/transfer
     * @access  Private (main organizer or admin only)
     */
    async transferMainOrganizer(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = parsePositiveInt(req.params.eventId, 'eventId');
            const { userId, role } = req.body;
            const user = (req as any).user;

            if (!userId) {
                res.status(400).json({ success: false, message: 'userId is required' });
                return;
            }

            const canManage = await eventTeamService.canUserManageTeam(eventId, user.id, user.role);
            if (!canManage) {
                res.status(403).json({ success: false, message: 'Only the main organizer or admin can transfer ownership' });
                return;
            }

            const result = await eventTeamService.transferMainOrganizer(
                eventId,
                user.id,
                parsePositiveInt(userId, 'userId'),
                (role as EventTeamRole) || 'main_organizer'
            );

            res.json(successResponse(result, 'Event ownership transferred successfully'));
        } catch (error: any) {
            if (error.message.includes('not found') || error.message.includes('must be a team member')) {
                res.status(400).json({ success: false, message: error.message });
                return;
            }
            next(error);
        }
    },

    /**
     * Get permission matrix for an event
     * @route   GET /api/events/:eventId/permissions
     * @access  Private (main organizer or admin only)
     */
    async getPermissionMatrix(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = parsePositiveInt(req.params.eventId, 'eventId');
            const user = (req as any).user;

            const canManage = await eventTeamService.canUserManageTeam(eventId, user.id, user.role);
            if (!canManage) {
                res.status(403).json({ success: false, message: 'Only the main organizer or admin can manage permissions' });
                return;
            }

            const matrix = await eventTeamService.getPermissionMatrix(eventId);
            res.json(successResponse(matrix, 'Permission matrix retrieved'));
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update a permission override for a role
     * @route   PUT /api/events/:eventId/permissions
     * @access  Private (main organizer or admin only)
     */
    async updatePermission(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = parsePositiveInt(req.params.eventId, 'eventId');
            const { role, permission, allowed } = req.body;
            const user = (req as any).user;

            if (!role || !permission || allowed === undefined) {
                res.status(400).json({ success: false, message: 'role, permission, and allowed are required' });
                return;
            }

            if (!['main_organizer', 'helper'].includes(role)) {
                res.status(400).json({ success: false, message: 'Invalid role' });
                return;
            }

            const canManage = await eventTeamService.canUserManageTeam(eventId, user.id, user.role);
            if (!canManage) {
                res.status(403).json({ success: false, message: 'Only the main organizer or admin can manage permissions' });
                return;
            }

            await eventTeamService.updatePermission(
                eventId,
                role as EventTeamRole,
                permission,
                Boolean(allowed),
                user.id
            );

            const matrix = await eventTeamService.getPermissionMatrix(eventId);
            res.json(successResponse(matrix, 'Permission updated'));
        } catch (error: any) {
            if (error.message === 'Invalid permission action') {
                res.status(400).json({ success: false, message: error.message });
                return;
            }
            next(error);
        }
    },

    /**
     * Get activity log for an event
     * @route   GET /api/events/:eventId/activities
     * @access  Private (main organizer or admin only)
     */
    async getActivityLog(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = parsePositiveInt(req.params.eventId, 'eventId');
            const { page = '1', limit = '50', actionType } = req.query;
            const user = (req as any).user;

            const canManage = await eventTeamService.canUserManageTeam(eventId, user.id, user.role);
            if (!canManage) {
                res.status(403).json({ success: false, message: 'You do not have permission to view activity log' });
                return;
            }

            const result = await eventTeamService.getEventActivityLog(eventId, {
                page: parseInt(String(page)) || 1,
                limit: parseInt(String(limit)) || 50,
                actionType: typeof actionType === 'string' ? actionType : undefined,
            });

            res.json(successResponse(result, 'Activity log retrieved'));
        } catch (error) {
            next(error);
        }
    },
};
