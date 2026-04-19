import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as registrationsController from '../controllers/registrations.controller';

const router = Router();

// Student routes
router.post('/', authenticate, authorize('student'), registrationsController.registerForEvent);
router.get('/my', authenticate, authorize('student'), registrationsController.getMyRegistrations);
router.get('/my-registrations', authenticate, authorize('student'), registrationsController.getMyRegistrations);
router.delete('/:id', authenticate, authorize('student'), registrationsController.cancelRegistration);

// Organizer/Admin routes
router.get('/event/:eventId', authenticate, authorize('organizer', 'admin'), registrationsController.getEventRegistrations);
router.get('/:id', authenticate, registrationsController.getRegistrationById);

export default router;
