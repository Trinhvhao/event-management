import prisma from '../config/database';
import { NotFoundError, ConflictError, ForbiddenError } from '../middleware/errorHandler';
import { EventStatus } from '@prisma/client';
import { createNotification } from './notifications.service';

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
    if (status === 'upcoming') {
      where.status = 'upcoming' as EventStatus;
    } else if (status) {
      where.status = status as EventStatus;
    } else {
      where.status = { not: 'pending' as any };
    }

    where.deleted_at = null;

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
   * Get pending events for admin review
   */
  async getPending(filters: { page: number; limit: number }) {
    const { page, limit } = filters;

    const where: any = {
      status: 'pending',
      deleted_at: null,
    };

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
        orderBy: { created_at: 'asc' }
      }),
      prisma.event.count({ where }),
    ]);

    return {
      items: events,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
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

    let status: any = 'upcoming';
    if (user.role !== 'admin') {
      status = 'pending';
    } else if (startTime <= now && endTime > now) {
      status = 'ongoing';
    } else if (endTime <= now) {
      status = 'completed';
    } else {
      status = 'upcoming';
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
   * Approve a pending event
   */
  async approve(id: number, user: { id: number; role: string }) {
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only admin can approve events');
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || event.deleted_at) {
      throw new NotFoundError('Event');
    }
    if (event.status !== ('pending' as any)) {
      throw new ConflictError('Event is not pending approval');
    }

    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);

    let approvedStatus: any = 'upcoming';
    if (startTime <= now && endTime > now) {
      approvedStatus = 'ongoing';
    } else if (endTime <= now) {
      approvedStatus = 'completed';
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: approvedStatus,
      },
      include: {
        category: true,
        department: true,
        organizer: {
          select: { id: true, full_name: true, email: true }
        },
      },
    });

    createNotification({
      user_id: updated.organizer_id,
      event_id: updated.id,
      title: `Sự kiện đã được duyệt: ${updated.title}`,
      message: `Sự kiện "${updated.title}" đã được phê duyệt và hiển thị trong hệ thống.`,
      type: 'event_update',
    }).catch(() => { });

    return updated;
  },

  /**
   * Reject a pending event
   */
  async reject(id: number, user: { id: number; role: string }, reason?: string) {
    if (user.role !== 'admin') {
      throw new ForbiddenError('Only admin can reject events');
    }

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || event.deleted_at) {
      throw new NotFoundError('Event');
    }
    if (event.status !== ('pending' as any)) {
      throw new ConflictError('Event is not pending approval');
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: 'cancelled',
      },
      include: {
        category: true,
        department: true,
        organizer: {
          select: { id: true, full_name: true, email: true }
        },
      },
    });

    createNotification({
      user_id: updated.organizer_id,
      event_id: updated.id,
      title: `Sự kiện bị từ chối: ${updated.title}`,
      message: reason
        ? `Sự kiện "${updated.title}" chưa được duyệt. Lý do: ${reason}`
        : `Sự kiện "${updated.title}" chưa được duyệt. Vui lòng cập nhật thông tin và gửi lại.`,
      type: 'event_update',
    }).catch(() => { });

    return updated;
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

    // Gửi thông báo cho tất cả người đã đăng ký khi sự kiện được cập nhật
    const registrations = await prisma.registration.findMany({
      where: { event_id: id, status: 'registered' },
      select: { user_id: true },
    });
    for (const reg of registrations) {
      createNotification({
        user_id: reg.user_id,
        event_id: id,
        title: `Sự kiện đã cập nhật: ${updated.title}`,
        message: `Sự kiện "${updated.title}" vừa được cập nhật thông tin. Vui lòng kiểm tra lại.`,
        type: 'event_update',
      }).catch(() => { });
    }

    return updated;
  },

  /**
   * Hủy sự kiện — chuyển status → cancelled
   * Tự động hủy tất cả registrations + gửi notification hàng loạt
   */
  async cancelEvent(id: number, user: { id: number; role: string }) {
    const event = await prisma.event.findUnique({
      where: { id },
    });
    if (!event) throw new NotFoundError('Event');
    if (event.organizer_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Bạn chỉ có thể hủy sự kiện của mình');
    }
    if (event.status === 'cancelled') {
      throw new ConflictError('Sự kiện đã bị hủy trước đó');
    }
    if (event.status === 'completed') {
      throw new ConflictError('Không thể hủy sự kiện đã kết thúc');
    }

    // Lấy danh sách người đăng ký trước khi hủy
    const registrations = await prisma.registration.findMany({
      where: { event_id: id, status: 'registered' },
      select: { user_id: true },
    });

    // Cập nhật status event → cancelled + hủy tất cả registrations
    await prisma.$transaction([
      prisma.event.update({ where: { id }, data: { status: 'cancelled' } }),
      prisma.registration.updateMany({
        where: { event_id: id, status: 'registered' },
        data: { status: 'cancelled' },
      }),
    ]);

    // Gửi notification cho tất cả người đã đăng ký
    for (const reg of registrations) {
      createNotification({
        user_id: reg.user_id,
        event_id: id,
        title: `Sự kiện đã bị hủy: ${event.title}`,
        message: `Sự kiện "${event.title}" đã bị hủy. Xin lỗi vì sự bất tiện.`,
        type: 'event_cancelled',
      }).catch(() => { });
    }

    return { message: `Đã hủy sự kiện và thông báo ${registrations.length} người đăng ký` };
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

    // Soft delete event
    await prisma.event.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
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
   * Lấy danh sách khoa/phòng ban
   */
  async getDepartments() {
    return await prisma.department.findMany({
      orderBy: { name: 'asc' }
    });
  },

  /**
   * Lấy danh sách sự kiện do 1 organizer tạo
   * Dùng cho trang "Sự kiện của tôi" của organizer
   */
  async getMyEvents(organizerId: number) {
    return prisma.event.findMany({
      where: { organizer_id: organizerId },
      include: {
        category: true,
        department: true,
        _count: { select: { registrations: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  },

  /**
   * Update event statuses (called by cron job)
   */
  async updateStatuses() {
    const now = new Date();

    // Lấy events sắp chuyển sang completed (để gửi feedback request)
    const completingEvents = await prisma.event.findMany({
      where: {
        end_time: { lte: now },
        status: { in: ['upcoming', 'ongoing'] },
      },
      select: { id: true, title: true },
    });

    // Update to "ongoing"
    await prisma.event.updateMany({
      where: {
        start_time: { lte: now },
        end_time: { gt: now },
        status: 'upcoming',
        deleted_at: null
      },
      data: { status: 'ongoing' }
    });

    // Update to "completed"
    await prisma.event.updateMany({
      where: {
        end_time: { lte: now },
        status: { in: ['upcoming', 'ongoing'] },
      },
      data: { status: 'completed' }
    });

    // Gửi feedback_request cho người đã check-in ở events vừa completed
    for (const event of completingEvents) {
      const attendances = await prisma.attendance.findMany({
        where: { registration: { event_id: event.id } },
        select: { registration: { select: { user_id: true } } },
      });
      for (const att of attendances) {
        createNotification({
          user_id: att.registration.user_id,
          event_id: event.id,
          title: `Đánh giá sự kiện: ${event.title}`,
          message: `Sự kiện "${event.title}" đã kết thúc. Hãy đánh giá trải nghiệm của bạn!`,
          type: 'feedback_request',
        }).catch(() => { });
      }
    }
  },

  /**
   * Gửi nhắc nhở cho events bắt đầu trong 24h tới
   * Gọi bởi cron job mỗi giờ
   */
  async sendReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Tìm events bắt đầu trong 24h tới và chưa bị hủy
    const events = await prisma.event.findMany({
      where: {
        start_time: { gt: now, lte: in24h },
        status: 'upcoming',
      },
      select: { id: true, title: true, start_time: true, location: true },
    });

    for (const event of events) {
      const registrations = await prisma.registration.findMany({
        where: { event_id: event.id, status: 'registered' },
        select: { user_id: true },
      });

      for (const reg of registrations) {
        createNotification({
          user_id: reg.user_id,
          event_id: event.id,
          title: `Nhắc nhở: ${event.title}`,
          message: `Sự kiện "${event.title}" sẽ diễn ra trong 24h nữa tại ${event.location}. Đừng quên mang mã QR!`,
          type: 'event_reminder',
        }).catch(() => { });
      }
    }
  },
};

