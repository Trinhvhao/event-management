import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All ticket routes require authentication
router.use(authenticate);

// Get my tickets
router.get('/', ticketController.getMyTickets);

// Get ticket by ID
router.get('/:id', ticketController.getTicketById);

// Get QR image for ticket
router.get('/:id/qr', ticketController.getTicketQR);

// Download PDF ticket
router.get('/:id/pdf', ticketController.downloadPDF);

// Resend ticket email
router.post('/:id/resend', ticketController.resendEmail);

// Validate ticket for check-in
router.post('/:id/validate', ticketController.validateTicket);

// Get ticket by code (for organizer scanning)
router.get('/code/:code', ticketController.getTicketByCode);

export default router;
