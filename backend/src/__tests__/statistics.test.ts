import request from 'supertest';
import app from '../app';
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('Statistics Module Tests', () => {
    let adminToken: string;
    let organizerToken: string;
    let studentToken: string;
    let adminUser: any;
    let organizerUser: any;
    let studentUser: any;
    let department: any;
    let category: any;
    let event1: any;
    let event2: any;

    beforeAll(async () => {
        // Clean test data
        await prisma.feedback.deleteMany({ where: { user: { email: { contains: 'test-stats' } } } });
        await prisma.trainingPoint.deleteMany({ where: { user: { email: { contains: 'test-stats' } } } });
        await prisma.attendance.deleteMany({ where: { registration: { user: { email: { contains: 'test-stats' } } } } });
        await prisma.registration.deleteMany({ where: { user: { email: { contains: 'test-stats' } } } });
        await prisma.event.deleteMany({ where: { organizer: { email: { contains: 'test-stats' } } } });
        await prisma.user.deleteMany({ where: { email: { contains: 'test-stats' } } });
        await prisma.category.deleteMany({ where: { name: { contains: 'Test Stats' } } });
        await prisma.department.deleteMany({ where: { name: { contains: 'Test Stats' } } });

        // Create test department and category
        department = await prisma.department.create({
            data: { name: 'Test Stats Department', code: 'TSD', description: 'Test' },
        });

        category = await prisma.category.create({
            data: { name: 'Test Stats Category', description: 'Test' },
        });

        // Create test users
        const hashedPassword = await bcrypt.hash('password123', 10);

        adminUser = await prisma.user.create({
            data: {
                email: 'admin-test-stats@test.com',
                password_hash: hashedPassword,
                full_name: 'Admin Stats',
                role: 'admin',
                department_id: department.id,
            },
        });

        organizerUser = await prisma.user.create({
            data: {
                email: 'organizer-test-stats@test.com',
                password_hash: hashedPassword,
                full_name: 'Organizer Stats',
                role: 'organizer',
                department_id: department.id,
            },
        });

        studentUser = await prisma.user.create({
            data: {
                email: 'student-test-stats@test.com',
                password_hash: hashedPassword,
                full_name: 'Student Stats',
                student_id: 'ST001',
                role: 'student',
                department_id: department.id,
            },
        });

        // Generate tokens
        adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, process.env.JWT_SECRET || 'test-secret');
        organizerToken = jwt.sign({ id: organizerUser.id, role: organizerUser.role }, process.env.JWT_SECRET || 'test-secret');
        studentToken = jwt.sign({ id: studentUser.id, role: studentUser.role }, process.env.JWT_SECRET || 'test-secret');

        // Create test events
        event1 = await prisma.event.create({
            data: {
                title: 'Test Stats Event 1',
                description: 'Test event for statistics',
                start_time: new Date(Date.now() + 86400000),
                end_time: new Date(Date.now() + 90000000),
                location: 'Test Location',
                category_id: category.id,
                department_id: department.id,
                organizer_id: organizerUser.id,
                capacity: 100,
                training_points: 5,
                status: 'upcoming',
            },
        });

        event2 = await prisma.event.create({
            data: {
                title: 'Test Stats Event 2',
                description: 'Test event for statistics',
                start_time: new Date(Date.now() - 86400000),
                end_time: new Date(Date.now() - 3600000),
                location: 'Test Location',
                category_id: category.id,
                department_id: department.id,
                organizer_id: organizerUser.id,
                capacity: 50,
                training_points: 3,
                status: 'completed',
            },
        });

        // Create registrations
        await prisma.registration.create({
            data: {
                user_id: studentUser.id,
                event_id: event1.id,
                qr_code: 'QR-TEST-STATS-1',
                status: 'registered',
            },
        });

        const registration2 = await prisma.registration.create({
            data: {
                user_id: studentUser.id,
                event_id: event2.id,
                qr_code: 'QR-TEST-STATS-2',
                status: 'registered',
            },
        });

        // Create attendance for event2
        await prisma.attendance.create({
            data: {
                registration_id: registration2.id,
                checked_by: organizerUser.id,
            },
        });

        // Create training points
        await prisma.trainingPoint.create({
            data: {
                user_id: studentUser.id,
                event_id: event2.id,
                points: 3,
                semester: '2024-1',
            },
        });

        // Create feedback
        await prisma.feedback.create({
            data: {
                user_id: studentUser.id,
                event_id: event2.id,
                rating: 5,
                comment: 'Great event!',
                is_anonymous: false,
            },
        });
    });

    afterAll(async () => {
        // Clean up
        await prisma.feedback.deleteMany({ where: { user: { email: { contains: 'test-stats' } } } });
        await prisma.trainingPoint.deleteMany({ where: { user: { email: { contains: 'test-stats' } } } });
        await prisma.attendance.deleteMany({ where: { registration: { user: { email: { contains: 'test-stats' } } } } });
        await prisma.registration.deleteMany({ where: { user: { email: { contains: 'test-stats' } } } });
        await prisma.event.deleteMany({ where: { organizer: { email: { contains: 'test-stats' } } } });
        await prisma.user.deleteMany({ where: { email: { contains: 'test-stats' } } });
        await prisma.category.deleteMany({ where: { name: { contains: 'Test Stats' } } });
        await prisma.department.deleteMany({ where: { name: { contains: 'Test Stats' } } });
        await prisma.$disconnect();
    });

    describe('GET /api/statistics/dashboard', () => {
        it('should return dashboard statistics for admin', async () => {
            const response = await request(app)
                .get('/api/statistics/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('totalEvents');
            expect(response.body.data).toHaveProperty('totalUsers');
            expect(response.body.data).toHaveProperty('totalRegistrations');
            expect(response.body.data).toHaveProperty('totalAttendances');
            expect(response.body.data).toHaveProperty('eventsByStatus');
            expect(response.body.data).toHaveProperty('usersByRole');
            expect(response.body.data).toHaveProperty('checkInRate');
            expect(typeof response.body.data.checkInRate).toBe('number');
        });

        it('should return dashboard statistics for organizer', async () => {
            const response = await request(app)
                .get('/api/statistics/dashboard')
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .get('/api/statistics/dashboard');

            expect(response.status).toBe(401);
        });

        it('should fail for student role', async () => {
            const response = await request(app)
                .get('/api/statistics/dashboard')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/statistics/events/:id', () => {
        it('should return event statistics', async () => {
            const response = await request(app)
                .get(`/api/statistics/events/${event2.id}`)
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('registrations');
            expect(response.body.data).toHaveProperty('attendances');
            expect(response.body.data).toHaveProperty('checkInRate');
            expect(response.body.data).toHaveProperty('avgRating');
            expect(response.body.data).toHaveProperty('feedbackCount');
            expect(response.body.data.registrations).toBeGreaterThanOrEqual(1);
            expect(response.body.data.attendances).toBeGreaterThanOrEqual(1);
            expect(response.body.data.avgRating).toBe(5);
        });

        it('should fail for non-existent event', async () => {
            const response = await request(app)
                .get('/api/statistics/events/999999')
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(404);
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .get(`/api/statistics/events/${event1.id}`);

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/statistics/my', () => {
        it('should return organizer statistics', async () => {
            const response = await request(app)
                .get('/api/statistics/my')
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('totalEvents');
            expect(response.body.data).toHaveProperty('totalRegistrations');
            expect(response.body.data).toHaveProperty('totalAttendances');
            expect(response.body.data).toHaveProperty('checkInRate');
            expect(response.body.data).toHaveProperty('avgRating');
            expect(response.body.data).toHaveProperty('feedbackCount');
            expect(response.body.data).toHaveProperty('topEvents');
            expect(response.body.data).toHaveProperty('eventsByStatus');
            expect(response.body.data.totalEvents).toBeGreaterThanOrEqual(2);
            expect(Array.isArray(response.body.data.topEvents)).toBe(true);
        });

        it('should fail for student role', async () => {
            const response = await request(app)
                .get('/api/statistics/my')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/statistics/students', () => {
        it('should return student statistics for admin', async () => {
            const response = await request(app)
                .get('/api/statistics/students')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('topByEvents');
            expect(response.body.data).toHaveProperty('topByPoints');
            expect(Array.isArray(response.body.data.topByEvents)).toBe(true);
            expect(Array.isArray(response.body.data.topByPoints)).toBe(true);
        });

        it('should fail for organizer role', async () => {
            const response = await request(app)
                .get('/api/statistics/students')
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(403);
        });

        it('should fail for student role', async () => {
            const response = await request(app)
                .get('/api/statistics/students')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/statistics/departments', () => {
        it('should return department statistics for admin', async () => {
            const response = await request(app)
                .get('/api/statistics/departments')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);

            if (response.body.data.length > 0) {
                const dept = response.body.data[0];
                expect(dept).toHaveProperty('id');
                expect(dept).toHaveProperty('name');
                expect(dept).toHaveProperty('code');
                expect(dept).toHaveProperty('eventsCount');
                expect(dept).toHaveProperty('studentsCount');
                expect(dept).toHaveProperty('registrationsCount');
            }
        });

        it('should fail for organizer role', async () => {
            const response = await request(app)
                .get('/api/statistics/departments')
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('Edge Cases', () => {
        it('should handle event with no registrations', async () => {
            const emptyEvent = await prisma.event.create({
                data: {
                    title: 'Empty Event',
                    description: 'No registrations',
                    start_time: new Date(Date.now() + 86400000),
                    end_time: new Date(Date.now() + 90000000),
                    location: 'Test',
                    category_id: category.id,
                    department_id: department.id,
                    organizer_id: organizerUser.id,
                    capacity: 50,
                    training_points: 2,
                },
            });

            const response = await request(app)
                .get(`/api/statistics/events/${emptyEvent.id}`)
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.registrations).toBe(0);
            expect(response.body.data.attendances).toBe(0);
            expect(response.body.data.checkInRate).toBe(0);
            expect(response.body.data.avgRating).toBe(0);

            await prisma.event.delete({ where: { id: emptyEvent.id } });
        });

        it('should calculate check-in rate correctly', async () => {
            const response = await request(app)
                .get('/api/statistics/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            const { totalRegistrations, totalAttendances, checkInRate } = response.body.data;

            if (totalRegistrations > 0) {
                const expectedRate = Math.round((totalAttendances / totalRegistrations) * 100);
                expect(checkInRate).toBe(expectedRate);
            } else {
                expect(checkInRate).toBe(0);
            }
        });
    });
});
