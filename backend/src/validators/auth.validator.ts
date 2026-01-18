import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';

// Register Schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(255, 'Full name is too long'),
  student_id: z.string().optional(),
  role: z.enum(['student', 'organizer', 'admin'] as const),
  department_id: z.number().int().positive().optional(),
});

// Login Schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Forgot Password Schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Reset Password Schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
});

// Validate Register
export const validateRegister = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const validated = registerSchema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid registration data', error.issues));
    } else {
      next(error);
    }
  }
};

// Validate Login
export const validateLogin = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const validated = loginSchema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid login data', error.issues));
    } else {
      next(error);
    }
  }
};

// Validate Forgot Password
export const validateForgotPassword = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const validated = forgotPasswordSchema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid email', error.issues));
    } else {
      next(error);
    }
  }
};

// Validate Reset Password
export const validateResetPassword = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const validated = resetPasswordSchema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid reset password data', error.issues));
    } else {
      next(error);
    }
  }
};
