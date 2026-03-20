import prisma from '../config/database';

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
        throw new Error('Người dùng không tồn tại');
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
