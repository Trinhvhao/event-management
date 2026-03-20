import { PrismaClient, Department } from '@prisma/client';
import bcrypt from 'bcrypt';

export async function seedUsers(prisma: PrismaClient, departments: Department[]) {
    console.log('👥 Seeding users...');

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const organizerPassword = await bcrypt.hash('organizer123', 10);
    const studentPassword = await bcrypt.hash('student123', 10);

    // Admin
    await prisma.user.upsert({
        where: { email: 'admin@dnu.edu.vn' },
        update: {},
        create: {
            email: 'admin@dnu.edu.vn',
            password_hash: hashedPassword,
            full_name: 'Quản Trị Viên',
            role: 'admin',
            is_active: true,
            email_verified: true,
        },
    });

    // Organizers
    const organizers = await Promise.all([
        prisma.user.upsert({
            where: { email: 'organizer.cntt@dnu.edu.vn' },
            update: {},
            create: {
                email: 'organizer.cntt@dnu.edu.vn',
                password_hash: organizerPassword,
                full_name: 'Nguyễn Văn Tổ Chức',
                role: 'organizer',
                department_id: departments[0].id,
                is_active: true,
                email_verified: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'organizer.ktdn@dnu.edu.vn' },
            update: {},
            create: {
                email: 'organizer.ktdn@dnu.edu.vn',
                password_hash: organizerPassword,
                full_name: 'Trần Thị Kinh Doanh',
                role: 'organizer',
                department_id: departments[1].id,
                is_active: true,
                email_verified: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'organizer.nn@dnu.edu.vn' },
            update: {},
            create: {
                email: 'organizer.nn@dnu.edu.vn',
                password_hash: organizerPassword,
                full_name: 'Lê Văn Ngoại Ngữ',
                role: 'organizer',
                department_id: departments[2].id,
                is_active: true,
                email_verified: true,
            },
        }),
    ]);

    // Students
    const students = await Promise.all([
        prisma.user.upsert({
            where: { email: 'student1@dnu.edu.vn' },
            update: {},
            create: {
                email: 'student1@dnu.edu.vn',
                password_hash: studentPassword,
                full_name: 'Nguyễn Văn An',
                student_id: '2071020001',
                role: 'student',
                department_id: departments[0].id,
                is_active: true,
                email_verified: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'student2@dnu.edu.vn' },
            update: {},
            create: {
                email: 'student2@dnu.edu.vn',
                password_hash: studentPassword,
                full_name: 'Trần Thị Bình',
                student_id: '2071020002',
                role: 'student',
                department_id: departments[0].id,
                is_active: true,
                email_verified: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'student3@dnu.edu.vn' },
            update: {},
            create: {
                email: 'student3@dnu.edu.vn',
                password_hash: studentPassword,
                full_name: 'Lê Văn Cường',
                student_id: '2071020003',
                role: 'student',
                department_id: departments[1].id,
                is_active: true,
                email_verified: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'student4@dnu.edu.vn' },
            update: {},
            create: {
                email: 'student4@dnu.edu.vn',
                password_hash: studentPassword,
                full_name: 'Phạm Thị Dung',
                student_id: '2071020004',
                role: 'student',
                department_id: departments[1].id,
                is_active: true,
                email_verified: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'student5@dnu.edu.vn' },
            update: {},
            create: {
                email: 'student5@dnu.edu.vn',
                password_hash: studentPassword,
                full_name: 'Hoàng Văn Em',
                student_id: '2071020005',
                role: 'student',
                department_id: departments[2].id,
                is_active: true,
                email_verified: true,
            },
        }),
    ]);

    console.log(`✅ Created ${1 + organizers.length + students.length} users`);
    return { organizers, students };
}
