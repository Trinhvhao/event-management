'use strict';
import prisma from '../config/database';
import { getCurrentSemester } from './training-points.service';

// ─── Badge Definitions ──────────────────────────────────────────────────────

type BadgeDefinition = {
    code: string;
    name: string;
    description: string;
    type: 'streak' | 'milestone' | 'achievement' | 'rank';
    icon: string;
    color: string;
    threshold?: number;
};

const BADGE_DEFINITIONS: BadgeDefinition[] = [
    // Streak badges — consecutive events in same semester
    { code: 'streak_3',    name: 'Khởi đầu',        description: 'Tham gia 3 sự kiện liên tiếp',           type: 'streak',      icon: 'Flame',          color: '#F26600', threshold: 3  },
    { code: 'streak_5',    name: 'Nhiệt huyết',     description: 'Tham gia 5 sự kiện liên tiếp',           type: 'streak',      icon: 'Zap',            color: '#FF6B00', threshold: 5  },
    { code: 'streak_10',   name: 'Bền bỉ',          description: 'Tham gia 10 sự kiện liên tiếp',          type: 'streak',      icon: 'Award',          color: '#dc2626', threshold: 10 },
    // Milestone badges — total events attended
    { code: 'milestone_1',  name: 'Sự kiện đầu tiên', description: 'Tham gia sự kiện đầu tiên',            type: 'milestone',   icon: 'Star',           color: '#00358F', threshold: 1  },
    { code: 'milestone_3',  name: 'Người yêu sự kiện', description: 'Tham gia 3 sự kiện',                  type: 'milestone',   icon: 'Heart',          color: '#e11d48', threshold: 3  },
    { code: 'milestone_5',  name: 'Tín đồ sự kiện',  description: 'Tham gia 5 sự kiện',                    type: 'milestone',   icon: 'Coffee',         color: '#7c3aed', threshold: 5  },
    { code: 'milestone_10', name: 'Ngôi sao sáng',    description: 'Tham gia 10 sự kiện',                   type: 'milestone',   icon: 'Sparkles',       color: '#f59e0b', threshold: 10 },
    { code: 'milestone_20', name: 'Huyền thoại',      description: 'Tham gia 20 sự kiện',                    type: 'milestone',   icon: 'Crown',          color: '#d97706', threshold: 20 },
    { code: 'milestone_50', name: 'Bậc thầy',         description: 'Tham gia 50 sự kiện',                    type: 'milestone',   icon: 'Trophy',         color: '#b45309', threshold: 50 },
    // Achievement badges — special achievements
    { code: 'early_bird',   name: 'Điểm danh sớm',    description: 'Check-in trước khi sự kiện bắt đầu 15 phút', type: 'achievement', icon: 'Sunrise',        color: '#F26600' },
    { code: 'weekend_warrior', name: 'Chiến binh cuối tuần', description: 'Tham gia sự kiện vào cuối tuần', type: 'achievement', icon: 'Calendar',       color: '#8b5cf6' },
    { code: 'first_100',    name: 'Người đầu tiên',   description: 'Đăng ký đầu tiên trong sự kiện',       type: 'achievement', icon: 'Rocket',         color: '#00A651' },
    { code: 'feedback_giver', name: 'Góp ý xây dựng', description: 'Gửi 5 đánh giá sự kiện',                type: 'achievement', icon: 'MessageSquare',  color: '#00358F' },
    // Rank badges — awarded by system
    { code: 'top_1',  name: 'Vua điểm rèn luyện', description: 'Đạt điểm rèn luyện cao nhất học kỳ',  type: 'rank', icon: 'Crown',   color: '#f59e0b', threshold: 1  },
    { code: 'top_5',  name: 'Top 5 xuất sắc',       description: 'Trong top 5 điểm rèn luyện học kỳ',     type: 'rank', icon: 'Medal',   color: '#94a3b8', threshold: 5  },
    { code: 'top_10', name: 'Top 10 nổi bật',        description: 'Trong top 10 điểm rèn luyện học kỳ',    type: 'rank', icon: 'Star',    color: '#cd7f32', threshold: 10 },
    { code: 'department_leader', name: 'Trưởng khoa', description: 'Đạt điểm cao nhất trong khoa',         type: 'rank', icon: 'Building2', color: '#00358F' },
];

// ─── Seed Default Badges ────────────────────────────────────────────────────

export const seedDefaultBadges = async () => {
    for (const def of BADGE_DEFINITIONS) {
        await prisma.badge.upsert({
            where: { code: def.code },
            update: {
                name: def.name,
                description: def.description,
                type: def.type,
                icon: def.icon,
                color: def.color,
                threshold: def.threshold,
            },
            create: {
                code: def.code,
                name: def.name,
                description: def.description,
                type: def.type,
                icon: def.icon,
                color: def.color,
                threshold: def.threshold,
            },
        });
    }
};

