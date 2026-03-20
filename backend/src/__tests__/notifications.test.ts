import request from 'supertest';
import app from '../app';
import prisma from '../config/database';
import bcrypt from 'bcrypt';

describe('Notifications Module Tests', () => {
    let studentToken: string;
    let studentId: number;
    let eventId: number;
    let notificationId: number;

    beforeAll(async () => {
        // Clean test data
        await prisma.notification.deleteMany({});
        await prisma.event.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'notification-test' } },
        });

        // Create test user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const student = await prisma.user.create({
            data: {
                email: 'student-notification-test@test.com',
                password_hash: hashedPassword,
                full_name: 'Test Student',
                role: 'student',
                student_id: 'STU001',
                department_id: 1,
            },
        });
        studentId = student.id;

        // Login
        const studentLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'student-notification-test@test.com',
                password: 'password123',
            });
        studentToken = studentLogin.body.data.token;

        // Create test event
        const event = await prisma.event.create({
            data: {
                title: 'Test Event for Notifications',
                description: 'Test event',
                start_time: new Date(),
                end_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
                location: 'Test Location',
                capacity: 100,
                training_points: 5,
                status: 'upcoming',
                organizer_id: studentId,
                category_id: 1,
                department_id: 1,
            },
        });
        eventId = event.id;

        // Create test notifications
        const notification1 = await prisma.notification.create({
            data: {
                user_id: studentId,
                type: 'registration_confirm',
                title: 'Test Notification 1',
                message: 'This is a test notification',
                event_id: eventId,
                is_read: false,
            },
        });
        notificationId = notification1.id;

        await prisma.notification.create({
            data: {
                user_id: studentId,
                type: 'event_reminder',
                title: 'Test Notification 2',
                message: 'This is another test notification',
                event_id: eventId,
                is_read: false,
            },
        });

        await prisma.notification.create({
            data: {
                user_id: studentId,
                type: 'checkin_success',
                title: 'Test Notification 3',
                message: 'Already read notification',
                event_id: eventId,
                is_read: true,
            },
        });
    });

    afterAll(async () => {
        // Clean up
        await prisma.notification.deleteMany({});
        await prisma.event.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'notification-test' } },
        });
        await prisma.$disconnect();
    });

    describe('GET /api/notifications', () => {
        it('should get all notifications', async () => {
            const response = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('notifications');
            expect(response.body.data).toHaveProperty('total');
            expect(Array.isArray(response.body.data.notifications)).toBe(true);
            expect(response.body.data.total).toBe(3);
        });

        it('should get only unread notifications', async () => {
            const response = await request(app)
                .get('/api/notifications?unread_only=true')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.notifications.length).toBe(2);
            expect(response.body.data.notifications.every((n: any) => !n.is_read)).toBe(true);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/notifications?limit=1&offset=0')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.notifications.length).toBe(1);
            expect(response.body.data.has_more).toBe(true);
        });

        it('should fail without authentication', async () => {
            const response = await request(app).get('/api/notifications');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/notifications/unread-count', () => {
        it('should get unread count', async () => {
            const response = await request(app)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('count');
            expect(response.body.data.count).toBe(2);
        });
    });

    describe('PUT /api/notifications/:id/read', () => {
        it('should mark notification as read', async () => {
            const response = await request(app)
                .put(`/api/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.is_read).toBe(true);
        });

        it('should fail for non-existent notification', async () => {
            const response = await request(app)
                .put('/api/notifications/99999/read')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(500);
        });

        it('should fail without authentication', async () => {
            const response = await request(app).put(
                `/api/notifications/${notificationId}/read`
            );

            expect(response.status).toBe(401);
        });
    });

    describe('PUT /api/notifications/mark-all-read', () => {
        it('should mark all notifications as read', async () => {
            const response = await request(app)
                .put('/api/notifications/mark-all-read')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('count');

            // Verify unread count is now 0
            const countResponse = await request(app)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(countResponse.body.data.count).toBe(0);
        });
    });

    describe('DELETE /api/notifications/:id', () => {
        it('should delete notification', async () => {
            const response = await request(app)
                .delete(`/api/notifications/${notificationId}`)
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify notification is deleted
            const getResponse = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(getResponse.body.data.total).toBe(2);
        });

        it('should fail for non-existent notification', async () => {
            const response = await request(app)
                .delete('/api/notifications/99999')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(response.status).toBe(500);
        });
    });
});
