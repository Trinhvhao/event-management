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
import { seedDemoExpansion } from './seeds/09-demo-expansion';
import { seedEventTeamMembers } from './seeds/10-event-team';
import { seedBadgeDefinitions } from './seeds/11-badges';
import { seedEventTeamActivities } from './seeds/12-event-team-activities';
import { seedEventTeamPermissions } from './seeds/13-event-team-permissions';
import { seedTickets } from './seeds/14-tickets';
import { seedUserBadges } from './seeds/15-user-badges';
import { seedPayments, seedPaymentScenarios } from './seeds/16-payments';

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

async function resetDatabase(preserveUsers: boolean) {
    console.log(
        preserveUsers
            ? '🧹 Resetting module data (preserving users)...'
            : '🧹 Resetting existing demo data...'
    );

    if (preserveUsers) {
        // Detach users from departments so department records can be safely recreated.
        await prisma.user.updateMany({
            data: {
                department_id: null,
            },
        });

        await prisma.$transaction([
            prisma.auditLog.deleteMany(),
            prisma.notification.deleteMany(),
            prisma.feedback.deleteMany(),
            prisma.trainingPoint.deleteMany(),
            prisma.attendance.deleteMany(),
            prisma.registration.deleteMany(),
            prisma.eventTeamMember.deleteMany(),
            prisma.eventTeamActivity.deleteMany(),
            prisma.eventTeamPermission.deleteMany(),
            prisma.ticket.deleteMany(),
            prisma.userBadge.deleteMany(),
            prisma.badge.deleteMany(),
            prisma.payment.deleteMany(),
            prisma.event.deleteMany(),
            prisma.category.deleteMany(),
            prisma.department.deleteMany(),
        ]);
    } else {
        await prisma.$transaction([
            prisma.auditLog.deleteMany(),
            prisma.notification.deleteMany(),
            prisma.feedback.deleteMany(),
            prisma.trainingPoint.deleteMany(),
            prisma.attendance.deleteMany(),
            prisma.registration.deleteMany(),
            prisma.eventTeamMember.deleteMany(),
            prisma.eventTeamActivity.deleteMany(),
            prisma.eventTeamPermission.deleteMany(),
            prisma.ticket.deleteMany(),
            prisma.userBadge.deleteMany(),
            prisma.badge.deleteMany(),
            prisma.payment.deleteMany(),
            prisma.event.deleteMany(),
            prisma.user.deleteMany(),
            prisma.category.deleteMany(),
            prisma.department.deleteMany(),
        ]);
    }

    console.log('✅ Data reset completed\n');
}

async function printSummary() {
    const [
        departmentCount,
        categoryCount,
        userCount,
        eventCount,
        registrationCount,
        attendanceCount,
        trainingPointCount,
        feedbackCount,
        notificationCount,
        auditLogCount,
        teamMemberCount,
        badgeCount,
        userBadgeCount,
        activityCount,
        permissionCount,
        ticketCount,
        pendingEvents,
        approvedEvents,
        upcomingEvents,
        ongoingEvents,
        completedEvents,
        cancelledEvents,
        paymentCount,
        paidPaymentCount,
    ] = await Promise.all([
        prisma.department.count(),
        prisma.category.count(),
        prisma.user.count(),
        prisma.event.count(),
        prisma.registration.count(),
        prisma.attendance.count(),
        prisma.trainingPoint.count(),
        prisma.feedback.count(),
        prisma.notification.count(),
        prisma.auditLog.count(),
        prisma.eventTeamMember.count(),
        prisma.badge.count(),
        prisma.userBadge.count(),
        prisma.eventTeamActivity.count(),
        prisma.eventTeamPermission.count(),
        prisma.ticket.count(),
        prisma.event.count({ where: { status: 'pending' } }),
        prisma.event.count({ where: { status: 'approved' } }),
        prisma.event.count({ where: { status: 'upcoming' } }),
        prisma.event.count({ where: { status: 'ongoing' } }),
        prisma.event.count({ where: { status: 'completed' } }),
        prisma.event.count({ where: { status: 'cancelled' } }),
        prisma.payment.count(),
        prisma.payment.count({ where: { status: 'paid' } }),
    ]);

    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('📊 Module Coverage Summary:');
    console.log(`   - Departments module: ${departmentCount} records`);
    console.log(`   - Categories module: ${categoryCount} records`);
    console.log(`   - Auth/Users module: ${userCount} users`);
    console.log(`   - Events module: ${eventCount} events`);
    console.log(`     • pending: ${pendingEvents}`);
    console.log(`     • approved: ${approvedEvents}`);
    console.log(`     • upcoming: ${upcomingEvents}`);
    console.log(`     • ongoing: ${ongoingEvents}`);
    console.log(`     • completed: ${completedEvents}`);
    console.log(`     • cancelled: ${cancelledEvents}`);
    console.log(`   - Registrations module: ${registrationCount} registrations`);
    console.log(`   - Check-in module: ${attendanceCount} attendances`);
    console.log(`   - Training points module: ${trainingPointCount} rows`);
    console.log(`   - Feedback module: ${feedbackCount} feedback rows`);
    console.log(`   - Notifications module: ${notificationCount} notifications`);
    console.log(`   - Admin/Audit module: ${auditLogCount} audit logs`);
    console.log(`   - Event Team module: ${teamMemberCount} team members`);
    console.log(`   - Event Team Activities: ${activityCount} activities`);
    console.log(`   - Event Team Permissions: ${permissionCount} permission overrides`);
    console.log(`   - Ticket module: ${ticketCount} tickets`);
    console.log(`   - Gamification module: ${badgeCount} badge definitions, ${userBadgeCount} user badges`);
    console.log(`   - Payments module: ${paymentCount} payments (${paidPaymentCount} paid)`);
}

