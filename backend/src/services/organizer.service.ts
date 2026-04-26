import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { createAuditLog } from './audit.service';
import {
    notifyOrganizerRightsGranted,
    notifyOrganizerRightsRevoked,
} from './notifications.service';

interface GetOrganizersParams {
    page?: number;
    limit?: number;
    search?: string;
    department_id?: number;
    status?: string;
    eventsCreatedMin?: number;
    eventsCreatedMax?: number;
    totalAttendeesMin?: number;
    totalAttendeesMax?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const organizerService = {
    /**
     * Get organizers with KPI metrics
     */
    async getOrganizers(params: GetOrganizersParams) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        const sortBy = params.sortBy || 'eventsCreated';
        const sortOrder = params.sortOrder || 'desc';

        // Build where clause for users
        const where: Prisma.UserWhereInput = {
            role: 'organizer',
        };

        if (params.search) {
            where.OR = [
                { full_name: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        if (params.department_id !== undefined) {
            where.department_id = params.department_id;
        }

        if (params.status !== undefined && params.status !== '') {
            where.is_active = params.status === 'active';
        }

        const organizers = await prisma.user.findMany({
            where,
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });

        // Compute metrics for each organizer
        const organizersWithMetrics = await Promise.all(
            organizers.map(async (organizer) => {
                const metrics = await this.computeOrganizerMetrics(organizer.id);
                return {
                    ...organizer,
                    metrics,
                };
            })
        );

        // Filter by metrics if specified
        let filteredOrganizers = organizersWithMetrics;
        if (params.eventsCreatedMin !== undefined) {
            filteredOrganizers = filteredOrganizers.filter(
                (o) => o.metrics.eventsCreated >= params.eventsCreatedMin!
            );
        }
        if (params.eventsCreatedMax !== undefined) {
            filteredOrganizers = filteredOrganizers.filter(
                (o) => o.metrics.eventsCreated <= params.eventsCreatedMax!
            );
        }
        if (params.totalAttendeesMin !== undefined) {
            filteredOrganizers = filteredOrganizers.filter(
                (o) => o.metrics.totalAttendees >= params.totalAttendeesMin!
            );
        }
        if (params.totalAttendeesMax !== undefined) {
            filteredOrganizers = filteredOrganizers.filter(
                (o) => o.metrics.totalAttendees <= params.totalAttendeesMax!
            );
        }

        // Sort by metrics
        if (sortBy === 'eventsCreated') {
            filteredOrganizers.sort((a, b) =>
                sortOrder === 'asc'
                    ? a.metrics.eventsCreated - b.metrics.eventsCreated
                    : b.metrics.eventsCreated - a.metrics.eventsCreated
            );
        } else if (sortBy === 'totalAttendees') {
            filteredOrganizers.sort((a, b) =>
                sortOrder === 'asc'
                    ? a.metrics.totalAttendees - b.metrics.totalAttendees
                    : b.metrics.totalAttendees - a.metrics.totalAttendees
            );
        } else if (sortBy === 'averageRating') {
            filteredOrganizers.sort((a, b) =>
                sortOrder === 'asc'
                    ? a.metrics.averageRating - b.metrics.averageRating
                    : b.metrics.averageRating - a.metrics.averageRating
            );
        }

        const total = filteredOrganizers.length;
        const paginatedOrganizers = filteredOrganizers.slice(skip, skip + limit);

        return {
            data: paginatedOrganizers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Compute KPI metrics for an organizer
     */
    async computeOrganizerMetrics(organizerId: number, dateFrom?: Date, dateTo?: Date) {
        const eventWhere: any = {
            organizer_id: organizerId,
            deleted_at: null,
        };

        if (dateFrom || dateTo) {
            eventWhere.start_time = {};
            if (dateFrom) eventWhere.start_time.gte = dateFrom;
            if (dateTo) eventWhere.start_time.lte = dateTo;
        }

        const [
            eventsCreated,
            upcomingEvents,
            ongoingEvents,
            completedEvents,
            attendanceData,
            feedbackData,
        ] = await Promise.all([
            // Total events created
            prisma.event.count({ where: eventWhere }),

            // Upcoming events
            prisma.event.count({
                where: {
                    ...eventWhere,
                    start_time: { gte: new Date() },
                    status: 'upcoming',
                },
            }),

            // Ongoing events
            prisma.event.count({
                where: {
                    ...eventWhere,
                    status: 'ongoing',
                },
            }),

            // Completed events
            prisma.event.count({
                where: {
                    ...eventWhere,
                    end_time: { lt: new Date() },
                    status: 'completed',
                },
            }),

            // Total attendees (from attendances)
            prisma.attendance.count({
                where: {
                    registration: {
                        event: eventWhere,
                    },
                },
            }),

            // Average rating (from feedback)
            prisma.feedback.aggregate({
                where: {
                    event: eventWhere,
                },
                _avg: {
                    rating: true,
                },
            }),
        ]);

        return {
            eventsCreated,
            totalAttendees: attendanceData,
            averageRating: feedbackData._avg.rating || 0,
            upcomingEvents,
            ongoingEvents,
            completedEvents,
        };
    },

    /**
     * Grant organizer rights to a user
     */
    async grantOrganizerRights(
        userId: number,
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        // Business rules validation
        if (user.role === 'organizer') {
            throw new Error('User is already an organizer');
        }

        if (user.role === 'admin') {
            throw new Error('Cannot grant organizer rights to admin');
        }

        if (!user.email_verified) {
            throw new Error('User email must be verified');
        }

        if (!user.is_active) {
            throw new Error('User must be active');
        }

        // Update user role
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: 'organizer' },
            include: {
                department: true,
            },
        });

        // Create audit log
        await createAuditLog({
            actionType: 'organizer_granted',
            adminId,
            userId,
            entityType: 'user',
            entityId: userId,
            oldValue: { role: 'student' },
            newValue: { role: 'organizer' },
            ipAddress,
            userAgent,
        });

        try {
            await notifyOrganizerRightsGranted(userId);
        } catch (error) {
            console.error('Failed to notify organizer rights grant:', error);
        }

        return updatedUser;
    },

    /**
     * Revoke organizer rights from a user
     */
    async revokeOrganizerRights(
        userId: number,
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        if (user.role !== 'organizer') {
            throw new Error('User is not an organizer');
        }

        // Check for ongoing events
        const ongoingEvents = await prisma.event.count({
            where: {
                organizer_id: userId,
                start_time: { lte: new Date() },
                end_time: { gte: new Date() },
            },
        });

        if (ongoingEvents > 0) {
            throw new Error('Cannot revoke rights while user has ongoing events');
        }

        // Update user role back to student
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: 'student' },
            include: {
                department: true,
            },
        });

