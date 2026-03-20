import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as feedbackController from '../controllers/feedback.controller';
import * as feedbackValidator from '../validators/feedback.validator';

const router = Router();

// Student routes
router.post(
    '/',
    authenticate,
    feedbackValidator.validateSubmitFeedback,
    feedbackController.submitFeedback
);
router.get(
    '/my-feedback/:eventId',
    authenticate,
    feedbackController.getMyFeedback
);

// Public routes
router.get('/event/:eventId', feedbackController.getEventFeedbacks);
router.get('/top-rated', feedbackController.getTopRatedEvents);

// Organizer/Admin routes
router.get(
    '/event/:eventId/summary',
    authenticate,
    authorize('organizer', 'admin'),
    feedbackController.getFeedbackSummary
);

export default router;
