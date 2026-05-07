import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/event_management';

const pool = new Pool({ connectionString, ssl: false });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedTestEvents() {
    console.log('🧪 Seeding test events (low/no cost)...');

    const now = new Date();

    // Get existing categories and departments
    const categories = await prisma.category.findMany();
    const departments = await prisma.department.findMany();
    const organizers = await prisma.user.findMany({ where: { role: 'organizer' } });

    if (categories.length === 0 || departments.length === 0) {
        console.error('❌ No categories or departments found. Run main seed first.');
        return;
    }

    if (organizers.length === 0) {
        console.error('❌ No organizers found. Run main seed first.');
        return;
    }

    // Event 1: Free workshop (5000 VND - min for payment)
    const freeEvent1 = await prisma.event.create({
        data: {
            title: 'Workshop Miễn Phí: Git cơ bản',
            description: 'Học cách sử dụng Git để quản lý mã nguồn hiệu quả',
            start_time: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            end_time: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
            location: 'Phòng B101',
            category_id: categories[0].id,
            department_id: departments[0].id,
            organizer_id: organizers[0].id,
            capacity: 30,
            training_points: 2,
            event_cost: 5000,
            status: 'upcoming',
            registration_deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
            require_agreement: true,
            agreement_text: 'Tôi cam kết tham gia đầy đủ và đúng giờ',
        },
    });
    console.log(`✅ Created: ${freeEvent1.title} (${freeEvent1.event_cost} VND)`);

    // Event 2: Low cost seminar (10000 VND)
    const lowCostEvent = await prisma.event.create({
        data: {
            title: 'Seminar: AI trong Giáo dục',
            description: 'Khám phá ứng dụng của Trí tuệ Nhân tạo trong lĩnh vực giáo dục',
            start_time: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            end_time: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
            location: 'Hội trường chính',
            category_id: categories[1 % categories.length].id,
            department_id: departments[1 % departments.length].id,
            organizer_id: organizers[1 % organizers.length].id,
            capacity: 100,
            training_points: 3,
            event_cost: 10000,
            status: 'upcoming',
            registration_deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
            require_agreement: true,
            agreement_text: 'Tôi đồng ý với nội quy của sự kiện',
        },
    });
    console.log(`✅ Created: ${lowCostEvent.title} (${lowCostEvent.event_cost} VND)`);

    // Event 3: Medium cost workshop (25000 VND)
    const mediumCostEvent = await prisma.event.create({
        data: {
            title: 'Workshop: Figma cho người mới bắt đầu',
            description: 'Thiết kế UI/UX cơ bản với Figma - công cụ thiết kế phổ biến nhất',
            start_time: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
            end_time: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
            location: 'Phòng Lab C202',
            category_id: categories[2 % categories.length].id,
            department_id: departments[0].id,
            organizer_id: organizers[0].id,
            capacity: 25,
            training_points: 4,
            event_cost: 25000,
            status: 'upcoming',
            registration_deadline: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
            require_agreement: false,
        },
    });
    console.log(`✅ Created: ${mediumCostEvent.title} (${mediumCostEvent.event_cost} VND)`);

    // Event 4: Another low cost event (10000 VND)
    const lowCostEvent2 = await prisma.event.create({
        data: {
            title: 'Tech Talk: Xu hướng Web 2026',
            description: 'Cập nhật những công nghệ web mới nhất và xu hướng phát triển',
            start_time: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
            end_time: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
            location: 'Phòng A201',
            category_id: categories[0].id,
            department_id: departments[1].id,
            organizer_id: organizers[1 % organizers.length].id,
            capacity: 50,
            training_points: 1,
            event_cost: 10000,
            status: 'upcoming',
            registration_deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            require_agreement: true,
            agreement_text: 'Cam kết tham gia nghiêm túc',
        },
    });
    console.log(`✅ Created: ${lowCostEvent2.title} (${lowCostEvent2.event_cost} VND)`);

    console.log('\n🎉 Test events seeded successfully!');
    console.log('\nEvents for testing:');
    console.log(`1. ${freeEvent1.title} - ${freeEvent1.event_cost} VND (ID: ${freeEvent1.id})`);
    console.log(`2. ${lowCostEvent.title} - ${lowCostEvent.event_cost} VND (ID: ${lowCostEvent.id})`);
    console.log(`3. ${mediumCostEvent.title} - ${mediumCostEvent.event_cost} VND (ID: ${mediumCostEvent.id})`);
    console.log(`4. ${lowCostEvent2.title} - ${lowCostEvent2.event_cost} VND (ID: ${lowCostEvent2.id})`);
}

seedTestEvents()
    .catch((e) => {
        console.error('❌ Error seeding test events:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
