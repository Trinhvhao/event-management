import { Router } from 'express';
import { authenticate, authenticateOptional } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validateCreateEvent, validateUpdateEvent } from '../validators/events.validator';
import { eventController } from '../controllers/events.controller';

const router = Router();

/**
 * @route   GET /api/events
 * @desc    Get all events with filters
 * @access  Public
 */
router.get('/', eventController.getAll);

/**
 * @route   GET /api/events/categories
 * @desc    Get all categories
 * @access  Public
 */
router.get('/categories', eventController.getCategories);

/**
 * @route   GET /api/events/departments
 * @desc    Get all departments
 * @access  Public
 */
router.get('/departments', eventController.getDepartments);

/**
 * @route   GET /api/events/my
 * @desc    Get events created by the current organizer
 * @access  Private (Organizer, Admin)
 */
router.get('/my', authenticate, authorize('organizer', 'admin'), eventController.getMyEvents);

/**
 * @route   GET /api/events/pending
 * @desc    Get pending events for approval
 * @access  Private (Admin)
 */
router.get('/pending', authenticate, authorize('admin'), eventController.getPending);

/**
 * @route   PUT /api/events/:id/approve
 * @desc    Approve event
 * @access  Private (Admin)
 */
router.put('/:id/approve', authenticate, authorize('admin'), eventController.approve);

/**
 * @route   PUT /api/events/:id/reject
 * @desc    Reject event
 * @access  Private (Admin)
 */
router.put('/:id/reject', authenticate, authorize('admin'), eventController.reject);

/**
 * @route   GET /api/events/:id
 * @desc    Get event by ID
 * @access  Public
 */
router.get('/:id', authenticateOptional, eventController.getById);

/**
 * @route   POST /api/events
 * @desc    Create new event
 * @access  Private (Organizer, Admin)
 */
router.post(
  '/',
  authenticate,
  authorize('organizer', 'admin'),
  validateCreateEvent,
  eventController.create
);

/**
 * @route   PUT /api/events/:id
 * @desc    Update event
 * @access  Private (Organizer - owner, Admin)
 */
router.put(
  '/:id',
  authenticate,
  authorize('organizer', 'admin'),
  validateUpdateEvent,
  eventController.update
);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event
 * @access  Private (Organizer - owner, Admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('organizer', 'admin'),
  eventController.delete
);

/**
 * @route   PUT /api/events/:id/cancel
 * @desc    Cancel event + notify all registered users
 * @access  Private (Organizer - owner, Admin)
 */
router.put(
  '/:id/cancel',
  authenticate,
  authorize('organizer', 'admin'),
  eventController.cancelEvent
);

export default router;
