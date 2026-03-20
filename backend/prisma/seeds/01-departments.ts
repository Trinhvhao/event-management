import { PrismaClient } from '@prisma/client';

export async function seedDepartments(prisma: PrismaClient) {
    console.log('📚 Seeding departments...');

    const departments = await Promise.all([
        prisma.department.upsert({
            where: { code: 'CNTT' },
            update: {},
            create: {
                name: 'Khoa Công Nghệ Thông Tin',
                code: 'CNTT',
                description: 'Khoa đào tạo các chuyên ngành về công nghệ thông tin, phần mềm, mạng máy tính',
            },
        }),
        prisma.department.upsert({
            where: { code: 'KTDN' },
            update: {},
            create: {
                name: 'Khoa Kinh Tế Doanh Nghiệp',
                code: 'KTDN',
                description: 'Khoa đào tạo về quản trị kinh doanh, marketing, tài chính ngân hàng',
            },
        }),
        prisma.department.upsert({
            where: { code: 'NN' },
            update: {},
            create: {
                name: 'Khoa Ngoại Ngữ',
                code: 'NN',
                description: 'Khoa đào tạo tiếng Anh, tiếng Nhật, tiếng Trung',
            },
        }),
        prisma.department.upsert({
            where: { code: 'KHTN' },
            update: {},
            create: {
                name: 'Khoa Khoa Học Tự Nhiên',
                code: 'KHTN',
                description: 'Khoa đào tạo toán học, vật lý, hóa học, sinh học',
            },
        }),
        prisma.department.upsert({
            where: { code: 'XH' },
            update: {},
            create: {
                name: 'Khoa Khoa Học Xã Hội',
                code: 'XH',
                description: 'Khoa đào tạo xã hội học, tâm lý học, công tác xã hội',
            },
        }),
    ]);

    console.log(`✅ Created ${departments.length} departments`);
    return departments;
}
