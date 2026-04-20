import request from 'supertest';
import app from '../app';
import prisma from '../config/database';
import bcrypt from 'bcrypt';

describe('Training Points Module Tests', () => {
    let studentToken: string;
    let adminToken: string;
    let studentId: number;
    let adminId: number;
    let awardEventId: number;

    beforeAll(async () => {
        // Clean test data
        await prisma.trainingPoint.deleteMany({});
        await prisma.attendance.deleteMany({});
        await prisma.registration.deleteMany({});
        await prisma.event.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'training-test' } },
        });

        // Create test users
        const hashedPassword = await bcrypt.hash('password123', 10);

        const student = await prisma.user.create({
            data: {
                email: 'student-training-test@test.com',
                password_hash: hashedPassword,
                full_name: 'Test Student',
                role: 'student',
                student_id: 'STU001',
                department_id: 1,
            },
        });
        studentId = student.id;

        const admin = await prisma.user.create({
            data: {
                email: 'admin-training-test@test.com',
                password_hash: hashedPassword,
                full_name: 'Test Admin',
                role: 'admin',
                student_id: 'ADM001',
                department_id: 1,
            },
        });
        adminId = admin.id;

        // Login
        const studentLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'student-training-test@test.com',
                password: 'password123',
            });
        studentToken = studentLogin.body.data.token;

        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin-training-test@test.com',
                password: 'password123',
            });
        adminToken = adminLogin.body.data.token;

        // Create test events
        const event1 = await prisma.event.create({
            data: {
                title: 'Test Event 1 for Training Points',
                description: 'Test event',
                start_time: new Date(),
                end_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
                location: 'Test Location',
                capacity: 100,
                training_points: 5,
                status: 'ongoing',
                organizer_id: adminId,
                category_id: 1,
                department_id: 1,
            },
        });
        const event2 = await prisma.event.create({
            data: {
                title: 'Test Event 2 for Training Points',
                description: 'Test event 2',
                start_time: new Date(),
                end_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
                location: 'Test Location',
                capacity: 100,
                training_points: 3,
                status: 'ongoing',
                organizer_id: adminId,
                category_id: 1,
                department_id: 1,
            },
        });

        const event3 = await prisma.event.create({
            data: {
                title: 'Test Event 3 for Training Award',
                description: 'Award endpoint event',
                start_time: new Date(Date.now() - 2 * 60 * 60 * 1000),
                end_time: new Date(Date.now() - 60 * 60 * 1000),
                location: 'Test Location',
                capacity: 100,
                training_points: 2,
                status: 'completed',
                organizer_id: adminId,
                category_id: 1,
                department_id: 1,
            },
        });
        awardEventId = event3.id;

        // Create training points for student (different events)
        await prisma.trainingPoint.create({
            data: {
                user_id: studentId,
                event_id: event1.id,
                points: 5,
                semester: '2024-2025-1',
                earned_at: new Date(),
            },
        });

        await prisma.trainingPoint.create({
            data: {
                user_id: studentId,
                event_id: event2.id,
                points: 3,
                semester: '2024-2025-1',
                earned_at: new Date(),
            },
        });

        const registrationForAward = await prisma.registration.create({
            data: {
                user_id: studentId,
                event_id: awardEventId,
                status: 'registered',
                qr_code: `training-award-${Date.now()}`,
            },
        });

        await prisma.attendance.create({
            data: {
                registration_id: registrationForAward.id,
                checked_by: adminId,
            },
        });
    });

    afterAll(async () => {
        // Clean up
        await prisma.trainingPoint.deleteMany({});
        await prisma.attendance.deleteMany({});
        await prisma.registration.deleteMany({});
        await prisma.event.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'training-test' } },
        });
        await prisma.$disconnect();
    });

    describe('GET /api/training-points/my-points', () => {
        it('should get student own training points', async () => {
            const response = await request(app)
                .get('/api/training-points/my-points')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('grand_total');
            expect(response.body.data).toHaveProperty('total_events');
            expect(response.body.data).toHaveProperty('semesters');
            expect(response.body.data.grand_total).toBe(8); // 5 + 3
            expect(response.body.data.total_events).toBe(2);
        });

        it('should fail without authentication', async () => {
            const response = await request(app).get('/api/training-points/my-points');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/training-points/my-points/history', () => {
        it('should get training points history', async () => {
            const response = await request(app)
                .get('/api/training-points/my-points/history')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('points');
            expect(response.body.data).toHaveProperty('total');
            expect(Array.isArray(response.body.data.points)).toBe(true);
            expect(response.body.data.points.length).toBe(2);
        });

        it('should filter by semester', async () => {
            const response = await request(app)
                .get('/api/training-points/my-points/history?semester=2024-2025-1')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.points.length).toBe(2);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/training-points/my-points/history?limit=1&offset=0')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.points.length).toBe(1);
            expect(response.body.data.has_more).toBe(true);
        });
    });

    describe('GET /api/training-points/user/:userId', () => {
        it('should allow admin to view user points', async () => {
            const response = await request(app)
                .get(`/api/training-points/user/${studentId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('grand_total');
            expect(response.body.data.user.id).toBe(studentId);
        });

        it('should fail when student tries to view other user points', async () => {
            const response = await request(app)
                .get(`/api/training-points/user/${adminId}`)
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(403);
        });

        it('should fail for non-existent user', async () => {
            const response = await request(app)
                .get('/api/training-points/user/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/training-points/award', () => {
        it('should allow admin to award points for attended event', async () => {
            const response = await request(app)
                .post('/api/training-points/award')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    user_id: studentId,
                    event_id: awardEventId,
                    points: 2,
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.points).toBe(2);
            expect(response.body.data.user_id).toBe(studentId);
            expect(response.body.data.event_id).toBe(awardEventId);
        });

        it('should fail when awarding duplicate points', async () => {
            const response = await request(app)
                .post('/api/training-points/award')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    user_id: studentId,
                    event_id: awardEventId,
                    points: 2,
                });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });

        it('should fail when student tries to award points', async () => {
            const response = await request(app)
                .post('/api/training-points/award')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    user_id: studentId,
                    event_id: awardEventId,
                    points: 2,
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/training-points/export', () => {
        it('should export training points in JSON for admin', async () => {
            const response = await request(app)
                .get('/api/training-points/export?format=json')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('total_records');
            expect(response.body.data).toHaveProperty('total_points');
            expect(Array.isArray(response.body.data.records)).toBe(true);
        });

        it('should export training points in CSV for admin', async () => {
            const response = await request(app)
                .get('/api/training-points/export?format=csv')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.text).toContain('user_id');
            expect(response.text).toContain('event_title');
        });
    });

    describe('GET /api/training-points/statistics', () => {
        it('should get training points statistics for admin', async () => {
            const response = await request(app)
                .get('/api/training-points/statistics')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('total_points_awarded');
            expect(response.body.data).toHaveProperty('total_users_with_points');
            expect(response.body.data).toHaveProperty('top_users');
            expect(response.body.data).toHaveProperty('semester_statistics');
        });

        it('should fail when student tries to access statistics', async () => {
            const response = await request(app)
                .get('/api/training-points/statistics')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/training-points/current-semester', () => {
        it('should get current semester without authentication', async () => {
            const response = await request(app).get(
                '/api/training-points/current-semester'
            );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('semester');
            expect(typeof response.body.data.semester).toBe('string');
        });
    });
});
