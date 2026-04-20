import { Prisma } from '@prisma/client';
import prisma from '../config/database';

type AdminStatisticsFilters = {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: number;
  categoryId?: number;
};

type MetricsPayload = {
  totalUsers: number;
  totalEvents: number;
  totalRegistrations: number;
  activeOrganizers: number;
};

type TrendPayload = {
  value: number;
  percentage: number;
  direction: 'up' | 'down' | 'neutral';
};

const toDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return parsed;
};

const buildEventWhere = (
  filters: AdminStatisticsFilters,
  range?: { from?: Date; to?: Date }
): Prisma.EventWhereInput => {
  const dateFrom = range?.from || toDate(filters.dateFrom);
  const dateTo = range?.to || toDate(filters.dateTo);

  const where: Prisma.EventWhereInput = {
    deleted_at: null,
  };

  if (filters.departmentId) {
    where.department_id = filters.departmentId;
  }

  if (filters.categoryId) {
    where.category_id = filters.categoryId;
  }

  if (dateFrom || dateTo) {
    where.start_time = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  return where;
};

const buildUserWhere = (
  filters: AdminStatisticsFilters,
  range?: { from?: Date; to?: Date }
): Prisma.UserWhereInput => {
  const where: Prisma.UserWhereInput = {
    ...(filters.departmentId ? { department_id: filters.departmentId } : {}),
  };

  if (range?.from || range?.to) {
    where.created_at = {
      ...(range?.from ? { gte: range.from } : {}),
      ...(range?.to ? { lte: range.to } : {}),
    };
  }

  return where;
};

const getPreviousRange = (
  from?: Date,
  to?: Date
): { from?: Date; to?: Date } => {
  if (!from || !to || to <= from) return {};

  const durationMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - durationMs);

  return { from: previousFrom, to: previousTo };
};

const toTrend = (current: number, previous: number): TrendPayload => {
  const delta = current - previous;
  if (previous === 0) {
    return {
      value: delta,
      percentage: current > 0 ? 100 : 0,
      direction: current > 0 ? 'up' : 'neutral',
    };
  }

  const percentage = Number((((delta / previous) * 100)).toFixed(1));
  return {
    value: delta,
    percentage,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
  };
};

const getMetrics = async (
  filters: AdminStatisticsFilters,
  range?: { from?: Date; to?: Date }
): Promise<MetricsPayload> => {
  const eventWhere = buildEventWhere(filters, range);
  const userWhere = buildUserWhere(filters, range);

  const [totalUsers, totalEvents, totalRegistrations, activeOrganizers] = await Promise.all([
    prisma.user.count({ where: userWhere }),
    prisma.event.count({ where: eventWhere }),
    prisma.registration.count({
      where: {
        status: 'registered',
        event: eventWhere,
      },
    }),
    prisma.user.count({
      where: {
        ...userWhere,
        role: 'organizer',
        is_active: true,
      },
    }),
  ]);

  return {
    totalUsers,
    totalEvents,
    totalRegistrations,
    activeOrganizers,
  };
};

const buildRegistrationTrend = async (
  filters: AdminStatisticsFilters
): Promise<Array<{ date: string; count: number }>> => {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  const from = toDate(filters.dateFrom) || defaultFrom;
  const to = toDate(filters.dateTo) || now;

  const registrations = await prisma.registration.findMany({
    where: {
      status: 'registered',
      registered_at: {
        gte: from,
        lte: to,
      },
      event: buildEventWhere({
        ...filters,
      }),
    },
    select: {
      registered_at: true,
    },
  });

  const bucket = new Map<string, number>();
  for (const row of registrations) {
    const key = row.registered_at.toISOString().slice(0, 10);
    bucket.set(key, (bucket.get(key) || 0) + 1);
  }

  const trend: Array<{ date: string; count: number }> = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    trend.push({ date: key, count: bucket.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return trend;
};

export const adminStatisticsService = {
  async getDashboard(filters: AdminStatisticsFilters) {
    const currentFrom = toDate(filters.dateFrom);
    const currentTo = toDate(filters.dateTo);
    const current = await getMetrics(filters, {
      from: currentFrom,
      to: currentTo,
    });

    let trends: Record<keyof MetricsPayload, TrendPayload> = {
      totalUsers: { value: 0, percentage: 0, direction: 'neutral' },
      totalEvents: { value: 0, percentage: 0, direction: 'neutral' },
      totalRegistrations: { value: 0, percentage: 0, direction: 'neutral' },
      activeOrganizers: { value: 0, percentage: 0, direction: 'neutral' },
    };

    const previousRange = getPreviousRange(currentFrom, currentTo);
    if (previousRange.from && previousRange.to) {
      const previous = await getMetrics(filters, previousRange);
      trends = {
        totalUsers: toTrend(current.totalUsers, previous.totalUsers),
        totalEvents: toTrend(current.totalEvents, previous.totalEvents),
        totalRegistrations: toTrend(current.totalRegistrations, previous.totalRegistrations),
        activeOrganizers: toTrend(current.activeOrganizers, previous.activeOrganizers),
      };
    }

    return {
      metrics: current,
      trends,
    };
  },

  async getCharts(filters: AdminStatisticsFilters) {
    const eventWhere = buildEventWhere(filters);

    const [
      userRegistrationTrend,
      eventsByCategoryRaw,
      statusRaw,
      departments,
    ] = await Promise.all([
      buildRegistrationTrend(filters),
      prisma.event.groupBy({
        by: ['category_id'],
        where: eventWhere,
        _count: { _all: true },
      }),
      prisma.event.groupBy({
        by: ['status'],
        where: eventWhere,
        _count: { _all: true },
      }),
      prisma.department.findMany({
        where: filters.departmentId ? { id: filters.departmentId } : undefined,
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const categories = await prisma.category.findMany({
      where: {
        id: {
          in: eventsByCategoryRaw.map((item) => item.category_id),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const eventsByCategory = eventsByCategoryRaw.map((item) => {
      const category = categories.find((c) => c.id === item.category_id);
      return {
        categoryId: String(item.category_id),
        categoryName: category?.name || `Category ${item.category_id}`,
        count: item._count._all,
      };
    });

    const baseWhereWithoutDepartment = buildEventWhere({
      ...filters,
      departmentId: undefined,
    });

    const registrationsByDepartment = await Promise.all(
      departments.map(async (department) => {
        const count = await prisma.registration.count({
          where: {
            status: 'registered',
            event: {
              ...baseWhereWithoutDepartment,
              department_id: department.id,
            },
          },
        });

        return {
          departmentId: String(department.id),
          departmentName: department.name,
          count,
        };
      })
    );

    const totalStatus = statusRaw.reduce((sum, item) => sum + item._count._all, 0);
    const eventStatusDistribution = statusRaw.map((item) => ({
      status: item.status,
      count: item._count._all,
      percentage:
        totalStatus > 0
          ? Number((((item._count._all / totalStatus) * 100)).toFixed(1))
          : 0,
    }));

    return {
      userRegistrationTrend,
      eventsByCategory,
      registrationsByDepartment,
      eventStatusDistribution,
    };
  },
};
