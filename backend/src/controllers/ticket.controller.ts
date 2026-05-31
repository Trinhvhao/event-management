import { Request, Response, NextFunction } from 'express';
import { ticketService } from '../services/ticket.service';
import { successResponse } from '../utils/response.util';
import { getAuthenticatedUser } from '../utils/request.util';
import * as emailService from '../services/email.service';
import * as fs from 'fs';

export const ticketController = {
  /**
   * Get all tickets for current user
   */
  async getMyTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = getAuthenticatedUser(req);
      const tickets = await ticketService.getUserTickets(currentUser.id);

      // Categorize tickets
      const now = new Date();
      const ticketsWithMeta = tickets.map(ticket => {
        const eventEnd = new Date(ticket.registration.event.end_time);
        return {
          ...ticket,
          is_past: eventEnd < now,
          is_upcoming: eventEnd >= now && ticket.status === 'valid',
        };
      });

      res.json(successResponse(ticketsWithMeta));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get ticket details
   */
  async getTicketById(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = getAuthenticatedUser(req);
      const { id } = req.params;

      const ticket = await ticketService.getTicketById(Number(id));

      // Verify ownership
      if (ticket.registration.user_id !== currentUser.id) {
        res.status(403).json({
          success: false,
          error: { message: 'You do not have permission to view this ticket' },
        });
        return;
      }

      res.json(successResponse(ticket));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get QR image for ticket
   */
  async getTicketQR(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = getAuthenticatedUser(req);
      const { id } = req.params;

      const ticket = await ticketService.getTicketById(Number(id));

      // Verify ownership
      if (ticket.registration.user_id !== currentUser.id) {
        res.status(403).json({
          success: false,
          error: { message: 'You do not have permission to view this ticket' },
        });
        return;
      }

      const qrImage = await ticketService.getTicketQR(Number(id));

      res.json(successResponse({ qr_image: qrImage }));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Download PDF ticket
   */
  async downloadPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = getAuthenticatedUser(req);
      const { id } = req.params;

      const ticket = await ticketService.getTicketById(Number(id));

      // Verify ownership
      if (ticket.registration.user_id !== currentUser.id) {
        res.status(403).json({
          success: false,
          error: { message: 'You do not have permission to download this ticket' },
        });
        return;
      }

      // Generate PDF
      const pdfPath = await emailService.generateTicketPDF(ticket);

      // Send file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${ticket.ticket_code}.pdf"`);

      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);

      fileStream.on('error', () => {
        res.status(500).json({
          success: false,
          error: { message: 'Error generating PDF' },
        });
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Resend ticket email
   */
  async resendEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = getAuthenticatedUser(req);
      const { id } = req.params;

      console.log(`[Ticket] Resend email - Ticket ID: ${id}, User: ${currentUser.email}`);

      const ticket = await ticketService.getTicketById(Number(id));
      console.log(`[Ticket] Ticket found: ${ticket.ticket_code}, User email: ${ticket.registration.user.email}`);

      // Verify ownership
      if (ticket.registration.user_id !== currentUser.id) {
        console.log(`[Ticket] ❌ Ownership check failed: ticket.user_id=${ticket.registration.user_id}, currentUser.id=${currentUser.id}`);
        res.status(403).json({
          success: false,
          error: { message: 'You do not have permission to resend this ticket' },
        });
        return;
      }

      console.log(`[Ticket] ✅ Ownership verified, generating PDF...`);
      // Generate PDF and send email
      const pdfPath = await emailService.generateTicketPDF(ticket);
      console.log(`[Ticket] PDF generated: ${pdfPath}`);

      console.log(`[Ticket] Sending email to ${ticket.registration.user.email}...`);
      await emailService.sendTicketEmail(ticket, pdfPath);

      // Mark as sent
      await ticketService.markTicketSent(ticket.id);
      console.log(`[Ticket] ✅ Email sent successfully!`);

      res.json(successResponse(null, 'Ticket email sent successfully'));
    } catch (error) {
      console.error(`[Ticket] ❌ Resend failed:`, error);
      next(error);
    }
  },

  /**
   * Get ticket by code (for organizers to scan)
   */
  async getTicketByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.params.code as string;

      const ticket = await ticketService.getTicketByCode(code);

      if (!ticket) {
        res.status(404).json({
          success: false,
          error: { message: 'Ticket not found' },
        });
        return;
      }

      res.json(successResponse(ticket));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Validate ticket for check-in
   */
  async validateTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await ticketService.validateForCheckin(Number(id));

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },
};
