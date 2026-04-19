import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app';
import prisma from '../config/database';

describe('API Contract Smoke - Registrations and Notifications', () => {
  const email = 'contract-smoke.student@test.com';
  const password = 'password123';
  let token = '';

  beforeAll(async () => {
    await prisma.notification.deleteMany({
      where: {
        user: {
          email: {
            contains: 'contract-smoke',
          },
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'contract-smoke',
        },
      },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
        full_name: 'Contract Smoke Student',
        role: 'student',
      },
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email,
      password,
    });

    token = loginResponse.body?.data?.token;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: {
        user: {
          email: {
            contains: 'contract-smoke',
          },
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'contract-smoke',
        },
      },
    });
  });

  it('GET /api/registrations/my returns array response shape', async () => {
    const response = await request(app)
      .get('/api/registrations/my')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('GET /api/notifications returns expected object response shape', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('notifications');
    expect(response.body.data).toHaveProperty('total');
    expect(response.body.data).toHaveProperty('limit');
    expect(response.body.data).toHaveProperty('offset');
    expect(response.body.data).toHaveProperty('has_more');
  });

  it('PUT /api/notifications/read-all is available and returns count', async () => {
    const response = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('count');
    expect(typeof response.body.data.count).toBe('number');
  });
});
