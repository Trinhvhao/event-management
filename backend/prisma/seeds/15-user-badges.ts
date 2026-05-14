import { Badge, PrismaClient, User } from '@prisma/client';

interface BadgeSeedContext {
    students: User[];
    badges: Badge[];
    // We need attendance counts per user for milestone/streak badges
    // We'll compute from existing data
}

export async function seedUserBadges(
    prisma: PrismaClient,
    context: BadgeSeedContext
) {
    console.log('🏅 Seeding user badges...');

    const { students, badges } = context;

    // Group badges by type for easy lookup
    const badgesByCode = new Map(badges.map((b) => [b.code, b]));

    const userBadgePayloads: Array<{
        user_id: number;
        badge_id: number;
        awarded_at: Date;
    }> = [];

    // Get attendance counts per student (for milestone badges)
    const studentAttendanceCounts = new Map<number, number>();
    for (const student of students) {
        const count = await prisma.attendance.count({
            where: { registration: { user_id: student.id } },
        });
        studentAttendanceCounts.set(student.id, count);
    }

    // Award milestone badges based on attendance count
    for (const student of students) {
        const count = studentAttendanceCounts.get(student.id) ?? 0;

        // milestone_1: attended at least 1 event
        const badge1 = badgesByCode.get('milestone_1');
        if (badge1 && count >= 1) {
            userBadgePayloads.push({
                user_id: student.id,
                badge_id: badge1.id,
                awarded_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            });
        }

        // milestone_3: attended 3+ events
        const badge3 = badgesByCode.get('milestone_3');
        if (badge3 && count >= 3) {
            userBadgePayloads.push({
                user_id: student.id,
                badge_id: badge3.id,
                awarded_at: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
            });
        }

        // milestone_5: attended 5+ events
        const badge5 = badgesByCode.get('milestone_5');
        if (badge5 && count >= 5) {
            userBadgePayloads.push({
                user_id: student.id,
                badge_id: badge5.id,
                awarded_at: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
            });
        }

        // milestone_10: attended 10+ events
        const badge10 = badgesByCode.get('milestone_10');
        if (badge10 && count >= 10) {
            userBadgePayloads.push({
                user_id: student.id,
                badge_id: badge10.id,
                awarded_at: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
            });
        }

        // streak_3: 3 consecutive events (simplified: just those with 3+ events)
        const streak3 = badgesByCode.get('streak_3');
        if (streak3 && count >= 3) {
            userBadgePayloads.push({
                user_id: student.id,
                badge_id: streak3.id,
                awarded_at: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
            });
        }

        // streak_5: 5 consecutive events
        const streak5 = badgesByCode.get('streak_5');
        if (streak5 && count >= 5) {
            userBadgePayloads.push({
                user_id: student.id,
                badge_id: streak5.id,
                awarded_at: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
            });
        }
    }

    // Award achievement badges to some random students
    const achievementCodes = ['early_bird', 'weekend_warrior', 'feedback_giver'];
    const studentSample = students.slice(0, Math.min(students.length, 10));

    for (const student of studentSample) {
        for (const code of achievementCodes) {
            const badge = badgesByCode.get(code);
            if (!badge) continue;

            // Randomly award some achievement badges
            if (Math.random() > 0.4) {
                userBadgePayloads.push({
                    user_id: student.id,
                    badge_id: badge.id,
                    awarded_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                });
            }
        }
    }

    // Award rank badges to top students by training points
    const topStudents = await prisma.trainingPoint.groupBy({
        by: ['user_id'],
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
        take: 10,
    });

    const rankBadgeMap = [
        { threshold: 1, code: 'top_1' },
        { threshold: 5, code: 'top_5' },
        { threshold: 10, code: 'top_10' },
    ];

    for (const [rankIndex, tp] of topStudents.entries()) {
        for (const { threshold, code } of rankBadgeMap) {
            if (rankIndex < threshold) {
                const badge = badgesByCode.get(code);
                if (badge) {
                    userBadgePayloads.push({
                        user_id: tp.user_id,
                        badge_id: badge.id,
                        awarded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                    });
                }
            }
        }
    }

    // Insert with upsert to handle duplicates
    let created = 0;
    let skipped = 0;

    for (const payload of userBadgePayloads) {
        const existing = await prisma.userBadge.findUnique({
            where: {
                user_id_badge_id: {
                    user_id: payload.user_id,
                    badge_id: payload.badge_id,
                },
            },
        });

        if (existing) {
            skipped += 1;
            continue;
        }

        await prisma.userBadge.create({ data: payload });
        created += 1;
    }

    console.log(`  ✓ Seeded ${created} user badges (${skipped} skipped - already existed)`);
    return { created, skipped };
}
