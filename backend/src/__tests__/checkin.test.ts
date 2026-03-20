import request from 'supertest';
import app from '../app';
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import QRCode from 'qrcode';

describe('Check-in Module Tests', () => {
    let organizerToken: string;
    let studentToken: string;
    let eventId: number;
    let registrationId: number;
    let qrCode: string;
    let organizerId: number;
    let studentId: number;

    beforeAll(async () => {
        // Clean test data
        await prisma.attendance.deleteMany({});
        await prisma.trainingPoint.deleteMany({});
        await prisma.registration.deleteMany({});
        await prisma.event.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'checkin-test' } },
        });

        // Create test organizer
        const hashedPassword = await bcrypt.hash('password123', 10);
        const organizer = await prisma.user.create({
            data: {
                email: 'organizer-checkin-test@test.com',
                password_hash: hashedPassword,
                full_name: 'Test Organizer',
                role: 'organizer',
                student_id: 'ORG001',
                department_id: 1,
            },
        });
        organizerId = organizer.id;

        // Create test student
        const student = await prisma.user.create({
            data: {
                email: 'student-checkin-test@test.com',
                password_hash: hashedPassword,
                full_name: 'Test Student',
                role: 'student',
                student_id: 'STU001',
                department_id: 1,
            },
        });
        studentId = student.id;

        // Login to get tokens
        const organizerLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'organizer-checkin-test@test.com',
                password: 'password123',
            });
        organizerToken = organizerLogin.body.data.token;

        const studentLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'student-checkin-test@test.com',
                password: 'password123',
            });
        studentToken = studentLogin.body.data.token;

        // Create test event (ongoing)
        const now = new Date();
        const startTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
        const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

        const event = await prisma.event.create({
            data: {
                title: 'Test Event for Check-in',
                description: 'Test event',
                start_time: startTime,
                end_time: endTime,
                location: 'Test Location',
                capacity: 100,
                training_points: 5,
                status: 'ongoing',
                organizer_id: organizerId,
                category_id: 1,
                department_id: 1,
            },
        });
        eventId = event.id;

        // Create registration with QR code
        const qrData = {
            registration_id: 0, // Will update
            event_id: eventId,
            user_id: studentId,
            issued_at: new Date().toISOString(),
            expires_at: endTime.toISOString(),
        };

        const registration = await prisma.registration.create({
            data: {
                user_id: studentId,
                event_id: eventId,
                status: 'registered',
                qr_code: '',
            },
        });
        registrationId = registration.id;

        // Generate QR code
        qrData.registration_id = registrationId;
        qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

        // Update registration with QR
        await prisma.registration.update({
            where: { id: registrationId },
            data: { qr_code: qrCode },
        });
    });

    afterAll(async () => {
        // Clean up
        await prisma.attendance.deleteMany({});
        await prisma.trainingPoint.deleteMany({});
        await prisma.registration.deleteMany({});
        await prisma.event.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'checkin-test' } },
        });
        await prisma.$disconnect();
    });

    describe('POST /api/checkin', () => {
        it('should allow student to self check-in with their own QR code', async () => {
            const response = await request(app)
                .post('/api/checkin')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ qr_code: qrCode });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.student.id).toBe(studentId);
            expect(response.body.data.event.id).toBe(eventId);
        });

        it('should allow organizer to check-in anyone', async () => {
            // Clean previous attendance
            await prisma.attendance.deleteMany({
                where: { registration_id: registrationId },
            });
            await prisma.trainingPoint.deleteMany({
                where: { user_id: studentId, event_id: eventId },
            });

            const response = await request(app)
                .post('/api/checkin')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({ qr_code: qrCode });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it('should fail when student tries to check-in with someone else QR', async () => {
            // Create another student
            const hashedPassword = await bcrypt.hash('password123', 10);
            const anotherStudent = await prisma.user.create({
                data: {
                    email: 'another-student-checkin-test@test.com',
                    password_hash: hashedPassword,
                    full_name: 'Another Student',
                    role: 'student',
                    student_id: 'STU002',
                    department_id: 1,
                },
            });

            const anotherLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'another-student-checkin-test@test.com',
                    password: 'password123',
                });
            const anotherToken = anotherLogin.body.data.token;

            // Try to check-in with original student's QR
            const response = await request(app)
                .post('/api/checkin')
                .set('Authorization', `Bearer ${anotherToken}`)
                .send({ qr_code: qrCode });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);

            // Cleanup
            await prisma.user.delete({ where: { id: anotherStudent.id } });
        });

        it('should fail with invalid QR code format', async () => {
            const response = await request(app)
                .post('/api/checkin')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ qr_code: 'invalid-qr-code' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should fail when already checked in', async () => {
            // Try to check-in again
            const response = await request(app)
                .post('/api/checkin')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ qr_code: qrCode });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .post('/api/checkin')
                .send({ qr_code: qrCode });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/checkin/event/:eventId', () => {
        beforeAll(async () => {
            // Ensure we have attendance data for GET tests
            // Clean first
            await prisma.attendance.deleteMany({
                where: { registration_id: registrationId },
            });
            await prisma.trainingPoint.deleteMany({
                where: { user_id: studentId, event_id: eventId },
            });

            // Create fresh attendance
            await prisma.attendance.create({
                data: {
                    registration_id: registrationId,
                    checked_by: organizerId,
                },
            });

            await prisma.trainingPoint.create({
                data: {
                    user_id: studentId,
                    event_id: eventId,
                    points: 5,
                    semester: '2024-2025-1',
                },
            });
        });

        it('should get event attendances', async () => {
            const response = await request(app)
                .get(`/api/checkin/event/${eventId}`)
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should fail without authentication', async () => {
            const response = await request(app).get(`/api/checkin/event/${eventId}`);

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/checkin/event/:eventId/stats', () => {
        it('should get attendance statistics', async () => {
            const response = await request(app)
                .get(`/api/checkin/event/${eventId}/stats`)
                .set('Authorization', `Bearer ${organizerToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('total_registrations');
            expect(response.body.data).toHaveProperty('total_attendances');
            expect(response.body.data).toHaveProperty('attendance_rate');
            expect(response.body.data.total_attendances).toBe(1);
        });
    });
});
