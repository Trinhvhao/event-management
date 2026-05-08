import prisma from '../config/database';
import { EventTeamRole } from '@prisma/client';

export type PermissionAction =
    | 'manage_event'
    | 'checkin'
    | 'view_feedback'
    | 'manage_registrations'
    | 'award_points';

const ROLE_PERMISSIONS: Record<EventTeamRole, PermissionAction[]> = {
    main_organizer: ['manage_event', 'checkin', 'view_feedback', 'manage_registrations', 'award_points'],
    helper: ['checkin', 'view_feedback'],
};

interface AddTeamMemberParams {
    eventId: number;
    userId: number;
    role: EventTeamRole;
    addedBy: number;
}

interface TeamMemberWithUser {
    id: number;
    event_id: number;
    user_id: number;
    role: EventTeamRole;
    added_by: number;
    created_at: Date;
    user: {
        id: number;
        full_name: string;
        email: string;
        student_id: string | null;
        role: string;
        department: {
            id: number;
            name: string;
            code: string;
        } | null;
    };
    added_by_user: {
        id: number;
        full_name: string;
        email: string;
    };
}

export const eventTeamService = {
    /**
     * Get all team members for an event
     */
    async getEventTeam(eventId: number): Promise<TeamMemberWithUser[]> {
        const members = await prisma.eventTeamMember.findMany({
            where: { event_id: eventId },
            include: {
                user: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        student_id: true,
                        role: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
                added_by_user: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { role: 'asc' },
                { created_at: 'asc' },
            ],
        });
        return members;
    },

    /**
     * Add a team member to an event
     */
    async addTeamMember(params: AddTeamMemberParams): Promise<TeamMemberWithUser> {
        const { eventId, userId, role, addedBy } = params;

        // Check if user exists and has organizer role
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (user.role === 'participant') {
            throw new Error('User must be an organizer to be added to event team');
        }

        if (user.role !== 'organizer' && user.role !== 'admin') {
            throw new Error('User must be an organizer to be added to event team');
        }

        // Check if already a member
        const existing = await prisma.eventTeamMember.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: userId },
            },
        });

        if (existing) {
            throw new Error('User is already a team member of this event');
        }

        // Verify event exists
        const event = await prisma.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            throw new Error('Event not found');
        }

        // Create team member
        const member = await prisma.eventTeamMember.create({
            data: {
                event_id: eventId,
                user_id: userId,
                role,
                added_by: addedBy,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        student_id: true,
                        role: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
                added_by_user: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
        });

        // Log activity
        await prisma.eventTeamActivity.create({
            data: {
                event_id: eventId,
                actor_id: addedBy,
                action_type: 'team_member_added',
                target_user_id: userId,
                metadata: { role, added_by_user_id: addedBy },
            },
        });

        return member;
    },

    /**
     * Remove a team member from an event
     */
    async removeTeamMember(eventId: number, userId: number, removedBy: number): Promise<void> {
        const member = await prisma.eventTeamMember.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: userId },
            },
        });

        if (!member) {
            throw new Error('Team member not found');
        }

        await prisma.eventTeamMember.delete({
            where: { id: member.id },
        });

        await prisma.eventTeamActivity.create({
            data: {
                event_id: eventId,
                actor_id: removedBy,
                action_type: 'team_member_removed',
                target_user_id: userId,
                metadata: { previous_role: member.role },
            },
        });
    },

    /**
     * Update team member role
     */
    async updateTeamMemberRole(
        eventId: number,
        userId: number,
        newRole: EventTeamRole,
        updatedBy: number
    ): Promise<TeamMemberWithUser> {
        const member = await prisma.eventTeamMember.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: userId },
            },
        });

        if (!member) {
            throw new Error('Team member not found');
        }

        const previousRole = member.role;

        const updated = await prisma.eventTeamMember.update({
            where: { id: member.id },
            data: { role: newRole },
            include: {
                user: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        student_id: true,
                        role: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
                added_by_user: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
        });

        await prisma.eventTeamActivity.create({
            data: {
                event_id: eventId,
                actor_id: updatedBy,
                action_type: 'team_member_role_changed',
                target_user_id: userId,
                metadata: { previous_role: previousRole, new_role: newRole },
            },
        });

        return updated;
    },

    /**
     * Get effective permission for a role on an event (with overrides)
     */
    async getEffectivePermission(
        eventId: number,
        role: EventTeamRole,
        action: PermissionAction
    ): Promise<boolean> {
        // Check for override in EventTeamPermission
        const override = await prisma.eventTeamPermission.findUnique({
            where: {
                event_id_role_permission: {
                    event_id: eventId,
                    role,
                    permission: action,
                },
            },
        });

        if (override !== null) {
            return override.allowed;
        }

        // Fall back to default role permissions
        return ROLE_PERMISSIONS[role].includes(action);
    },

    /**
     * Check if user can perform an action on an event
     */
    async canUserPerformAction(
        eventId: number,
        userId: number,
        userRole: string,
        action: PermissionAction
    ): Promise<boolean> {
        // Admin can do everything
        if (userRole === 'admin') {
            return true;
        }

        // Check if user is the main organizer
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { organizer_id: true },
        });

        if (!event) {
            return false;
        }

        // Main organizer (creator) has full access
        if (event.organizer_id === userId) {
            return true;
        }

        // Check team member role
        const member = await prisma.eventTeamMember.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: userId },
            },
        });

        if (!member) {
            return false;
        }

        // Check if role allows the action (with event-level overrides)
        return await this.getEffectivePermission(eventId, member.role, action);
    },

    /**
     * Check if user can manage team (add/remove/update members)
     */
    async canUserManageTeam(
        eventId: number,
        userId: number,
        userRole: string
    ): Promise<boolean> {
        // Admin can do everything
        if (userRole === 'admin') {
            return true;
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { organizer_id: true },
        });

        if (!event) {
            return false;
        }

        // Event creator has full team management rights
        if (event.organizer_id === userId) {
            return true;
        }

        // Also allow main_organizer role team members to manage team
        const member = await prisma.eventTeamMember.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: userId },
            },
        });

        return member?.role === 'main_organizer';
    },

    /**
     * Search available users to add to team (organizers not yet in the event)
     */
    async searchAvailableUsers(eventId: number, query: string, limit: number = 10) {
        // Get current team member user IDs
        const currentMembers = await prisma.eventTeamMember.findMany({
            where: { event_id: eventId },
            select: { user_id: true },
        });

        const excludeIds = currentMembers.map((m) => m.user_id);

        // Get the event's main organizer to exclude too
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { organizer_id: true },
        });

        if (event?.organizer_id) {
            excludeIds.push(event.organizer_id);
        }

        const users = await prisma.user.findMany({
            where: {
                role: { in: ['organizer', 'admin'] },
                is_active: true,
                id: { notIn: excludeIds },
                OR: query
                    ? [
                          { full_name: { contains: query, mode: 'insensitive' } },
                          { email: { contains: query, mode: 'insensitive' } },
                          { student_id: { contains: query, mode: 'insensitive' } },
                      ]
                    : undefined,
            },
            select: {
                id: true,
                full_name: true,
                email: true,
                student_id: true,
                role: true,
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
            take: limit,
            orderBy: { full_name: 'asc' },
        });

        return users;
    },

    /**
     * Transfer main organizer role from current organizer to a team member
     */
    async transferMainOrganizer(
        eventId: number,
        currentUserId: number,
        newOrganizerUserId: number,
        newOrganizerRole: EventTeamRole
    ): Promise<{ event: any; newOrganizer: any }> {
        // Verify current user can manage team
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { organizer_id: true, title: true },
        });

        if (!event) {
            throw new Error('Event not found');
        }

        // Verify new organizer is already a team member
        const newOrganizerMember = await prisma.eventTeamMember.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: newOrganizerUserId },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        role: true,
                        department: { select: { id: true, name: true, code: true } },
                    },
                },
            },
        });

        if (!newOrganizerMember) {
            throw new Error('New organizer must be a team member first');
        }

        // Update event's organizer_id
        const updatedEvent = await prisma.event.update({
            where: { id: eventId },
            data: { organizer_id: newOrganizerUserId },
            select: {
                id: true,
                title: true,
                organizer_id: true,
            },
        });

        // If new organizer was a helper, upgrade to main_organizer
        if (newOrganizerRole === 'helper') {
            await prisma.eventTeamMember.update({
                where: { id: newOrganizerMember.id },
                data: { role: 'main_organizer' },
            });
        }

        // Log the transfer
        await prisma.eventTeamActivity.create({
            data: {
                event_id: eventId,
                actor_id: currentUserId,
                action_type: 'team_member_role_changed',
                target_user_id: newOrganizerUserId,
                metadata: {
                    action: 'transfer_main_organizer',
                    previous_organizer_id: event.organizer_id,
                    new_organizer_id: newOrganizerUserId,
                    event_title: event.title,
                },
            },
        });

        return {
            event: updatedEvent,
            newOrganizer: newOrganizerMember.user,
        };
    },

    /**
     * Log an activity to the event team activity log
     */
    async logActivity(params: {
        eventId: number;
        actorId: number;
        actionType:
            | 'team_member_added'
            | 'team_member_removed'
            | 'team_member_role_changed'
            | 'event_updated'
            | 'event_cancelled'
            | 'registration_approved'
            | 'registration_rejected'
            | 'registration_cancelled'
            | 'attendee_checked_in'
            | 'attendee_checked_out'
            | 'points_awarded'
            | 'event_published';
        targetUserId?: number;
        metadata?: Record<string, any>;
        ipAddress?: string;
    }): Promise<void> {
        await prisma.eventTeamActivity.create({
            data: {
                event_id: params.eventId,
                actor_id: params.actorId,
                action_type: params.actionType,
                target_user_id: params.targetUserId ?? null,
                metadata: params.metadata ?? undefined,
                ip_address: params.ipAddress ?? null,
            },
        });
    },

    /**
     * Get activity log for an event
     */
    async getEventActivityLog(
        eventId: number,
        options: { page?: number; limit?: number; actionType?: string } = {}
    ) {
        const page = options.page || 1;
        const limit = options.limit || 50;
        const skip = (page - 1) * limit;

        const where: any = { event_id: eventId };
        if (options.actionType) {
            where.action_type = options.actionType;
        }

        const [activities, total] = await Promise.all([
            prisma.eventTeamActivity.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    actor: {
                        select: { id: true, full_name: true, email: true },
                    },
                    target: {
                        select: { id: true, full_name: true, email: true },
                    },
                },
            }),
            prisma.eventTeamActivity.count({ where }),
        ]);

        return {
            data: activities,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Get default permissions for each role
     */
    getDefaultPermissions() {
        return {
            main_organizer: ROLE_PERMISSIONS.main_organizer,
            helper: ROLE_PERMISSIONS.helper,
        };
    },

    /**
     * Get permission matrix for an event (defaults + overrides)
     */
    async getPermissionMatrix(eventId: number) {
        const defaults = this.getDefaultPermissions();
        const overrides = await prisma.eventTeamPermission.findMany({
            where: { event_id: eventId },
        });

        // Build per-role permission maps with overrides applied
        const allActions: PermissionAction[] = [
            'manage_event',
            'checkin',
            'view_feedback',
            'manage_registrations',
            'award_points',
        ];

        const matrix: Record<string, Record<string, boolean>> = {
            main_organizer: {},
            helper: {},
        };

        for (const action of allActions) {
            matrix.main_organizer[action] = defaults.main_organizer.includes(action);
            matrix.helper[action] = defaults.helper.includes(action);
        }

        // Apply overrides
        for (const override of overrides) {
            matrix[override.role] ??= {};
            matrix[override.role][override.permission] = override.allowed;
        }

        return {
            defaults,
            overrides,
            matrix,
        };
    },

    /**
     * Update permission overrides for a role on an event
     */
    async updatePermission(
        eventId: number,
        role: EventTeamRole,
        permission: string,
        allowed: boolean,
        updatedBy: number
    ): Promise<void> {
        const allActions: PermissionAction[] = [
            'manage_event',
            'checkin',
            'view_feedback',
            'manage_registrations',
            'award_points',
        ];

        if (!allActions.includes(permission as PermissionAction)) {
            throw new Error('Invalid permission action');
        }

        // Upsert the override
        await prisma.eventTeamPermission.upsert({
            where: {
                event_id_role_permission: {
                    event_id: eventId,
                    role,
                    permission,
                },
            },
            update: { allowed, updated_by: updatedBy },
            create: {
                event_id: eventId,
                role,
                permission,
                allowed,
                updated_by: updatedBy,
            },
        });
    },

    /**
     * Remove all permission overrides for a role on an event
     */
    async removeRoleOverrides(eventId: number, role: EventTeamRole): Promise<void> {
        await prisma.eventTeamPermission.deleteMany({
            where: { event_id: eventId, role },
        });
    },
};