async function main() {
    console.log('🌱 Starting comprehensive database seeding...\n');

    const preserveUsers = process.env.SEED_PRESERVE_USERS === 'true';
    if (preserveUsers) {
        console.log('ℹ️  Mode: preserve users + reseed module data\n');
    }

    // Reset for idempotent demo seeding.
    await resetDatabase(preserveUsers);

    // 1. Seed Departments
    const departments = await seedDepartments(prisma);

    // 2. Seed Categories
    const categories = await seedCategories(prisma);

    // 3. Seed Users
    const { organizers, teachers: _teachers, students } = await seedUsers(prisma, departments);

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

    // 9. Expand into full demo dataset for all modules
    const expansionResult = await seedDemoExpansion(prisma, {
        departments,
        categories,
        organizers,
        students,
        anchorEvents: events,
    });

    // 10. Seed Event Team Members
    try {
        await seedEventTeamMembers(prisma, {
            departments,
            organizers,
            extraOrganizers: expansionResult.extraOrganizers,
            anchorEvents: events,
            extraEvents: expansionResult.extraEvents,
        });
    } catch (e) {
        console.warn('⚠️  Event team seeding skipped:', (e as Error).message);
    }

    // 11. Seed Badge definitions
    try {
        await seedBadgeDefinitions(prisma);
    } catch (e) {
        console.warn('⚠️  Badge definitions seeding skipped:', (e as Error).message);
    }

    // 12. Seed Event Team Activities
    try {
        const allTeamMembers = await prisma.eventTeamMember.findMany();
        const allUsers = await prisma.user.findMany();
        await seedEventTeamActivities(prisma, {
            anchorEvents: events,
            extraEvents: expansionResult.extraEvents,
            teamMembers: allTeamMembers,
            allUsers,
        });
    } catch (e) {
        console.warn('⚠️  Event team activities seeding skipped:', (e as Error).message);
    }

    // 13. Seed Event Team Permissions
    try {
        await seedEventTeamPermissions(prisma, {
            anchorEvents: events,
            extraEvents: expansionResult.extraEvents,
        });
    } catch (e) {
        console.warn('⚠️  Event team permissions seeding skipped:', (e as Error).message);
    }

    // 14. Seed Tickets
    try {
        const allRegistrations = await prisma.registration.findMany();
        const allEvents = await prisma.event.findMany();
        const allUsers = await prisma.user.findMany();
        await seedTickets(prisma, {
            events: allEvents,
            registrations: allRegistrations,
            users: allUsers,
        });
    } catch (e) {
        console.warn('⚠️  Tickets seeding skipped:', (e as Error).message);
    }

    // 15. Seed User Badges
    try {
        const allBadges = await prisma.badge.findMany();
        await seedUserBadges(prisma, {
            students: [...students, ...expansionResult.extraStudents],
            badges: allBadges,
        });
    } catch (e) {
        console.warn('⚠️  User badges seeding skipped:', (e as Error).message);
    }

    // 16. Seed Payments
    try {
        const allRegistrations = await prisma.registration.findMany();
        const allEvents = await prisma.event.findMany();
        const allUsers = await prisma.user.findMany();

        await seedPayments(prisma, {
            events: allEvents,
            registrations: allRegistrations,
            users: allUsers,
        });

        // Add payment scenarios for better visualization
        await seedPaymentScenarios(prisma, {
            events: allEvents,
            registrations: [],
            users: allUsers,
        });
    } catch (e) {
        console.warn('⚠️  Payments seeding skipped:', (e as Error).message);
    }

    await printSummary();

    console.log('\n📝 Default accounts (Đại học Đại Nam):');
    console.log('   Admin:');
    console.log('     - Email: admin@dnu.edu.vn');
    console.log('     - Password: admin123');
    console.log('\n   Organizers (sinh viên làm BTC — có điểm RL khi tham dự):');
    console.log('     - Email: organizer.cntt@dnu.edu.vn / organizer123');
    console.log('     - Email: organizer.ktdn@dnu.edu.vn / organizer123');
    console.log('     - Email: organizer.nn@dnu.edu.vn / organizer123');
    console.log('\n   Teachers (giảng viên — KHÔNG có điểm RL):');
    console.log('     - Email: teacher@dnu.edu.vn / teacher123');
    console.log('     - Email: teacher.business@dnu.edu.vn / teacher123');
    console.log('\n   External (doanh nghiệp — KHÔNG có điểm RL):');
    console.log('     - Email: partner@fpt.com / external123');
    console.log('     - Email: partner@viettel.com / external123');
    console.log('\n   Students (có điểm RL):');
    console.log('     - Email: student1@dnu.edu.vn / student123 (MSSV: 2071020001)');
    console.log('     - Email: student2@dnu.edu.vn / student123 (MSSV: 2071020002)');
    console.log('     - Email: student3@dnu.edu.vn / student123 (MSSV: 2071020003)');
    console.log('     - Email: student4@dnu.edu.vn / student123 (MSSV: 2071020004)');
    console.log('     - Email: student5@dnu.edu.vn / student123 (MSSV: 2071020005)');
    console.log('     - Email: student6@dnu.edu.vn ... student25@dnu.edu.vn / student123');
    console.log('\n   Extra organizers:');
    console.log('     - Email: organizer.khtn@dnu.edu.vn / organizer123');
    console.log('     - Email: organizer.xh@dnu.edu.vn / organizer123');
    console.log('     - Email: organizer.cntt2@dnu.edu.vn / organizer123');

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
