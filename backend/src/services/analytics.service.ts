import prisma from '../config/database';

export const analyticsService = {
    /**
     * Get time-series analytics data for charts
     * @param timeRange - 'week', 'month', or 'year'
     */
    async getTimeSeriesAnalytics(timeRange: 'week' | 'month' | 'year' = 'month') {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;
        const weekdayPeriods = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        let periodKeys: string[] = [];

        // Determine date range and grouping based on timeRange
        if (timeRange === 'week') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);

            periodKeys = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                return weekdayPeriods[d.getDay()];
            });
        } else if (timeRange === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            periodKeys = Array.from({ length: 6 }, (_, i) => {
                const monthIndex = (startDate.getMonth() + i) % 12;
                return `T${monthIndex + 1}`;
            });
        } else {
            // Last 12 months including current month
            startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            periodKeys = Array.from({ length: 12 }, (_, i) => {
                const monthIndex = (startDate.getMonth() + i) % 12;
                return `T${monthIndex + 1}`;
            });
        }

        // Get events grouped by time period
        const events = await prisma.event.findMany({
            where: {
                deleted_at: null,
                start_time: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                id: true,
                start_time: true,
                _count: {
                    select: {
                        registrations: true,
                    },
                },
            },
        });

        // Get attendances
        const attendances = await prisma.attendance.findMany({
            where: {
                checked_in_at: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                checked_in_at: true,
            },
        });

        // Group data by period
        const dataByPeriod = new Map<string, { events: number; registrations: number; checkins: number }>();

        // Initialize all periods with 0 in chronological order.
        for (const key of periodKeys) {
            dataByPeriod.set(key, { events: 0, registrations: 0, checkins: 0 });
        }

        // Count events and registrations
        events.forEach((event) => {
            const date = new Date(event.start_time);
            let periodKey: string;

            if (timeRange === 'week') {
                const dayOfWeek = date.getDay();
                periodKey = weekdayPeriods[dayOfWeek];
            } else {
                const month = date.getMonth();
                periodKey = `T${month + 1}`;
            }

            const current = dataByPeriod.get(periodKey);
            if (!current) {
                return;
            }

            current.events += 1;
            current.registrations += event._count.registrations;
            dataByPeriod.set(periodKey, current);
        });

        // Count check-ins
        attendances.forEach((attendance) => {
            const date = new Date(attendance.checked_in_at);
            let periodKey: string;

            if (timeRange === 'week') {
                const dayOfWeek = date.getDay();
                periodKey = weekdayPeriods[dayOfWeek];
            } else {
                const month = date.getMonth();
                periodKey = `T${month + 1}`;
            }

            const current = dataByPeriod.get(periodKey);
            if (current) {
                current.checkins += 1;
                dataByPeriod.set(periodKey, current);
            }
        });

        // Convert to array format for charts while preserving intended period order.
        const chartData = periodKeys.map((period) => {
            const data = dataByPeriod.get(period) || { events: 0, registrations: 0, checkins: 0 };
            return {
            period,
            events: data.events,
            registrations: data.registrations,
            checkins: data.checkins,
            };
        });

        return chartData;
    },

    /**
     * Get events distribution by department
     */
    async getDepartmentDistribution() {
        const departments = await prisma.department.findMany({
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        events: true,
                    },
                },
            },
            orderBy: {
                events: {
                    _count: 'desc',
                },
            },
        });

        return departments.map((dept) => ({
            name: dept.name,
            value: dept._count.events,
        }));
    },
};
