import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/events.service';
import { successResponse, paginatedResponse } from '../utils/response.util';
import { ValidationError } from '../middleware/errorHandler';
import {
  getAuthenticatedUser,
  parseOptionalPositiveInt,
  parsePositiveInt,
  parseQueryInt,
} from '../utils/request.util';

export const eventController = {
  /**
   * Get all events with filters and pagination
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        department,
        status,
        search,
        is_free,
        sortBy,
        sortOrder,
      } = req.query;

      const parsedIsFree = is_free === 'true' ? true : is_free === 'false' ? false : undefined;

      const result = await eventService.getAll({
        page: parseQueryInt(page, 1, 'page', { min: 1 }),
        limit: parseQueryInt(limit, 20, 'limit', { min: 1 }),
        category: parseOptionalPositiveInt(category, 'category'),
        department: parseOptionalPositiveInt(department, 'department'),
        status: status as string,
        search: search as string,
        is_free: parsedIsFree,
        sortBy: sortBy as string | undefined,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      });

      res.json(paginatedResponse(
        result.items,
        result.total,
        result.page,
        result.pageSize
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get pending events for admin approval
   */
  async getPending(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 20,
      } = req.query;

      const result = await eventService.getPending({
        page: parseQueryInt(page, 1, 'page', { min: 1 }),
        limit: parseQueryInt(limit, 20, 'limit', { min: 1 }),
      });

      res.json(paginatedResponse(
        result.items,
        result.total,
        result.page,
        result.pageSize
      ));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get event by ID
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const eventId = parsePositiveInt(id, 'id');
      if (!Number.isInteger(eventId) || eventId <= 0) {
        throw new ValidationError('Invalid event ID');
      }

      const event = await eventService.getById(eventId, req.user ?? null);
      res.json(successResponse(event));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create new event
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await eventService.create(req.body, getAuthenticatedUser(req));
      res.status(201).json(successResponse(event, 'Event created successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update event
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const event = await eventService.update(parsePositiveInt(id, 'id'), req.body, getAuthenticatedUser(req));
      res.json(successResponse(event, 'Event updated successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete event
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await eventService.delete(parsePositiveInt(id, 'id'), getAuthenticatedUser(req));
      res.json(successResponse(null, 'Event deleted successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get categories
   */
  async getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await eventService.getCategories();
      res.json(successResponse(categories));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get departments
   */
  async getDepartments(_req: Request, res: Response, next: NextFunction) {
    try {
      const departments = await eventService.getDepartments();
      res.json(successResponse(departments));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Lấy danh sách sự kiện của organizer hiện tại
   */
  async getMyEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await eventService.getMyEvents(getAuthenticatedUser(req).id);
      res.json(successResponse(events));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Hủy sự kiện — chuyển status cancelled + thông báo hàng loạt
   */
  async cancelEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await eventService.cancelEvent(parsePositiveInt(id, 'id'), getAuthenticatedUser(req));
      res.json(successResponse(result, 'Đã hủy sự kiện'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Approve pending event (admin)
   */
  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const eventId = parsePositiveInt(id, 'id');
      if (!Number.isInteger(eventId) || eventId <= 0) {
        throw new ValidationError('Invalid event ID');
      }

      const event = await eventService.approve(eventId, getAuthenticatedUser(req));
      res.json(successResponse(event, 'Event approved successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Reject pending event (admin)
   */
  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const eventId = parsePositiveInt(id, 'id');
      if (!Number.isInteger(eventId) || eventId <= 0) {
        throw new ValidationError('Invalid event ID');
      }

      const reason = req.body?.reason as string | undefined;
      const event = await eventService.reject(eventId, getAuthenticatedUser(req), reason);
      res.json(successResponse(event, 'Event rejected successfully'));
    } catch (error) {
      next(error);
    }
  },
};
