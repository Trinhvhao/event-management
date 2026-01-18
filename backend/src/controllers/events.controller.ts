import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/events.service';
import { successResponse, paginatedResponse } from '../utils/response.util';

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
        search 
      } = req.query;

      const result = await eventService.getAll({
        page: Number(page),
        limit: Number(limit),
        category: category as string,
        department: department as string,
        status: status as string,
        search: search as string
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
      const event = await eventService.getById(Number(id));
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
      const event = await eventService.create(req.body, req.user!);
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
      const event = await eventService.update(Number(id), req.body, req.user!);
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
      await eventService.delete(Number(id), req.user!);
      res.json(successResponse(null, 'Event deleted successfully'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all categories
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
   * Get all departments
   */
  async getDepartments(_req: Request, res: Response, next: NextFunction) {
    try {
      const departments = await eventService.getDepartments();
      res.json(successResponse(departments));
    } catch (error) {
      next(error);
    }
  },
};
