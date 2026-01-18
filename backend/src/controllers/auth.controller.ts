import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse } from '../utils/response.util';

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
};
