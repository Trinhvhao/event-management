import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

// Student: Create payment for a registration
router.post('/', authenticate, authorize('student'), paymentController.createPayment);

// Student: Get my payments list
router.get('/my', authenticate, authorize('student'), paymentController.getMyPayments);

// Student: Get single payment detail
router.get('/:id', authenticate, authorize('student', 'admin'), paymentController.getPaymentById);

// Student: Cancel pending payment
router.delete('/:id', authenticate, authorize('student'), paymentController.cancelPayment);

// Student: Poll payment status (for waiting screen)
router.get('/:id/status', authenticate, authorize('student'), paymentController.pollPaymentStatus);

// SePay Webhook (no auth - SePay sends its own authentication headers)
router.post('/webhook', (req: Request, res: Response) => paymentController.handleWebhook(req, res));

export default router;
