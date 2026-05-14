'use strict';
import { Request, Response } from 'express';
import {
    getDepartmentLeaderboard,
    getLeaderboard,
    getUserBadges,
    seedDefaultBadges,
} from '../services/gamification.service';

export const getDepartmentLeaderboardHandler = async (req: Request, res: Response) => {
    const semester = req.query.semester as string | undefined;
    const data = await getDepartmentLeaderboard(semester);
    res.json({ success: true, data });
};

export const getLeaderboardHandler = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const semester = req.query.semester as string | undefined;
    const departmentId = req.query.department_id ? parseInt(req.query.department_id as string) : undefined;
    const data = await getLeaderboard(limit, semester, departmentId);
    res.json({ success: true, data });
};

export const getMyBadgesHandler = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const badges = await getUserBadges(userId);
    res.json({ success: true, data: { badges, total: badges.length } });
};

export const getUserBadgesHandler = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId as string);
    const badges = await getUserBadges(userId);
    res.json({ success: true, data: { badges, total: badges.length } });
};

export const seedBadgesHandler = async (_req: Request, res: Response) => {
    await seedDefaultBadges();
    res.json({ success: true, message: 'Badges seeded successfully' });
};
