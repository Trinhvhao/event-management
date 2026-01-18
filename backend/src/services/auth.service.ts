import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { jwtConfig } from '../config/jwt';
import { UnauthorizedError, ConflictError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

export const authService = {
  /**
   * Register new user
   */
  async register(data: {
    email: string;
    password: string;
    full_name: string;
    student_id?: string;
    role: UserRole;
    department_id?: number;
  }) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Check if student_id already exists (if provided)
    if (data.student_id) {
      const existingStudent = await prisma.user.findUnique({
        where: { student_id: data.student_id },
      });

      if (existingStudent) {
        throw new ConflictError('Student ID already registered');
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password_hash,
        full_name: data.full_name,
        student_id: data.student_id,
        role: data.role,
        department_id: data.department_id,
        email_verified: false,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        student_id: true,
        role: true,
        department_id: true,
        created_at: true,
      },
    });

    // TODO: Send verification email
    // await emailService.sendVerificationEmail(user.email, verificationToken);

    return {
      user,
      message: 'Please check your email to verify your account',
    };
  },

  /**
   * Login user
   */
  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedError('Account is deactivated. Please contact administrator.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn } as jwt.SignOptions
    );

    // Return user data and token
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        student_id: user.student_id,
        role: user.role,
        department: user.department,
        email_verified: user.email_verified,
      },
    };
  },

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not (security)
      return;
    }

    // Generate reset token
    jwt.sign(
      { id: user.id, email: user.email },
      jwtConfig.secret,
      { expiresIn: '1h' } as jwt.SignOptions
    );

    // TODO: Send reset email
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    return;
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      // Verify token
      const decoded = jwt.verify(token, jwtConfig.secret) as {
        id: number;
        email: string;
      };

      // Hash new password
      const password_hash = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: decoded.id },
        data: { password_hash },
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Reset token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid reset token');
      }
      throw error;
    }
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string) {
    try {
      // Verify token
      const decoded = jwt.verify(token, jwtConfig.secret) as {
        id: number;
        email: string;
      };

      // Update email_verified
      await prisma.user.update({
        where: { id: decoded.id },
        data: { email_verified: true },
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Verification token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid verification token');
      }
      throw error;
    }
  },

  /**
   * Refresh JWT token
   */
  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, jwtConfig.secret) as {
        id: number;
        email: string;
        role: UserRole;
      };

      // Generate new token
      const newToken = jwt.sign(
        {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn } as jwt.SignOptions
      );

      return { token: newToken };
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  },
};
