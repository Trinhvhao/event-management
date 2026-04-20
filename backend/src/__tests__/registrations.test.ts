import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/database';

describe('Registrations Module Tests', () => {
  let studentToken = '';
  let organizerToken = '';
  let studentId = 0;
  let organizerId = 0;
  let departmentId = 0;
  let categoryId = 0;
  let eventAId = 0;
  let eventBId = 0;
  let eventCId = 0;
  let registrationAId = 0;
  let registrationCId = 0;

  beforeAll(async () => {
    await prisma.notification.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-registration-module',
          },
        },
      },
    });

    await prisma.registration.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-registration-module',
          },
        },
      },
    });

    await prisma.event.deleteMany({
      where: {
        title: {
          contains: 'Registration Module Test',
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-registration-module',
        },
      },
    });

    await prisma.category.deleteMany({
      where: {
        name: {
          contains: 'Registration Module Test',
        },
      },
    });

    await prisma.department.deleteMany({
      where: {
        name: {
          contains: 'Registration Module Test',
        },
      },
    });

    const passwordHash = await bcrypt.hash('password123', 10);

    const department = await prisma.department.create({
      data: {
        name: 'Registration Module Test Department',
        code: 'RMTD',
      },
    });
    departmentId = department.id;

    const category = await prisma.category.create({
      data: {
        name: 'Registration Module Test Category',
      },
    });
    categoryId = category.id;

    const student = await prisma.user.create({
      data: {
        email: 'student-test-registration-module@test.com',
        password_hash: passwordHash,
        full_name: 'Student Registration Module',
        student_id: 'RMT-ST-001',
        role: 'student',
        department_id: departmentId,
      },
    });
    studentId = student.id;

    const organizer = await prisma.user.create({
      data: {
        email: 'organizer-test-registration-module@test.com',
        password_hash: passwordHash,
        full_name: 'Organizer Registration Module',
        role: 'organizer',
        department_id: departmentId,
      },
    });
    organizerId = organizer.id;

    const now = Date.now();

    const eventA = await prisma.event.create({
      data: {
        title: 'Registration Module Test Event A',
        description: 'Registration duplicate and re-register checks',
        start_time: new Date(now + 72 * 60 * 60 * 1000),
        end_time: new Date(now + 80 * 60 * 60 * 1000),
        location: 'Auditorium A',
        category_id: categoryId,
        department_id: departmentId,
        organizer_id: organizerId,
        capacity: 10,
        training_points: 5,
        status: 'upcoming',
        registration_deadline: new Date(now + 24 * 60 * 60 * 1000),
      },
    });
    eventAId = eventA.id;

    const eventB = await prisma.event.create({
      data: {
        title: 'Registration Module Test Event B',
        description: 'Registration deadline check',
        start_time: new Date(now + 72 * 60 * 60 * 1000),
        end_time: new Date(now + 80 * 60 * 60 * 1000),
        location: 'Auditorium B',
        category_id: categoryId,
        department_id: departmentId,
        organizer_id: organizerId,
        capacity: 10,
        training_points: 5,
        status: 'upcoming',
        registration_deadline: new Date(now - 60 * 60 * 1000),
      },
    });
    eventBId = eventB.id;

    const eventC = await prisma.event.create({
      data: {
        title: 'Registration Module Test Event C',
        description: 'QR endpoint checks',
        start_time: new Date(now + 96 * 60 * 60 * 1000),
        end_time: new Date(now + 104 * 60 * 60 * 1000),
        location: 'Auditorium C',
        category_id: categoryId,
        department_id: departmentId,
        organizer_id: organizerId,
        capacity: 10,
        training_points: 6,
        status: 'upcoming',
        registration_deadline: new Date(now + 48 * 60 * 60 * 1000),
      },
    });
    eventCId = eventC.id;

    studentToken = jwt.sign(
      { id: studentId, role: 'student' },
      process.env.JWT_SECRET || 'test-secret'
    );

    organizerToken = jwt.sign(
      { id: organizerId, role: 'organizer' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-registration-module',
          },
        },
      },
    });

    await prisma.registration.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-registration-module',
          },
        },
      },
    });

    await prisma.event.deleteMany({
      where: {
        title: {
          contains: 'Registration Module Test',
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-registration-module',
        },
      },
    });

    await prisma.category.deleteMany({
      where: {
        name: {
          contains: 'Registration Module Test',
        },
      },
    });

    await prisma.department.deleteMany({
      where: {
        name: {
          contains: 'Registration Module Test',
        },
      },
    });

    await prisma.$disconnect();
  });

  it('registers event successfully', async () => {
    const response = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ event_id: eventAId });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('registered');
    expect(typeof response.body.data.qr_code).toBe('string');

    registrationAId = response.body.data.id;
  });

  it('blocks duplicate registration with conflict', async () => {
    const response = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ event_id: eventAId });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('allows re-register after cancellation', async () => {
    const cancelResponse = await request(app)
      .delete(`/api/registrations/${registrationAId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.success).toBe(true);

    const registerAgainResponse = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ event_id: eventAId });

    expect(registerAgainResponse.status).toBe(201);
    expect(registerAgainResponse.body.success).toBe(true);
    expect(registerAgainResponse.body.data.status).toBe('registered');
  });

  it('rejects registration after deadline', async () => {
    const response = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ event_id: eventBId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns QR via both qrcode and qr endpoints', async () => {
    const registerResponse = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ event_id: eventCId });

    expect(registerResponse.status).toBe(201);
    registrationCId = registerResponse.body.data.id;

    const qrcodeResponse = await request(app)
      .get(`/api/registrations/${registrationCId}/qrcode`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(qrcodeResponse.status).toBe(200);
    expect(qrcodeResponse.body.success).toBe(true);
    expect(qrcodeResponse.body.data.registration_id).toBe(registrationCId);
    expect(typeof qrcodeResponse.body.data.qr_code).toBe('string');

    const qrAliasResponse = await request(app)
      .get(`/api/registrations/${registrationCId}/qr`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(qrAliasResponse.status).toBe(200);
    expect(qrAliasResponse.body.success).toBe(true);
    expect(qrAliasResponse.body.data.registration_id).toBe(registrationCId);
  });

  it('blocks QR retrieval for cancelled registration', async () => {
    const cancelResponse = await request(app)
      .delete(`/api/registrations/${registrationCId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(cancelResponse.status).toBe(200);

    const qrcodeResponse = await request(app)
      .get(`/api/registrations/${registrationCId}/qrcode`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(qrcodeResponse.status).toBe(409);
    expect(qrcodeResponse.body.success).toBe(false);
    expect(qrcodeResponse.body.error.code).toBe('CONFLICT');
  });

  it('allows organizer to view event registrations list', async () => {
    const response = await request(app)
      .get(`/api/registrations/event/${eventAId}`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
