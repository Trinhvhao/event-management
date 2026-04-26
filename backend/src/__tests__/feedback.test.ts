import request from 'supertest';
import app from '../app';
import prisma from '../config/database';
import bcrypt from 'bcrypt';

describe('Feedback Module Tests', () => {
    let studentToken: string;
    let organizerToken: string;
    let studentId: number;
    let organizerId: number;
    let eventId: number;
    let registrationId: number;
    let departmentId: number;
    let categoryId: number;

    beforeAll(async () => {
        const department = await prisma.department.upsert({
            where: { code: 'TEST-FEEDBACK-DEPT' },
            update: { name: 'Test Feedback Department' },
            create: {
                name: 'Test Feedback Department',
                code: 'TEST-FEEDBACK-DEPT',
            },
            select: { id: true },
        });
        departmentId = department.id;

        const category = await prisma.category.upsert({
            where: { name: 'Test Feedback Category' },
            update: { description: 'Test category for feedback' },
            create: {
                name: 'Test Feedback Category',
                description: 'Test category for feedback',
            },
            select: { id: true },
        });
        categoryId = category.id;

        // Clean test data
        await prisma.feedback.deleteMany({});
        await prisma.attendance.deleteMany({});
        await prisma.registration.deleteMany({});
        await prisma.event.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'feedback-test' } },
        });

        // Create test users
        const hashedPassword = await bcrypt.hash('password123', 10);

        const student = await prisma.user.create({
            data: {
                email: 'student-feedback-test@test.com',
                password_hash: hashedPassword,
                full_name: 'Test Student',
                role: 'student',
                student_id: 'STU001',
                department_id: departmentId,
            },
        });
        studentId = student.id;

        const organizer = await prisma.user.create({
            data: {
                email: 'organizer-feedback-test@test.com',
                password_hash: hashedPassword,
                full_name: 'Test Organizer',
                role: 'organizer',
                student_id: 'ORG001',
                department_id: departmentId,
            },
        });
        organizerId = organizer.id;

        // Login
        const studentLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'student-feedback-test@test.com',
                password: 'password123',
            });
        studentToken = studentLogin.body.data.token;

        const organizerLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'organizer-feedback-test@test.com',
                password: 'password123',
            });
        organizerToken = organizerLogin.body.data.token;

        // Create test event
        const event = await prisma.event.create({
            data: {
                title: 'Test Event for Feedback',
                description: 'Test event',
                start_time: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
                end_time: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
                location: 'Test Location',
                capacity: 100,
                training_points: 5,
                status: 'completed',
                organizer_id: organizerId,
                category_id: categoryId,
                department_id: departmentId,
            },
        });
        eventId = event.id;

        // Create registration and attendance
        const registration = await prisma.registration.create({
            data: {
                user_id: studentId,
                event_id: eventId,
                status: 'registered',
                qr_code: 'test-qr-code',
            },
        });
        registrationId = registration.id;

        await prisma.attendance.create({
            data: {
                registration_id: registrationId,
                checked_in_at: new Date(),
                checked_by: organizerId,
            },
        });
    });

    afterAll(async () => {
        // Clean up
        await prisma.feedback.deleteMany({});
        await prisma.attendance.deleteMany({});
        await prisma.registration.deleteMany({});
        await prisma.event.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'feedback-test' } },
        });
        await prisma.$disconnect();
    });

    describe('POST /api/feedback', () => {
        it('should submit feedback successfully', async () => {
            const response = await request(app)
                .post('/api/feedback')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    event_id: eventId,
                    rating: 5,
                    comment: 'Great event!',
                    suggestions: 'Keep it up!',
                    is_anonymous: false,
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.rating).toBe(5);
            expect(response.body.data.comment).toBe('Great event!');
        });

        it('should fail when submitting duplicate feedback', async () => {
            const response = await request(app)
                .post('/api/feedback')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    event_id: eventId,
                    rating: 4,
                    comment: 'Another feedback',
                });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });

        it('should fail with invalid rating', async () => {
            const response = await request(app)
                .post('/api/feedback')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    event_id: eventId,
                    rating: 6, // Invalid: > 5
                    comment: 'Test',
                });

            expect(response.status).toBe(400);
        });

        it('should fail when user did not attend event', async () => {
            // Create another event without attendance
            const anotherEvent = await prisma.event.create({
                data: {
                    title: 'Another Event',
                    description: 'Test',
                    start_time: new Date(),
                    end_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
                    location: 'Test',
                    capacity: 100,
                    training_points: 3,
                    status: 'upcoming',
                    organizer_id: organizerId,
                    category_id: categoryId,
                    department_id: departmentId,
                },
            });

            const response = await request(app)
                .post('/api/feedback')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    event_id: anotherEvent.id,
                    rating: 5,
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);

            // Cleanup
            await prisma.event.delete({ where: { id: anotherEvent.id } });
        });

        it('should fail when event is not completed even if attended', async () => {
            const inProgressEvent = await prisma.event.create({
                data: {
                    title: 'In Progress Event',
                    description: 'Test',
                    start_time: new Date(Date.now() - 60 * 60 * 1000),
                    end_time: new Date(Date.now() + 60 * 60 * 1000),
                    location: 'Test',
                    capacity: 100,
                    training_points: 3,
                    status: 'ongoing',
                    organizer_id: organizerId,
                    category_id: categoryId,
                    department_id: departmentId,
                },
            });

            const inProgressRegistration = await prisma.registration.create({
                data: {
                    user_id: studentId,
                    event_id: inProgressEvent.id,
                    status: 'registered',
                    qr_code: `qr-in-progress-${inProgressEvent.id}`,
                },
            });

            await prisma.attendance.create({
                data: {
                    registration_id: inProgressRegistration.id,
                    checked_in_at: new Date(),
                    checked_by: organizerId,
                },
            });

            const response = await request(app)
                .post('/api/feedback')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    event_id: inProgressEvent.id,
                    rating: 5,
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);

            await prisma.attendance.deleteMany({
                where: { registration_id: inProgressRegistration.id },
            });
            await prisma.registration.delete({ where: { id: inProgressRegistration.id } });
            await prisma.event.delete({ where: { id: inProgressEvent.id } });
        });

        it('should fail without authentication', async () => {
            const response = await request(app).post('/api/feedback').send({
                event_id: eventId,
                rating: 5,
            });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/feedback/event/:eventId', () => {
        it('should get event feedbacks', async () => {
            const response = await request(app).get(`/api/feedback/event/${eventId}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('feedbacks');
            expect(response.body.data).toHaveProperty('total');
            expect(Array.isArray(response.body.data.feedbacks)).toBe(true);
            expect(response.body.data.total).toBe(1);
        });

        it('should support pagination', async () => {
            const response = await request(app).get(
                `/api/feedback/event/${eventId}?limit=1&offset=0`
            );

            expect(response.status).toBe(200);
            expect(response.body.data.feedbacks.length).toBeLessThanOrEqual(1);
        });
    });

    describe('GET /api/feedback/my-feedback/:eventId', () => {
        it('should get own feedback', async () => {
            const response = await request(app)
                .get(`/api/feedback/my-feedback/${eventId}`)
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.rating).toBe(5);
        });

        it('should return 404 when no feedback exists', async () => {
            const response = await request(app)
                .get(`/api/feedback/my-feedback/${eventId}`)
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/feedback/event/:eventId/summary', () => {
        it('should get feedback summary for organizer', async () => {
            const response = await request(app)
                .get(`/api/feedback/event/${eventId}/summary`)
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('total_feedbacks');
            expect(response.body.data).toHaveProperty('average_rating');
            expect(response.body.data).toHaveProperty('rating_distribution');
            expect(response.body.data.total_feedbacks).toBe(1);
            expect(response.body.data.average_rating).toBe(5);
        });

        it('should fail when student tries to access summary', async () => {
            const response = await request(app)
                .get(`/api/feedback/event/${eventId}/summary`)
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/feedback/top-rated', () => {
        it('should get top rated events', async () => {
            const response = await request(app).get('/api/feedback/top-rated');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should support limit parameter', async () => {
            const response = await request(app).get('/api/feedback/top-rated?limit=5');

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBeLessThanOrEqual(5);
        });
    });
});
