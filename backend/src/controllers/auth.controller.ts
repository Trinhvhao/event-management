import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse } from '../utils/response.util';
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import { getAuthenticatedUser, parseOptionalPositiveInt } from '../utils/request.util';

export const authController = {
  /**
   * Register new user
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(successResponse(result, 'Registration successful. Please check your email to verify your account.'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Login user
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(successResponse(result, 'Login successful'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Logout user
   */
  async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      // In JWT-based auth, logout is typically handled client-side
      // But we can add token to blacklist if needed
      res.json(successResponse(null, 'Logout successful'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      res.json(successResponse(null, 'Password reset email sent. Please check your inbox.'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      res.json(successResponse(null, 'Password reset successful. You can now login with your new password.'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify email with token
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      await authService.verifyEmail(token as string);
      res.json(successResponse(null, 'Email verified successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Refresh JWT token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      res.json(successResponse(result, 'Token refreshed successfully'));
    } catch (error) {
      next(error);
    }
  },
  /**
   * Lấy thông tin profile của user hiện tại
   */
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = getAuthenticatedUser(req);
      const user = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: {
          id: true, email: true, full_name: true, student_id: true,
          role: true, is_active: true, email_verified: true,
          department_id: true, created_at: true,
          department: { select: { id: true, name: true } },
        },
      });
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Cập nhật thông tin profile
   * User chỉ được đổi: full_name, department_id
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = getAuthenticatedUser(req);
      const { full_name, department_id } = req.body;
      const updated = await prisma.user.update({
        where: { id: currentUser.id },
        data: { full_name, department_id: parseOptionalPositiveInt(department_id, 'department_id') },
        select: {
          id: true, email: true, full_name: true, student_id: true,
          role: true, is_active: true, department_id: true,
          department: { select: { id: true, name: true } },
        },
      });
      res.json(successResponse(updated, 'Profile updated'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Đổi mật khẩu (user đã đăng nhập)
   * Verify mật khẩu cũ trước khi đổi
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentUser = getAuthenticatedUser(req);
      const { old_password, new_password } = req.body;
      if (!old_password || !new_password) {
        res.status(400).json({ success: false, error: { message: 'Thiếu mật khẩu cũ hoặc mới' } });
        return;
      }
      if (new_password.length < 6) {
        res.status(400).json({ success: false, error: { message: 'Mật khẩu mới phải từ 6 ký tự' } });
        return;
      }
      // Lấy user từ DB (để lấy password_hash)
      const user = await prisma.user.findUnique({ where: { id: currentUser.id } });
      if (!user) {
        res.status(404).json({ success: false, error: { message: 'User not found' } });
        return;
      }

      // Verify mật khẩu cũ
      const isValid = await bcrypt.compare(old_password, user.password_hash);
      if (!isValid) {
        res.status(400).json({ success: false, error: { message: 'Mật khẩu cũ không đúng' } });
        return;
      }

      // Hash và lưu mật khẩu mới
      const password_hash = await bcrypt.hash(new_password, 10);
      await prisma.user.update({ where: { id: currentUser.id }, data: { password_hash } });

      res.json(successResponse(null, 'Đổi mật khẩu thành công'));
    } catch (error) {
      next(error);
    }
  },
};
