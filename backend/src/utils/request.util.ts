import { Request } from 'express';
import { UnauthorizedError, ValidationError } from '../middleware/errorHandler';

type QueryIntOptions = {
  min?: number;
  max?: number;
};

export const getAuthenticatedUser = (req: Request): NonNullable<Request['user']> => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  return req.user;
};

export const getQueryString = (param: unknown): string | undefined => {
  if (typeof param === 'string') return param;
  if (Array.isArray(param) && typeof param[0] === 'string') return param[0];
  return undefined;
};

export const parsePositiveInt = (value: unknown, fieldName: string): number => {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }

  return parsed;
};

export const parseOptionalPositiveInt = (
  value: unknown,
  fieldName: string
): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return parsePositiveInt(value, fieldName);
};

export const parseQueryInt = (
  value: unknown,
  defaultValue: number,
  fieldName: string,
  options: QueryIntOptions = {}
): number => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new ValidationError(`${fieldName} must be >= ${options.min}`);
  }

  if (options.max !== undefined && parsed > options.max) {
    throw new ValidationError(`${fieldName} must be <= ${options.max}`);
  }

  return parsed;
};