        // Create audit log
        await createAuditLog({
            actionType: 'organizer_revoked',
            adminId,
            userId,
            entityType: 'user',
            entityId: userId,
            oldValue: { role: 'organizer' },
            newValue: { role: 'student' },
            ipAddress,
            userAgent,
        });

        try {
            await notifyOrganizerRightsRevoked(userId);
        } catch (error) {
            console.error('Failed to notify organizer rights revoke:', error);
        }

        return updatedUser;
    },

    /**
     * Get detailed metrics for an organizer
     */
    async getOrganizerMetrics(
        organizerId: number,
        dateFrom?: string,
        dateTo?: string
    ) {
        const user = await prisma.user.findUnique({ where: { id: organizerId } });
        if (!user || user.role !== 'organizer') {
            throw new Error('Organizer not found');
        }

        const from = dateFrom ? new Date(dateFrom) : undefined;
        const to = dateTo ? new Date(dateTo) : undefined;

        const basicMetrics = await this.computeOrganizerMetrics(organizerId, from, to);

        const metricWhere: Prisma.EventWhereInput = {
            organizer_id: organizerId,
            deleted_at: null,
            ...(from || to
                ? {
                      start_time: {
                          ...(from ? { gte: from } : {}),
                          ...(to ? { lte: to } : {}),
                      },
                  }
                : {}),
        };

        // Get events by category
        const eventsByCategory = await prisma.event.groupBy({
            by: ['category_id'],
            where: metricWhere,
            _count: { _all: true },
        });

        const categoriesData = await Promise.all(
            eventsByCategory.map(async (item) => {
                const category = await prisma.category.findUnique({
                    where: { id: item.category_id },
                });
                return {
                    categoryId: item.category_id,
                    categoryName: category?.name || 'Unknown',
                    count: item._count._all,
                };
            })
        );

        return {
            ...basicMetrics,
            eventsByCategory: categoriesData,
        };
    },
};