// ─── Evaluate & Award Badges for a User ─────────────────────────────────────

export const evaluateAndAwardBadges = async (userId: number): Promise<string[]> => {
    const awardedCodes: string[] = [];

    // Get all badge definitions
    const allBadges = await prisma.badge.findMany();
    const badgeMap = new Map(allBadges.map(b => [b.code, b]));

    // Get existing user badges
    const existing = await prisma.userBadge.findMany({
        where: { user_id: userId },
        include: { badge: true },
    });
    const existingCodes = new Set(existing.map(ub => ub.badge.code));

    // ── 1. Milestone badges ─────────────────────────────────────────────────
    const totalEvents = await prisma.attendance.count({ where: { registration: { user_id: userId } } });

    for (const badge of allBadges.filter(b => b.type === 'milestone')) {
        if (existingCodes.has(badge.code)) continue;
        if (badge.threshold && totalEvents >= badge.threshold) {
            await prisma.userBadge.create({ data: { user_id: userId, badge_id: badge.id } });
            awardedCodes.push(badge.code);
        }
    }

    // ── 2. Streak badges ───────────────────────────────────────────────────
    // Count consecutive events attended
    const userAttendances = await prisma.attendance.findMany({
        where: {
            registration: { user_id: userId },
            status: 'checked_in',
        },
        orderBy: { checked_in_at: 'asc' },
    });

    const streakBadges = allBadges.filter(b => b.type === 'streak' && !existingCodes.has(b.code));
    for (const badge of streakBadges) {
        if (badge.threshold && userAttendances.length >= badge.threshold) {
            await prisma.userBadge.create({
                data: { user_id: userId, badge_id: badge.id },
            });
            awardedCodes.push(badge.code);
        }
    }

    // ── 3. Achievement badges ──────────────────────────────────────────────
    const achievementCodes = ['early_bird', 'weekend_warrior', 'first_100', 'feedback_giver'];
    for (const code of achievementCodes) {
        if (existingCodes.has(code)) continue;
        const badge = badgeMap.get(code);
        if (!badge) continue;

        // early_bird: award on first attendance (simplified)
        if (code === 'early_bird') {
            if (totalEvents >= 1) {
                await prisma.userBadge.create({ data: { user_id: userId, badge_id: badge.id } });
                awardedCodes.push(code);
            }
        }

        // feedback_giver: 5+ feedbacks
        if (code === 'feedback_giver') {
            const feedbackCount = await prisma.feedback.count({ where: { user_id: userId } });
            if (feedbackCount >= 5) {
                await prisma.userBadge.create({ data: { user_id: userId, badge_id: badge.id } });
                awardedCodes.push(code);
            }
        }
    }

    return awardedCodes;
};

// ─── Award Rank Badges (called periodically or on scoreboard update) ────────

export const awardRankBadges = async (_semester?: string) => {
    // Get top users by training points for the semester
    const topUsers = await prisma.trainingPoint.groupBy({
        by: ['user_id'],
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
        take: 10,
    });

    // Award rank badges
    const rankBadges = ['top_1', 'top_5', 'top_10'];
    const rankThresholds = [1, 5, 10];

    for (let rank = 0; rank < rankBadges.length; rank++) {
        const badge = await prisma.badge.findUnique({ where: { code: rankBadges[rank] } });
        if (!badge) continue;

        for (let i = 0; i < rankThresholds[rank]; i++) {
            const userId = topUsers[i]?.user_id;
            if (!userId) break;

            // Check if already has this rank badge
            const existing = await prisma.userBadge.findUnique({
                where: { user_id_badge_id: { user_id: userId, badge_id: badge.id } },
            });
            if (existing) continue;

            // Verify user is in the right rank
            const userRank = topUsers.findIndex(u => u.user_id === userId);
            if (userRank === -1 || userRank >= rankThresholds[rank]) continue;

            await prisma.userBadge.create({ data: { user_id: userId, badge_id: badge.id } });
        }
    }
};

// ─── Department Leaderboard ─────────────────────────────────────────────────

type DepartmentLeaderboardEntry = {
    department_id: number;
    department_name: string;
    department_code: string;
    total_points: number;
    total_events: number;
    unique_participants: number;
    avg_points: number;
    rank: number;
};

