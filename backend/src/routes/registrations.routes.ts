import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as registrationsController from '../controllers/registrations.controller';

const router = Router();

// Participant routes
router.post('/', authenticate, authorize('participant'), registrationsController.registerForEvent);
router.get('/my', authenticate, authorize('participant'), registrationsController.getMyRegistrations);
router.get('/my-registrations', authenticate, authorize('participant'), registrationsController.getMyRegistrations);
router.delete('/:id', authenticate, authorize('participant'), registrationsController.cancelRegistration);

// Waitlist routes
router.post('/waitlist/:eventId', authenticate, authorize('participant'), registrationsController.joinWaitlist);
router.delete('/waitlist/:eventId', authenticate, authorize('participant'), registrationsController.leaveWaitlist);
router.get('/waitlist/:eventId', authenticate, authorize('participant'), registrationsController.getMyWaitlistPosition);

// Approval routes (Organizer/Admin)
router.get('/pending', authenticate, authorize('organizer', 'admin'), registrationsController.getPendingRegistrations);
router.post('/:id/approve', authenticate, authorize('organizer', 'admin'), registrationsController.approveRegistration);
router.post('/:id/reject', authenticate, authorize('organizer', 'admin'), registrationsController.rejectRegistration);

// Event registrations (Organizer/Admin)
router.get('/event/:eventId', authenticate, authorize('organizer', 'admin'), registrationsController.getEventRegistrations);
router.get('/event/:eventId/waitlist', authenticate, authorize('organizer', 'admin'), registrationsController.getEventWaitlist);

// Common routes
router.get('/:id/qrcode', authenticate, registrationsController.getRegistrationQRCode);
router.get('/:id/qr', authenticate, registrationsController.getRegistrationQRCode);
router.get('/:id', authenticate, registrationsController.getRegistrationById);

export default router;
