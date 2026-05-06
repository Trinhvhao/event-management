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

        if (user.role === 'student') {
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

        return member;
    },

    /**
     * Remove a team member from an event
     */
    async removeTeamMember(eventId: number, userId: number): Promise<void> {
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
    },

    /**
     * Update team member role
     */
    async updateTeamMemberRole(
        eventId: number,
        userId: number,
        newRole: EventTeamRole
    ): Promise<TeamMemberWithUser> {
        const member = await prisma.eventTeamMember.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: userId },
            },
        });

        if (!member) {
            throw new Error('Team member not found');
        }

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

        return updated;
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

        // Check if role allows the action
        const allowedActions = ROLE_PERMISSIONS[member.role];
        return allowedActions.includes(action);
    },

    /**
     * Check if user can manage team (add/remove/update members)
     */
    async canUserManageTeam(
        eventId: number,
        userId: number,
        userRole: string
    ): Promise<boolean> {
        // Only admin or main organizer can manage team
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

        return event.organizer_id === userId;
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

        if (event) {
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
};
