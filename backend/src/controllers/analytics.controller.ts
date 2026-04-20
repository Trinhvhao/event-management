import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { successResponse } from '../utils/response.util';

export const analyticsController = {
    /**
     * Get time-series analytics data
     * Query params: timeRange (week|month|year)
     */
    async getTimeSeriesAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { timeRange = 'month' } = req.query;

            if (!['week', 'month', 'year'].includes(timeRange as string)) {
                res.status(400).json({
                    success: false,
                    error: { message: 'Invalid timeRange. Must be week, month, or year' },
                });
                return;
            }

            const data = await analyticsService.getTimeSeriesAnalytics(
                timeRange as 'week' | 'month' | 'year'
            );

            res.json(successResponse(data));
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get department distribution
     */
    async getDepartmentDistribution(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await analyticsService.getDepartmentDistribution();
            res.json(successResponse(data));
        } catch (error) {
            next(error);
        }
    },
};
