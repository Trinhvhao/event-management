import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

// Participant: Create payment for a registration
router.post('/', authenticate, authorize('participant'), paymentController.createPayment);

// Participant: Get my payments list
router.get('/my', authenticate, authorize('participant'), paymentController.getMyPayments);

// Participant: Get single payment detail
router.get('/:id', authenticate, authorize('participant', 'admin'), paymentController.getPaymentById);

// Participant: Cancel pending payment
router.delete('/:id', authenticate, authorize('participant'), paymentController.cancelPayment);

// Participant: Poll payment status (for waiting screen)
router.get('/:id/status', authenticate, authorize('participant'), paymentController.pollPaymentStatus);

// SePay Webhook (no auth - SePay sends its own authentication headers)
router.post('/webhook', (req: Request, res: Response) => paymentController.handleWebhook(req, res));

export default router;
