import prisma from '../config/database';
import { UserRole } from '@prisma/client';
import {
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from '../middleware/errorHandler';
import { notifyPointsAwarded } from './notifications.service';

type RequesterContext = {
    id: number;
    role: UserRole;
};

type AwardPointsInput = {
    userId: number;
    eventId: number;
    points?: number;
    semester?: string;
};

type ExportTrainingPointsFilters = {
    semester?: string;
    eventId?: number;
    userId?: number;
};

export const getMyTrainingPoints = async (userId: number) => {
    // Get all training points grouped by semester
    const points = await prisma.trainingPoint.findMany({
        where: { user_id: userId },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    start_time: true,
                    category_id: true,
                },
            },
        },
        orderBy: {
            earned_at: 'desc',
        },
    });

    // Group by semester and calculate totals
    const groupedBySemester = points.reduce((acc, point) => {
        if (!acc[point.semester]) {
            acc[point.semester] = {
                semester: point.semester,
                total_points: 0,
                events_count: 0,
                points: [],
            };
        }
        acc[point.semester].total_points += point.points;
        acc[point.semester].events_count += 1;
        acc[point.semester].points.push(point);
        return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by semester (newest first)
    const semesters = Object.values(groupedBySemester).sort((a: any, b: any) => {
        return b.semester.localeCompare(a.semester);
    });

    // Calculate grand total
    const grandTotal = points.reduce((sum, point) => sum + point.points, 0);

    return {
        grand_total: grandTotal,
        total_events: points.length,
        semesters,
    };
};

export const getMyPointsHistory = async (
    userId: number,
    semester?: string,
    limit: number = 50,
    offset: number = 0
) => {
    const where: any = { user_id: userId };

    if (semester) {
        where.semester = semester;
    }

    const [points, total] = await Promise.all([
        prisma.trainingPoint.findMany({
            where,
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        start_time: true,
                        end_time: true,
                        location: true,
                        category_id: true,
                    },
                },
            },
            orderBy: {
                earned_at: 'desc',
            },
            take: limit,
            skip: offset,
        }),
        prisma.trainingPoint.count({ where }),
    ]);

    return {
        points,
        total,
        limit,
        offset,
        has_more: offset + limit < total,
    };
};

export const getUserTrainingPoints = async (userId: number) => {
    // Admin can view any user's points
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            full_name: true,
            email: true,
            student_id: true,
        },
    });

    if (!user) {
        throw new NotFoundError('User');
    }

    const pointsData = await getMyTrainingPoints(userId);

    return {
        user,
        ...pointsData,
    };
};

export const getTrainingPointsStatistics = async () => {
    // Get statistics for admin dashboard
    const [totalPoints, totalUsers, topUsers, semesterStats] = await Promise.all([
        // Total points awarded
        prisma.trainingPoint.aggregate({
            _sum: {
                points: true,
            },
        }),

        // Total users with points
        prisma.trainingPoint.groupBy({
            by: ['user_id'],
            _count: {
                user_id: true,
            },
        }),

        // Top 10 users by points
        prisma.trainingPoint.groupBy({
            by: ['user_id'],
            _sum: {
                points: true,
            },
            orderBy: {
                _sum: {
                    points: 'desc',
                },
            },
            take: 10,
        }),

        // Points by semester
        prisma.trainingPoint.groupBy({
            by: ['semester'],
            _sum: {
                points: true,
            },
            _count: {
                id: true,
            },
            orderBy: {
                semester: 'desc',
            },
        }),
    ]);

    // Get user details for top users
    const topUserIds = topUsers.map((u) => u.user_id);
    const userDetails = await prisma.user.findMany({
        where: {
            id: {
                in: topUserIds,
            },
        },
        select: {
            id: true,
            full_name: true,
            student_id: true,
        },
    });

    // Merge user details with points
    const topUsersWithDetails = topUsers.map((u) => {
        const user = userDetails.find((ud) => ud.id === u.user_id);
        return {
            user,
            total_points: u._sum.points || 0,
        };
    });

    return {
        total_points_awarded: totalPoints._sum.points || 0,
        total_users_with_points: totalUsers.length,
        top_users: topUsersWithDetails,
        semester_statistics: semesterStats.map((s) => ({
            semester: s.semester,
            total_points: s._sum.points || 0,
            events_count: s._count.id,
        })),
    };
};

