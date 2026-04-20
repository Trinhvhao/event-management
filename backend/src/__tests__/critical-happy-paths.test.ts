import request from 'supertest';
import app from '../app';
import prisma from '../config/database';

jest.mock('../services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

type AuthSession = {
  userId: number;
  token: string;
  email: string;
};

describe('Critical Regression Happy Paths', () => {
  const runId = Date.now();
  const testTag = `happy-path-${runId}`;

  let categoryId = 0;
  let departmentId = 0;

  let createdCategoryId: number | null = null;
  let createdDepartmentId: number | null = null;

  let studentSession: AuthSession;
  let organizerSession: AuthSession;
  let adminSession: AuthSession;

  let organizerDraftEventId = 0;

  const buildEventPayload = (title: string, startOffsetHours: number, durationHours: number) => {
    const start = new Date(Date.now() + startOffsetHours * 60 * 60 * 1000);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    return {
      title,
      description: `Regression flow for ${title}`,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: 'Main Hall A',
      category_id: categoryId,
      department_id: departmentId,
      capacity: 120,
      training_points: 5,
    };
  };

  const registerAndLogin = async (role: 'student' | 'organizer' | 'admin'): Promise<AuthSession> => {
    const email = `${role}.${testTag}@example.com`;
    const password = 'Password123!';

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password,
        full_name: `Regression ${role}`,
        student_id: `${role.substring(0, 3).toUpperCase()}-${runId}`,
        role,
        department_id: departmentId,
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);

    return {
      userId: loginResponse.body.data.user.id as number,
      token: loginResponse.body.data.token as string,
      email,
    };
  };

  beforeAll(async () => {
    const existingCategory = await prisma.category.findFirst({ orderBy: { id: 'asc' } });
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const category = await prisma.category.create({
        data: {
          name: `Category ${testTag}`,
          description: 'Temporary category for regression test',
        },
      });
      categoryId = category.id;
      createdCategoryId = category.id;
    }

    const existingDepartment = await prisma.department.findFirst({ orderBy: { id: 'asc' } });
    if (existingDepartment) {
      departmentId = existingDepartment.id;
    } else {
      const department = await prisma.department.create({
        data: {
          name: `Department ${testTag}`,
          code: `D${runId}`,
          description: 'Temporary department for regression test',
        },
      });
      departmentId = department.id;
      createdDepartmentId = department.id;
    }

    studentSession = await registerAndLogin('student');
    organizerSession = await registerAndLogin('organizer');
    adminSession = await registerAndLogin('admin');
  });

  afterAll(async () => {
    await prisma.event.deleteMany({
      where: {
        title: {
          contains: testTag,
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: testTag,
        },
      },
    });

    if (createdCategoryId) {
      await prisma.category.deleteMany({ where: { id: createdCategoryId } });
    }

    if (createdDepartmentId) {
      await prisma.department.deleteMany({ where: { id: createdDepartmentId } });
    }
  });

  it('Student happy path: browse event, register, see registration and notification', async () => {
    const publicEvent = await prisma.event.create({
      data: {
        title: `student-flow-${testTag}`,
        description: 'Public upcoming event for student flow',
        start_time: new Date(Date.now() + 72 * 60 * 60 * 1000),
        end_time: new Date(Date.now() + 74 * 60 * 60 * 1000),
        location: 'Student Hall',
        capacity: 150,
        training_points: 3,
        status: 'upcoming',
        organizer_id: organizerSession.userId,
        category_id: categoryId,
        department_id: departmentId,
      },
    });

    const listResponse = await request(app)
      .get('/api/events')
      .query({ search: testTag, status: 'upcoming' });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);

    const listedEvents = listResponse.body.data.items as Array<{ id: number }>;
    expect(listedEvents.some((event) => event.id === publicEvent.id)).toBe(true);

    const registerResponse = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentSession.token}`)
      .send({ event_id: publicEvent.id });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.event_id).toBe(publicEvent.id);
    expect(typeof registerResponse.body.data.qr_code).toBe('string');

    const myRegistrationsResponse = await request(app)
      .get('/api/registrations/my')
      .set('Authorization', `Bearer ${studentSession.token}`);

    expect(myRegistrationsResponse.status).toBe(200);
    expect(myRegistrationsResponse.body.success).toBe(true);

    const registrations = myRegistrationsResponse.body.data as Array<{ event_id: number; status: string }>;
    expect(
      registrations.some((registration) => registration.event_id === publicEvent.id && registration.status === 'registered')
    ).toBe(true);

    const notificationsResponse = await request(app)
      .get('/api/notifications')
      .query({ unread_only: true })
      .set('Authorization', `Bearer ${studentSession.token}`);

    expect(notificationsResponse.status).toBe(200);
    expect(notificationsResponse.body.success).toBe(true);

    const notifications = notificationsResponse.body.data.notifications as Array<{ event_id: number | null; type: string }>;
    expect(
      notifications.some((notification) => notification.event_id === publicEvent.id && notification.type === 'registration_confirm')
    ).toBe(true);
  });

  it('Organizer happy path: create, view, and update owned event', async () => {
    const createResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerSession.token}`)
      .send(buildEventPayload(`organizer-flow-${testTag}`, 96, 2));

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.status).toBe('pending');

    organizerDraftEventId = createResponse.body.data.id as number;

    const myEventsResponse = await request(app)
      .get('/api/events/my')
      .set('Authorization', `Bearer ${organizerSession.token}`);

    expect(myEventsResponse.status).toBe(200);
    expect(myEventsResponse.body.success).toBe(true);

    const myEvents = myEventsResponse.body.data as Array<{ id: number }>;
    expect(myEvents.some((event) => event.id === organizerDraftEventId)).toBe(true);

    const updateResponse = await request(app)
      .put(`/api/events/${organizerDraftEventId}`)
      .set('Authorization', `Bearer ${organizerSession.token}`)
      .send({ location: 'Updated Hall B' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.location).toBe('Updated Hall B');
  });

  it('Admin happy path: manage users and approve pending event', async () => {
    const usersResponse = await request(app)
      .get('/api/admin/users')
      .query({ search: testTag })
      .set('Authorization', `Bearer ${adminSession.token}`);

    expect(usersResponse.status).toBe(200);
    expect(usersResponse.body.success).toBe(true);

    const users = usersResponse.body.data as Array<{ id: number; email: string }>;
    expect(users.some((user) => user.email === studentSession.email)).toBe(true);
    expect(users.some((user) => user.email === organizerSession.email)).toBe(true);

    const approveResponse = await request(app)
      .put(`/api/events/${organizerDraftEventId}/approve`)
      .set('Authorization', `Bearer ${adminSession.token}`);

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.success).toBe(true);
    expect(approveResponse.body.data.status).toBe('upcoming');

    const lockResponse = await request(app)
      .put(`/api/admin/users/${studentSession.userId}/lock`)
      .set('Authorization', `Bearer ${adminSession.token}`);

    expect(lockResponse.status).toBe(200);
    expect(lockResponse.body.success).toBe(true);
    expect(lockResponse.body.data.is_active).toBe(false);

    const unlockResponse = await request(app)
      .put(`/api/admin/users/${studentSession.userId}/unlock`)
      .set('Authorization', `Bearer ${adminSession.token}`);

    expect(unlockResponse.status).toBe(200);
    expect(unlockResponse.body.success).toBe(true);
    expect(unlockResponse.body.data.is_active).toBe(true);
  });

  it('Event lifecycle path: create pending, approve, register, cancel, and verify cancellation', async () => {
    const createResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerSession.token}`)
      .send(buildEventPayload(`lifecycle-flow-${testTag}`, 120, 2));

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.status).toBe('pending');

    const lifecycleEventId = createResponse.body.data.id as number;

    const approveResponse = await request(app)
      .put(`/api/events/${lifecycleEventId}/approve`)
      .set('Authorization', `Bearer ${adminSession.token}`);

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.success).toBe(true);
    expect(approveResponse.body.data.status).toBe('upcoming');

    const registerResponse = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentSession.token}`)
      .send({ event_id: lifecycleEventId });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.status).toBe('registered');

    const registrationId = registerResponse.body.data.id as number;

    const cancelResponse = await request(app)
      .put(`/api/events/${lifecycleEventId}/cancel`)
      .set('Authorization', `Bearer ${organizerSession.token}`);

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.success).toBe(true);

    const eventResponse = await request(app).get(`/api/events/${lifecycleEventId}`);

    expect(eventResponse.status).toBe(200);
    expect(eventResponse.body.success).toBe(true);
    expect(eventResponse.body.data.status).toBe('cancelled');

    const registrationResponse = await request(app)
      .get(`/api/registrations/${registrationId}`)
      .set('Authorization', `Bearer ${studentSession.token}`);

    expect(registrationResponse.status).toBe(200);
    expect(registrationResponse.body.success).toBe(true);
    expect(registrationResponse.body.data.status).toBe('cancelled');
  });
});