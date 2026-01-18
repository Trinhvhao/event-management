import request from 'supertest';
import app from '../app';
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';

describe('Auth Module Tests', () => {
  // Clean up test data before each test
  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new student successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test.student@university.edu.vn',
          password: 'password123',
          full_name: 'Test Student',
          student_id: 'SV001',
          role: 'student',
          department_id: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('test.student@university.edu.vn');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should fail with duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test.duplicate@university.edu.vn',
          password: 'password123',
          full_name: 'Test User',
          role: 'student',
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test.duplicate@university.edu.vn',
          password: 'password456',
          full_name: 'Another User',
          role: 'student',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email already registered');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          full_name: 'Test User',
          role: 'student',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@university.edu.vn',
          password: '123',
          full_name: 'Test User',
          role: 'student',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should hash password correctly', async () => {
      const password = 'password123';
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test.hash@university.edu.vn',
          password,
          full_name: 'Test User',
          role: 'student',
        });

      const user = await prisma.user.findUnique({
        where: { email: 'test.hash@university.edu.vn' },
      });

      expect(user).toBeTruthy();
      expect(user!.password_hash).not.toBe(password);
      const isValid = await bcrypt.compare(password, user!.password_hash);
      expect(isValid).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const password_hash = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          email: 'test.login@university.edu.vn',
          password_hash,
          full_name: 'Test User',
          role: 'student',
          is_active: true,
        },
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.login@university.edu.vn',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('test.login@university.edu.vn');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.login@university.edu.vn',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@university.edu.vn',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail for inactive user', async () => {
      // Create inactive user
      const password_hash = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          email: 'test.inactive@university.edu.vn',
          password_hash,
          full_name: 'Inactive User',
          role: 'student',
          is_active: false,
        },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.inactive@university.edu.vn',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('deactivated');
    });

    it('should return valid JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.login@university.edu.vn',
          password: 'password123',
        });

      const token = response.body.data.token;
      const decoded = jwt.verify(token, jwtConfig.secret) as any;

      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('role');
      expect(decoded.email).toBe('test.login@university.edu.vn');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      const password_hash = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          email: 'test.forgot@university.edu.vn',
          password_hash,
          full_name: 'Test User',
          role: 'student',
        },
      });
    });

    it('should accept valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test.forgot@university.edu.vn',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@university.edu.vn',
        });

      // Should still return success for security
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;
    let userId: number;

    beforeEach(async () => {
      const password_hash = await bcrypt.hash('oldpassword', 10);
      const user = await prisma.user.create({
        data: {
          email: 'test.reset@university.edu.vn',
          password_hash,
          full_name: 'Test User',
          role: 'student',
        },
      });
      userId = user.id;

      // Generate reset token
      resetToken = jwt.sign(
        { id: user.id, email: user.email },
        jwtConfig.secret,
        { expiresIn: '1h' }
      );
    });

    it('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify password was changed
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const isValid = await bcrypt.compare('newpassword123', user!.password_hash);
      expect(isValid).toBe(true);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: userId, email: 'test.reset@university.edu.vn' },
        jwtConfig.secret,
        { expiresIn: '0s' }
      );

      // Wait a bit to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('expired');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const password_hash = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          email: 'test.refresh@university.edu.vn',
          password_hash,
          full_name: 'Test User',
          role: 'student',
        },
      });

      refreshToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        jwtConfig.secret,
        { expiresIn: '7d' }
      );
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
