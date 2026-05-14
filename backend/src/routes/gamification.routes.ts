'use strict';
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as gamificationController from '../controllers/gamification.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public leaderboard (authenticated users can see)
router.get('/leaderboard', gamificationController.getLeaderboardHandler);
router.get('/leaderboard/departments', gamificationController.getDepartmentLeaderboardHandler);

// My badges
router.get('/my-badges', gamificationController.getMyBadgesHandler);

// Admin: get any user's badges
router.get('/user/:userId/badges', gamificationController.getUserBadgesHandler);

// Admin: seed default badges (one-time setup)
router.post('/seed', authorize('admin'), gamificationController.seedBadgesHandler);

export default router;
