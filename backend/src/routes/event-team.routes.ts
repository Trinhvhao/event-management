import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { eventTeamController } from '../controllers/event-team.controller';

const router = Router();

/**
 * @route   GET /api/events/:eventId/team
 * @desc    Get team members for an event
 * @access  Private (authenticated)
 */
router.get('/:eventId/team', authenticate, eventTeamController.getTeam);

/**
 * @route   GET /api/events/:eventId/team/search
 * @desc    Search available users to add to event team
 * @access  Private (organizer, admin)
 */
router.get('/:eventId/team/search', authenticate, authorize('organizer', 'admin'), eventTeamController.searchAvailableUsers);

/**
 * @route   POST /api/events/:eventId/team
 * @desc    Add a team member to an event
 * @access  Private (organizer, admin)
 */
router.post('/:eventId/team', authenticate, authorize('organizer', 'admin'), eventTeamController.addTeamMember);

/**
 * @route   PUT /api/events/:eventId/team/:userId
 * @desc    Update team member role
 * @access  Private (organizer, admin)
 */
router.put('/:eventId/team/:userId', authenticate, authorize('organizer', 'admin'), eventTeamController.updateTeamMemberRole);

/**
 * @route   DELETE /api/events/:eventId/team/:userId
 * @desc    Remove a team member from an event
 * @access  Private (organizer, admin)
 */
router.delete('/:eventId/team/:userId', authenticate, authorize('organizer', 'admin'), eventTeamController.removeTeamMember);

export default router;
