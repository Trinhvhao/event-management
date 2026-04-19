import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user has admin role
 * Must be used after auth middleware
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required. You do not have permission to perform this action.',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user has organizer or admin role
 */
export const requireOrganizer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Organizer access required',
    });
    return;
  }

  next();
};
