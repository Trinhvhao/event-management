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
    let manualRegistrationId: number;
    let qrCode: string;
    let organizerId: number;
    let studentId: number;
    let manualStudentId: number;

    const resetAttendanceAndPoints = async () => {
        await prisma.attendance.deleteMany({
            where: {
                registration_id: {
                    in: [registrationId, manualRegistrationId],
                },
            },
        });

        await prisma.trainingPoint.deleteMany({
            where: {
                event_id: eventId,
                user_id: {
                    in: [studentId, manualStudentId],
                },
            },
        });
    };

    beforeAll(async () => {
        await prisma.attendance.deleteMany({});
        await prisma.trainingPoint.deleteMany({});
        await prisma.registration.deleteMany({});
        await prisma.event.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'checkin-test' } },
        });

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

        const manualStudent = await prisma.user.create({
            data: {
                email: 'manual-student-checkin-test@test.com',
                password_hash: hashedPassword,
                full_name: 'Manual Student',
                role: 'student',
                student_id: 'STU002',
                department_id: 1,
            },
        });
        manualStudentId = manualStudent.id;

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

        const now = new Date();
        const startTime = new Date(now.getTime() - 60 * 60 * 1000);
        const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

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

        const registration = await prisma.registration.create({
            data: {
                user_id: studentId,
                event_id: eventId,
                status: 'registered',
                qr_code: '',
            },
        });
        registrationId = registration.id;

        const qrData = {
            registration_id: registrationId,
            event_id: eventId,
            user_id: studentId,
            issued_at: new Date().toISOString(),
            expires_at: endTime.toISOString(),
        };

        qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

        await prisma.registration.update({
            where: { id: registrationId },
            data: { qr_code: qrCode },
        });

        const manualRegistration = await prisma.registration.create({
            data: {
                user_id: manualStudentId,
                event_id: eventId,
                status: 'registered',
                qr_code: `manual-${Date.now()}`,
            },
        });
        manualRegistrationId = manualRegistration.id;
    });

    afterAll(async () => {
        await prisma.attendance.deleteMany({});
        await prisma.trainingPoint.deleteMany({});
        await prisma.registration.deleteMany({});
        await prisma.event.deleteMany({});
        await prisma.user.deleteMany({
            where: { email: { contains: 'checkin-test' } },
        });
        await prisma.$disconnect();
    });

    describe('POST /api/checkin/scan', () => {
        it('should allow organizer to check-in with QR code', async () => {
            await resetAttendanceAndPoints();

            const response = await request(app)
                .post('/api/checkin/scan')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({ qr_code: qrCode });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.student.id).toBe(studentId);
            expect(response.body.data.event.id).toBe(eventId);
        });

        it('should fail when student tries to scan QR', async () => {
            const response = await request(app)
                .post('/api/checkin/scan')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ qr_code: qrCode });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should fail with invalid QR code format', async () => {
            const response = await request(app)
                .post('/api/checkin/scan')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({ qr_code: 'invalid-qr-code' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should fail when already checked in', async () => {
            await resetAttendanceAndPoints();

            await request(app)
                .post('/api/checkin/scan')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({ qr_code: qrCode });

            const response = await request(app)
                .post('/api/checkin/scan')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({ qr_code: qrCode });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });

        it('should fail without authentication', async () => {
            const response = await request(app)
                .post('/api/checkin/scan')
                .send({ qr_code: qrCode });

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/checkin/manual', () => {
        it('should check in by student_id', async () => {
            await resetAttendanceAndPoints();

            const response = await request(app)
                .post('/api/checkin/manual')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({
                    event_id: eventId,
                    student_id: 'STU002',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.student.id).toBe(manualStudentId);
        });

        it('should validate required manual identifiers', async () => {
            const response = await request(app)
                .post('/api/checkin/manual')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({ event_id: eventId });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/checkin/event/:eventId', () => {
        beforeAll(async () => {
            await resetAttendanceAndPoints();

            await request(app)
                .post('/api/checkin/scan')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send({ qr_code: qrCode });
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
            expect(response.body.data.total_attendances).toBeGreaterThanOrEqual(1);
        });
    });
});
