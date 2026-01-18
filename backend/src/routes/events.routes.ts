import { Router } from 'express';
import { authenticate } from '../middleware/auth';
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
 * @route   GET /api/events/:id
 * @desc    Get event by ID
 * @access  Public
 */
router.get('/:id', eventController.getById);

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

export default router;
