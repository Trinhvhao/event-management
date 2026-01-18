import prisma from '../config/database';
import { NotFoundError, ConflictError, ForbiddenError } from '../middleware/errorHandler';
import { EventStatus } from '@prisma/client';

export const eventService = {
  /**
   * Get all events with filters and pagination
   */
  async getAll(filters: {
    page: number;
    limit: number;
    category?: string;
    department?: string;
    status?: string;
    search?: string;
  }) {
    const { page, limit, category, department, status, search } = filters;

    // Build where clause
    const where: any = {};
    
    if (category) where.category_id = Number(category);
    if (department) where.department_id = Number(department);
    if (status) where.status = status as EventStatus;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Execute queries in parallel
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: true,
          department: true,
          organizer: {
            select: { id: true, full_name: true, email: true }
          },
          _count: { select: { registrations: true } }
        },
        orderBy: { start_time: 'desc' }
      }),
      prisma.event.count({ where })
    ]);

    return {
      items: events,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Get event by ID
   */
  async getById(id: number) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        department: true,
        organizer: {
          select: { id: true, full_name: true, email: true }
        },
        _count: {
          select: { registrations: true, feedback: true }
        }
      }
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    return event;
  },

  /**
   * Create new event
   */
  async create(data: any, user: { id: number; role: string }) {
    // Determine status based on start_time
    const now = new Date();
    const startTime = new Date(data.start_time);
    const endTime = new Date(data.end_time);

    let status: EventStatus = 'upcoming';
    if (startTime <= now && endTime > now) {
      status = 'ongoing';
    } else if (endTime <= now) {
      status = 'completed';
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        ...data,
        organizer_id: user.id,
        status
      },
      include: {
        category: true,
        department: true,
        organizer: {
          select: { id: true, full_name: true, email: true }
        }
      }
    });

    return event;
  },

  /**
   * Update event
   */
  async update(id: number, data: any, user: { id: number; role: string }) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: { select: { registrations: true } }
      }
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    // Check ownership
    if (event.organizer_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('You can only update your own events');
    }

    // Business rule: Cannot reduce capacity below current registrations
    if (data.capacity && data.capacity < event._count.registrations) {
      throw new ConflictError(
        `Cannot reduce capacity below current registrations (${event._count.registrations})`
      );
    }

    // Update event
    const updated = await prisma.event.update({
      where: { id },
      data,
      include: {
        category: true,
        department: true,
        organizer: {
          select: { id: true, full_name: true, email: true }
        }
      }
    });

    // TODO: Send notifications to registered students
    // await notificationService.notifyEventUpdate(id);

    return updated;
  },

  /**
   * Delete event
   */
  async delete(id: number, user: { id: number; role: string }) {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: { select: { registrations: true } }
      }
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    // Check ownership
    if (event.organizer_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('You can only delete your own events');
    }

    // Business rule: Cannot delete event with registrations
    if (event._count.registrations > 0) {
      throw new ConflictError(
        'Cannot delete event with existing registrations. Please cancel all registrations first.'
      );
    }

    // Delete event
    await prisma.event.delete({ where: { id } });
  },

  /**
   * Get all categories
   */
  async getCategories() {
    return await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
  },

  /**
   * Get all departments
   */
  async getDepartments() {
    return await prisma.department.findMany({
      orderBy: { name: 'asc' }
    });
  },

  /**
   * Update event statuses (called by cron job)
   */
  async updateStatuses() {
    const now = new Date();

    // Update to "ongoing"
    await prisma.event.updateMany({
      where: {
        start_time: { lte: now },
        end_time: { gt: now },
        status: 'upcoming'
      },
      data: { status: 'ongoing' }
    });

    // Update to "completed"
    await prisma.event.updateMany({
      where: {
        end_time: { lte: now },
        status: { in: ['upcoming', 'ongoing'] }
      },
      data: { status: 'completed' }
    });
  }
};