export const getCurrentSemester = (): string => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

    // Semester 1: September - January
    if (month >= 9 || month <= 1) {
        const academicYear = month >= 9 ? year : year - 1;
        return `${academicYear}-${academicYear + 1}-1`;
    }
    // Semester 2: February - June
    else if (month >= 2 && month <= 6) {
        return `${year - 1}-${year}-2`;
    }
    // Summer: July - August
    else {
        return `${year - 1}-${year}-summer`;
    }
};

export const awardTrainingPoints = async (
    payload: AwardPointsInput,
    requester: RequesterContext
) => {
    const { userId, eventId, points, semester } = payload;

    const [student, event] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                full_name: true,
                student_id: true,
                email: true,
                role: true,
            },
        }),
        prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                title: true,
                organizer_id: true,
                training_points: true,
                deleted_at: true,
            },
        }),
    ]);

    if (!student || student.role !== 'student') {
        throw new NotFoundError('User');
    }

    if (!event || event.deleted_at) {
        throw new NotFoundError('Event');
    }

    if (requester.role === 'organizer' && event.organizer_id !== requester.id) {
        throw new ForbiddenError('Bạn không có quyền cộng điểm cho sự kiện này');
    }

    const attendance = await prisma.attendance.findFirst({
        where: {
            registration: {
                user_id: userId,
                event_id: eventId,
            },
        },
        select: { id: true },
    });

    if (!attendance) {
        throw new ValidationError('Sinh viên chưa check-in sự kiện này');
    }

    const awardedPoints = points ?? event.training_points;
    if (!Number.isInteger(awardedPoints) || awardedPoints <= 0) {
        throw new ValidationError('points phải là số nguyên dương');
    }

    const awardedSemester = semester?.trim() || getCurrentSemester();

    const created = await prisma.trainingPoint.upsert({
        where: {
            user_id_event_id: {
                user_id: userId,
                event_id: eventId,
            },
        },
        create: {
            user_id: userId,
            event_id: eventId,
            points: awardedPoints,
            semester: awardedSemester,
            earned_at: new Date(),
        },
        update: {
            points: awardedPoints,
            semester: awardedSemester,
        },
        include: {
            user: {
                select: {
                    id: true,
                    full_name: true,
                    student_id: true,
                },
            },
            event: {
                select: {
                    id: true,
                    title: true,
                },
            },
        },
    });

    try {
        await notifyPointsAwarded(userId, eventId, event.title, awardedPoints);
    } catch (error) {
        console.error('Failed to notify points awarded:', error);
    }

    return created;
};

export const exportTrainingPoints = async (
    filters: ExportTrainingPointsFilters,
    requester: RequesterContext
) => {
    const where: {
        semester?: string;
        event_id?: number;
        user_id?: number;
        event?: {
            organizer_id: number;
        };
    } = {};

    if (filters.semester) {
        where.semester = filters.semester;
    }

    if (filters.eventId) {
        where.event_id = filters.eventId;
    }

    if (filters.userId) {
        where.user_id = filters.userId;
    }

    if (requester.role === 'organizer') {
        where.event = { organizer_id: requester.id };
    }

    const records = await prisma.trainingPoint.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    full_name: true,
                    student_id: true,
                    email: true,
                },
            },
            event: {
                select: {
                    id: true,
                    title: true,
                    organizer_id: true,
                },
            },
        },
        orderBy: {
            earned_at: 'desc',
        },
    });

    const totalPoints = records.reduce((sum, item) => sum + item.points, 0);

    return {
        total_records: records.length,
        total_points: totalPoints,
        filters: {
            semester: filters.semester,
            event_id: filters.eventId,
            user_id: filters.userId,
            scope: requester.role,
        },
        records: records.map((item) => ({
            id: item.id,
            user_id: item.user_id,
            student_id: item.user.student_id,
            full_name: item.user.full_name,
            email: item.user.email,
            event_id: item.event_id,
            event_title: item.event.title,
            points: item.points,
            semester: item.semester,
            earned_at: item.earned_at,
        })),
    };
};