export const getDepartmentLeaderboard = async (semester?: string): Promise<DepartmentLeaderboardEntry[]> => {
    const sem = semester || getCurrentSemester();

    const stats = await prisma.trainingPoint.groupBy({
        by: ['user_id'],
        _sum: { points: true },
        where: { semester: sem },
    });

    // Get user department info
    const userIds = stats.map(s => s.user_id);
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, department_id: true, department: { select: { id: true, name: true, code: true } } },
    });

    // Build department aggregates
    const deptMap = new Map<number, {
        department_id: number;
        department_name: string;
        department_code: string;
        total_points: number;
        total_events: number;
        user_ids: Set<number>;
    }>();

    for (const stat of stats) {
        const user = users.find(u => u.id === stat.user_id);
        if (!user?.department) continue;
        const deptId = user.department.id;

        if (!deptMap.has(deptId)) {
            deptMap.set(deptId, {
                department_id: deptId,
                department_name: user.department.name,
                department_code: user.department.code,
                total_points: 0,
                total_events: 0,
                user_ids: new Set(),
            });
        }
        const dept = deptMap.get(deptId)!;
        dept.total_points += stat._sum.points || 0;
        dept.total_events += 1;
        dept.user_ids.add(user.id);
    }

    const deptStats = Array.from(deptMap.values())
        .map(d => ({
            department_id: d.department_id,
            department_name: d.department_name,
            department_code: d.department_code,
            total_points: d.total_points,
            total_events: d.total_events,
            unique_participants: d.user_ids.size,
            avg_points: d.user_ids.size > 0 ? Math.round(d.total_points / d.user_ids.size) : 0,
            rank: 0,
        }))
        .sort((a, b) => b.total_points - a.total_points);

    // Assign ranks
    deptStats.forEach((d, i) => { d.rank = i + 1; });

    return deptStats;
};

// ─── Global / Semester Leaderboard ─────────────────────────────────────────

type LeaderboardEntry = {
    rank: number;
    user_id: number;
    full_name: string;
    student_id: string | null;
    department_name: string | null;
    total_points: number;
    total_events: number;
    badges_count: number;
    avatar_color: string;
};

export const getLeaderboard = async (
    limit: number = 20,
    semester?: string,
    departmentId?: number
): Promise<LeaderboardEntry[]> => {
    const sem = semester || getCurrentSemester();

    const whereClause: any = { semester: sem };
    if (departmentId) {
        whereClause.user = { department_id: departmentId };
    }

    const stats = await prisma.trainingPoint.groupBy({
        by: ['user_id'],
        _sum: { points: true },
        _count: { id: true },
        where: whereClause,
        orderBy: { _sum: { points: 'desc' } },
        take: limit,
    });

    const userIds = stats.map(s => s.user_id);
    const [users, userBadges] = await Promise.all([
        prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                full_name: true,
                student_id: true,
                department: { select: { name: true } },
            },
        }),
        prisma.userBadge.findMany({
            where: { user_id: { in: userIds } },
            select: { user_id: true, badge_id: true },
        }),
    ]);

    const badgeCountMap = new Map<number, number>();
    for (const ub of userBadges) {
        badgeCountMap.set(ub.user_id, (badgeCountMap.get(ub.user_id) || 0) + 1);
    }

    // Generate deterministic avatar colors based on user id
    const AVATAR_COLORS = ['#00358F', '#F26600', '#00A651', '#8b5cf6', '#dc2626', '#7c3aed', '#d97706', '#e11d48'];
    const getAvatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

    return stats.map((stat, i) => {
        const user = users.find(u => u.id === stat.user_id);
        return {
            rank: i + 1,
            user_id: stat.user_id,
            full_name: user?.full_name || 'Unknown',
            student_id: user?.student_id || null,
            department_name: user?.department?.name || null,
            total_points: stat._sum.points || 0,
            total_events: stat._count.id,
            badges_count: badgeCountMap.get(stat.user_id) || 0,
            avatar_color: getAvatarColor(stat.user_id),
        };
    });
};

// ─── Get User's Badges ──────────────────────────────────────────────────────

export const getUserBadges = async (userId: number) => {
    const badges = await prisma.userBadge.findMany({
        where: { user_id: userId },
        include: {
            badge: true,
        },
        orderBy: { awarded_at: 'desc' },
    });
    return badges.map(ub => ({
        id: ub.id,
        code: ub.badge.code,
        name: ub.badge.name,
        description: ub.badge.description,
        type: ub.badge.type,
        icon: ub.badge.icon,
        color: ub.badge.color,
        threshold: ub.badge.threshold,
        awarded_at: ub.awarded_at,
    }));
};

// ─── Trigger Badge Evaluation on Attendance ─────────────────────────────────

export const onAttendanceCreated = async (userId: number) => {
    // Evaluate and award badges
    const awarded = await evaluateAndAwardBadges(userId);
    if (awarded.length > 0) {
        console.log(`[BadgeService] Awarded badges to user ${userId}:`, awarded);
    }
    return awarded;
};
