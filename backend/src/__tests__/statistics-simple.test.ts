import { statisticsService } from '../services/statistics.service';
import prisma from '../config/database';

describe('Statistics Service Tests', () => {
    it('should get dashboard stats', async () => {
        const stats = await statisticsService.getDashboardStats();

        expect(stats).toHaveProperty('totalEvents');
        expect(stats).toHaveProperty('totalUsers');
        expect(stats).toHaveProperty('totalRegistrations');
        expect(stats).toHaveProperty('totalAttendances');
        expect(stats).toHaveProperty('eventsByStatus');
        expect(stats).toHaveProperty('usersByRole');
        expect(stats).toHaveProperty('checkInRate');

        expect(typeof stats.totalEvents).toBe('number');
        expect(typeof stats.checkInRate).toBe('number');
        expect(Array.isArray(stats.eventsByStatus)).toBe(true);
        expect(Array.isArray(stats.usersByRole)).toBe(true);
    });

    it('should get student stats', async () => {
        const stats = await statisticsService.getStudentStats();

        expect(stats).toHaveProperty('topByEvents');
        expect(stats).toHaveProperty('topByPoints');
        expect(Array.isArray(stats.topByEvents)).toBe(true);
        expect(Array.isArray(stats.topByPoints)).toBe(true);
    });

    it('should get department stats', async () => {
        const stats = await statisticsService.getDepartmentStats();

        expect(Array.isArray(stats)).toBe(true);
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });
});
