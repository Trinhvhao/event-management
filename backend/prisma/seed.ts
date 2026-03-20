import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Import seed modules
import { seedDepartments } from './seeds/01-departments';
import { seedCategories } from './seeds/02-categories';
import { seedUsers } from './seeds/03-users';
import { seedEvents } from './seeds/04-events';
import { seedRegistrationsAndAttendances } from './seeds/05-registrations-attendances';
import { seedTrainingPoints } from './seeds/06-training-points';
import { seedFeedback } from './seeds/07-feedback';
import { seedNotifications } from './seeds/08-notifications';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({
    connectionString,
    ssl: false,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
});

async function main() {
    console.log('🌱 Starting comprehensive database seeding...\n');

    // 1. Seed Departments
    const departments = await seedDepartments(prisma);

    // 2. Seed Categories
    const categories = await seedCategories(prisma);

    // 3. Seed Users
    const { organizers, students } = await seedUsers(prisma, departments);

    // 4. Seed Events
    const events = await seedEvents(prisma, categories, departments, organizers);

    // 5. Seed Registrations and Attendances
    const { registrations, attendances } = await seedRegistrationsAndAttendances(
        prisma,
        events,
        { organizers, students }
    );

    // 6. Seed Training Points
    const trainingPoints = await seedTrainingPoints(prisma, events, students, attendances);

    // 7. Seed Feedback
    await seedFeedback(prisma, events, students);

    // 8. Seed Notifications
    await seedNotifications(prisma, registrations, attendances, trainingPoints, events, students);

    // Summary
    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Departments: ${departments.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Users: ${1 + organizers.length + students.length} (1 admin, ${organizers.length} organizers, ${students.length} students)`);
    console.log(`   - Events: 7 (2 completed, 1 ongoing, 4 upcoming)`);
    console.log(`   - Registrations: ${registrations.length}`);
    console.log(`   - Attendances: ${attendances.length}`);
    console.log(`   - Training Points: ${trainingPoints.length}`);

    console.log('\n📝 Default accounts (Đại học Đại Nam):');
    console.log('   Admin:');
    console.log('     - Email: admin@dnu.edu.vn');
    console.log('     - Password: admin123');
    console.log('\n   Organizers:');
    console.log('     - Email: organizer.cntt@dnu.edu.vn / organizer123');
    console.log('     - Email: organizer.ktdn@dnu.edu.vn / organizer123');
    console.log('     - Email: organizer.nn@dnu.edu.vn / organizer123');
    console.log('\n   Students:');
    console.log('     - Email: student1@dnu.edu.vn / student123 (MSSV: 2071020001)');
    console.log('     - Email: student2@dnu.edu.vn / student123 (MSSV: 2071020002)');
    console.log('     - Email: student3@dnu.edu.vn / student123 (MSSV: 2071020003)');
    console.log('     - Email: student4@dnu.edu.vn / student123 (MSSV: 2071020004)');
    console.log('     - Email: student5@dnu.edu.vn / student123 (MSSV: 2071020005)');

    console.log('\n💡 Tips:');
    console.log('   - Use Prisma Studio to view data: npm run prisma:studio');
    console.log('   - Run tests: npm test');
    console.log('   - Start server: npm run dev');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
