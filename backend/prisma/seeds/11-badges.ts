// Badge seed function - import and call with your prisma instance
import { PrismaClient, BadgeType } from '@prisma/client';

type BadgeDef = {
    code: string;
    name: string;
    description: string;
    type: BadgeType;
    icon: string;
    color: string;
    threshold: number | null;
};

export async function seedBadgeDefinitions(prisma: PrismaClient) {
    const BADGE_DEFS: BadgeDef[] = [
        { code: 'streak_3',          name: 'Khởi đầu',              description: 'Tham gia 3 sự kiện liên tiếp',              type: 'streak',      icon: 'Flame',          color: '#F26600', threshold: 3  },
        { code: 'streak_5',          name: 'Nhiệt huyết',           description: 'Tham gia 5 sự kiện liên tiếp',              type: 'streak',      icon: 'Zap',            color: '#FF6B00', threshold: 5  },
        { code: 'streak_10',         name: 'Bền bỉ',              description: 'Tham gia 10 sự kiện liên tiếp',             type: 'streak',      icon: 'Award',          color: '#dc2626', threshold: 10 },
        { code: 'milestone_1',       name: 'Sự kiện đầu tiên',      description: 'Tham gia sự kiện đầu tiên',              type: 'milestone',   icon: 'Star',           color: '#00358F', threshold: 1  },
        { code: 'milestone_3',       name: 'Người yêu sự kiện',   description: 'Tham gia 3 sự kiện',                    type: 'milestone',   icon: 'Heart',          color: '#e11d48', threshold: 3  },
        { code: 'milestone_5',       name: 'Tín đồ sự kiện',      description: 'Tham gia 5 sự kiện',                    type: 'milestone',   icon: 'Coffee',         color: '#7c3aed', threshold: 5  },
        { code: 'milestone_10',      name: 'Ngôi sao sáng',        description: 'Tham gia 10 sự kiện',                   type: 'milestone',   icon: 'Sparkles',       color: '#f59e0b', threshold: 10 },
        { code: 'milestone_20',      name: 'Huyền thoại',          description: 'Tham gia 20 sự kiện',                   type: 'milestone',   icon: 'Crown',          color: '#d97706', threshold: 20 },
        { code: 'milestone_50',      name: 'Bậc thầy',             description: 'Tham gia 50 sự kiện',                   type: 'milestone',   icon: 'Trophy',         color: '#b45309', threshold: 50 },
        { code: 'early_bird',        name: 'Điểm danh sớm',        description: 'Check-in trước khi sự kiện bắt đầu',    type: 'achievement', icon: 'Sunrise',        color: '#F26600', threshold: null },
        { code: 'weekend_warrior',  name: 'Chiến binh cuối tuần', description: 'Tham gia sự kiện vào cuối tuần',      type: 'achievement', icon: 'Calendar',       color: '#8b5cf6', threshold: null },
        { code: 'first_100',         name: 'Người đầu tiên',       description: 'Đăng ký đầu tiên trong sự kiện',      type: 'achievement', icon: 'Rocket',         color: '#00A651', threshold: null },
        { code: 'feedback_giver',    name: 'Góp ý xây dựng',       description: 'Gửi 5 đánh giá sự kiện',               type: 'achievement', icon: 'MessageSquare',  color: '#00358F', threshold: null },
        { code: 'top_1',             name: 'Vua điểm rèn luyện',  description: 'Đạt điểm rèn luyện cao nhất học kỳ',  type: 'rank', icon: 'Crown',   color: '#f59e0b', threshold: 1  },
        { code: 'top_5',             name: 'Top 5 xuất sắc',       description: 'Trong top 5 điểm rèn luyện học kỳ',   type: 'rank', icon: 'Medal',   color: '#94a3b8', threshold: 5  },
        { code: 'top_10',            name: 'Top 10 nổi bật',       description: 'Trong top 10 điểm rèn luyện học kỳ',  type: 'rank', icon: 'Star',    color: '#cd7f32', threshold: 10 },
        { code: 'department_leader', name: 'Trưởng khoa',          description: 'Đạt điểm cao nhất trong khoa',        type: 'rank', icon: 'Building2', color: '#00358F', threshold: null },
    ];

    for (const def of BADGE_DEFS) {
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
    console.log(`  ✓ Seeded ${BADGE_DEFS.length} badge definitions`);
}

