import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { UnauthorizedError } from './errorHandler';
import { UserRole } from '@prisma/client';

type JwtUserPayload = jwt.JwtPayload & {
  id: number;
  email?: string;
  role: UserRole;
  type?: string;
};

const isUserRole = (role: unknown): role is UserRole => {
  return role === 'admin' || role === 'organizer' || role === 'student';
};

const isJwtUserPayload = (payload: string | jwt.JwtPayload): payload is JwtUserPayload => {
  if (typeof payload === 'string') return false;

  return (
    typeof payload.id === 'number' &&
    isUserRole(payload.role)
  );
};

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, jwtConfig.secret);

    if (!isJwtUserPayload(decoded)) {
      throw new UnauthorizedError('Invalid token payload');
    }

    if (decoded.type === 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    req.user = {
      id: decoded.id,
      email: typeof decoded.email === 'string' ? decoded.email : '',
      role: decoded.role,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
};

export const authenticateOptional = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtConfig.secret);

    if (!isJwtUserPayload(decoded) || decoded.type === 'refresh') {
      next();
      return;
    }

    req.user = {
      id: decoded.id,
      email: typeof decoded.email === 'string' ? decoded.email : '',
      role: decoded.role,
    };
    next();
  } catch {
    next();
  }
};
