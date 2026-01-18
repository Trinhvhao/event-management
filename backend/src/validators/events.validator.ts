import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';

// Base Event Schema (without refinements)
const baseEventSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  description: z.string().max(5000).optional(),
  start_time: z.string().datetime('Invalid datetime format'),
  end_time: z.string().datetime('Invalid datetime format'),
  location: z.string().min(1, 'Location is required').max(255),
  category_id: z.number().int().positive('Invalid category ID'),
  department_id: z.number().int().positive('Invalid department ID'),
  capacity: z.number().int().positive('Capacity must be positive'),
  training_points: z.number().int().min(0, 'Training points cannot be negative'),
  image_url: z.string().url().optional()
});

// Create Event Schema (with refinements)
export const createEventSchema = baseEventSchema.refine(
  data => new Date(data.end_time) > new Date(data.start_time),
  { message: 'End time must be after start time', path: ['end_time'] }
);

// Update Event Schema (all fields optional, with conditional refinement)
export const updateEventSchema = baseEventSchema.partial().refine(
  data => {
    // Only validate if both start_time and end_time are provided
    if (data.start_time && data.end_time) {
      return new Date(data.end_time) > new Date(data.start_time);
    }
    return true;
  },
  { message: 'End time must be after start time', path: ['end_time'] }
);

// Validate Create Event
export const validateCreateEvent = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const validated = createEventSchema.parse(req.body);
    req.body = validated; // Replace with validated data
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid event data', error.issues));
    } else {
      next(error);
    }
  }
};

// Validate Update Event
export const validateUpdateEvent = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const validated = updateEventSchema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid event data', error.issues));
    } else {
      next(error);
    }
  }
};
