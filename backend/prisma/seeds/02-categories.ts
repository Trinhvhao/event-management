import { PrismaClient } from '@prisma/client';

export async function seedCategories(prisma: PrismaClient) {
    console.log('🏷️  Seeding categories...');

    const categories = await Promise.all([
        prisma.category.upsert({
            where: { name: 'Học thuật' },
            update: {},
            create: {
                name: 'Học thuật',
                description: 'Hội thảo, seminar, workshop học thuật và nghiên cứu khoa học',
            },
        }),
        prisma.category.upsert({
            where: { name: 'Ngoại khóa' },
            update: {},
            create: {
                name: 'Ngoại khóa',
                description: 'Hoạt động ngoại khóa, câu lạc bộ, tình nguyện',
            },
        }),
        prisma.category.upsert({
            where: { name: 'Tuyển dụng' },
            update: {},
            create: {
                name: 'Tuyển dụng',
                description: 'Ngày hội việc làm, tuyển dụng doanh nghiệp, career fair',
            },
        }),
        prisma.category.upsert({
            where: { name: 'Văn hóa' },
            update: {},
            create: {
                name: 'Văn hóa',
                description: 'Sự kiện văn hóa, nghệ thuật, biểu diễn, triển lãm',
            },
        }),
        prisma.category.upsert({
            where: { name: 'Thể thao' },
            update: {},
            create: {
                name: 'Thể thao',
                description: 'Giải thể thao, hoạt động rèn luyện sức khỏe',
            },
        }),
        prisma.category.upsert({
            where: { name: 'Kỹ năng mềm' },
            update: {},
            create: {
                name: 'Kỹ năng mềm',
                description: 'Đào tạo kỹ năng mềm, leadership, teamwork',
            },
        }),
    ]);

    console.log(`✅ Created ${categories.length} categories`);
    return categories;
}
