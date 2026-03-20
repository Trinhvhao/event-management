import prisma from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';

export const statisticsService = {
    /**
     * Lấy thống kê tổng quan cho dashboard (dành cho admin)
     * 
     * Bao gồm:
     * - Tổng sự kiện, users, đăng ký, điểm danh
     * - Phân loại sự kiện theo trạng thái (upcoming, ongoing, completed)
     * - Phân loại users theo vai trò (student, organizer, admin)
     * - Tỷ lệ check-in trung bình
     */
    async getDashboardStats() {
        // Đếm tổng các bản ghi chính
        const [totalEvents, totalUsers, totalRegistrations, totalAttendances] = await Promise.all([
            prisma.event.count({ where: { deleted_at: null } }),
            prisma.user.count(),
            prisma.registration.count({ where: { status: 'registered' } }),
            prisma.attendance.count(),
        ]);

        // Sự kiện theo trạng thái (GROUP BY status)
        const eventsByStatus = await prisma.event.groupBy({
            by: ['status'],
            where: { deleted_at: null },
            _count: true,
        });

        // Users theo vai trò (GROUP BY role)
        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            _count: true,
        });

        // Tính tỷ lệ check-in = tổng điểm danh / tổng đăng ký
        const checkInRate = totalRegistrations > 0
            ? Math.round((totalAttendances / totalRegistrations) * 100)
            : 0;

        return {
            totalEvents,
            totalUsers,
            totalRegistrations,
            totalAttendances,
            eventsByStatus: eventsByStatus.map(e => ({ status: e.status, count: e._count })),
            usersByRole: usersByRole.map(u => ({ role: u.role, count: u._count })),
            checkInRate,
        };
    },

    /**
     * Lấy thống kê chi tiết cho 1 sự kiện
     * Gồm: số đăng ký, điểm danh, tỷ lệ check-in, đánh giá trung bình
     */
    async getEventStats(eventId: number) {
        // Kiểm tra event tồn tại
        const event = await prisma.event.findUnique({ where: { id: eventId, deleted_at: null } });
        if (!event) {
            throw new NotFoundError('Sự kiện không tồn tại');
        }

        const [registrations, attendances, feedbacks] = await Promise.all([
            prisma.registration.count({ where: { event_id: eventId, status: 'registered' } }),
            prisma.attendance.count({ where: { registration: { event_id: eventId } } }),
            prisma.feedback.findMany({ where: { event_id: eventId }, select: { rating: true } }),
        ]);

        // Tính điểm đánh giá trung bình
        const avgRating = feedbacks.length > 0
            ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
            : 0;

        return {
            registrations,
            attendances,
            checkInRate: registrations > 0 ? Math.round((attendances / registrations) * 100) : 0,
            avgRating: Math.round(avgRating * 10) / 10,
            feedbackCount: feedbacks.length,
        };
    },

    /**
     * Thống kê tổng hợp cho organizer (tất cả sự kiện của mình)
     * Gồm: tổng events, registrations, attendances, avg rating, top events
     */
    async getOrganizerStats(organizerId: number) {
        // Lấy tất cả events của organizer
        const events = await prisma.event.findMany({
            where: { organizer_id: organizerId, deleted_at: null },
            select: {
                id: true, title: true, status: true, start_time: true,
                _count: { select: { registrations: true, feedback: true } },
            },
            orderBy: { start_time: 'desc' },
        });

        // Tổng registrations + attendances
        const eventIds = events.map(e => e.id);
        const [totalRegistrations, totalAttendances, feedbacks] = await Promise.all([
            prisma.registration.count({ where: { event_id: { in: eventIds }, status: 'registered' } }),
            prisma.attendance.count({ where: { registration: { event_id: { in: eventIds } } } }),
            prisma.feedback.findMany({ where: { event_id: { in: eventIds } }, select: { rating: true } }),
        ]);

        const avgRating = feedbacks.length > 0
            ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
            : 0;

        // Top 5 events theo số đăng ký
        const topEvents = [...events]
            .sort((a, b) => b._count.registrations - a._count.registrations)
            .slice(0, 5)
            .map(e => ({ id: e.id, title: e.title, registrations: e._count.registrations }));

        return {
            totalEvents: events.length,
            totalRegistrations,
            totalAttendances,
            checkInRate: totalRegistrations > 0 ? Math.round((totalAttendances / totalRegistrations) * 100) : 0,
            avgRating: Math.round(avgRating * 10) / 10,
            feedbackCount: feedbacks.length,
            topEvents,
            eventsByStatus: {
                upcoming: events.filter(e => e.status === 'upcoming').length,
                ongoing: events.filter(e => e.status === 'ongoing').length,
                completed: events.filter(e => e.status === 'completed').length,
                cancelled: events.filter(e => e.status === 'cancelled').length,
            },
        };
    },

    /**
     * Thống kê sinh viên - Top sinh viên tích cực nhất
     * Dựa trên số sự kiện tham gia và điểm rèn luyện
     */
    async getStudentStats() {
        // Top 10 sinh viên theo số sự kiện tham gia
        const topStudentsByEvents = await prisma.user.findMany({
            where: { role: 'student' },
            select: {
                id: true,
                full_name: true,
                student_id: true,
                _count: { select: { registrations: true } },
            },
            orderBy: { registrations: { _count: 'desc' } },
            take: 10,
        });

        // Top 10 sinh viên theo điểm rèn luyện
        const topStudentsByPoints = await prisma.trainingPoint.groupBy({
            by: ['user_id'],
            _sum: { points: true },
            orderBy: { _sum: { points: 'desc' } },
            take: 10,
        });

        // Lấy thông tin chi tiết của top students by points
        const userIds = topStudentsByPoints.map(s => s.user_id);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, full_name: true, student_id: true },
        });

        const topByPoints = topStudentsByPoints.map(s => {
            const user = users.find(u => u.id === s.user_id);
            return {
                id: s.user_id,
                full_name: user?.full_name || 'Unknown',
                student_id: user?.student_id || 'N/A',
                totalPoints: s._sum.points || 0,
            };
        });

        return {
            topByEvents: topStudentsByEvents.map(s => ({
                id: s.id,
                full_name: s.full_name,
                student_id: s.student_id,
                eventsCount: s._count.registrations,
            })),
            topByPoints,
        };
    },

    /**
     * Thống kê theo khoa/phòng ban
     * Số sự kiện, sinh viên, tỷ lệ tham gia
     */
    async getDepartmentStats() {
        const departments = await prisma.department.findMany({
            select: {
                id: true,
                name: true,
                code: true,
                _count: {
                    select: {
                        events: true,
                        users: true,
                    },
                },
            },
        });

        // Lấy số registrations cho mỗi department
        const stats = await Promise.all(
            departments.map(async (dept) => {
                const eventIds = await prisma.event.findMany({
                    where: { department_id: dept.id, deleted_at: null },
                    select: { id: true },
                });

                const ids = eventIds.map(e => e.id);
                const registrations = await prisma.registration.count({
                    where: { event_id: { in: ids }, status: 'registered' },
                });

                return {
                    id: dept.id,
                    name: dept.name,
                    code: dept.code,
                    eventsCount: dept._count.events,
                    studentsCount: dept._count.users,
                    registrationsCount: registrations,
                };
            })
        );

        return stats.sort((a, b) => b.eventsCount - a.eventsCount);
    },
};
