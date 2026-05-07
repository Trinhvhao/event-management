import prisma from '../config/database';
import QRCode from 'qrcode';
import { TicketStatus } from '@prisma/client';

export interface TicketWithDetails {
  id: number;
  ticket_code: string;
  registration_id: number;
  qr_data: string;
  qr_image: string | null;
  pdf_url: string | null;
  status: TicketStatus;
  sent_at: Date | null;
  created_at: Date;
  registration: {
    id: number;
    user_id: number;
    event_id: number;
    registered_at: Date;
    status: string;
    user: {
      id: number;
      email: string;
      full_name: string;
      student_id: string | null;
      department: { id: number; name: string } | null;
    };
    event: {
      id: number;
      title: string;
      description: string | null;
      start_time: Date;
      end_time: Date;
      location: string | null;
    };
  };
}

export interface CreateTicketData {
  registration_id: number;
  event_id: number;
  user_id: number;
}

export const ticketService = {
  /**
   * Generate unique ticket code
   * Format: EVT-{YEAR}-{RANDOM}
   */
  generateTicketCode(): string {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `EVT-${year}-${random}`;
  },

  /**
   * Create ticket for a registration
   */
  async createTicket(data: CreateTicketData): Promise<TicketWithDetails> {
    const { registration_id, event_id, user_id } = data;

    // Check if ticket already exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { registration_id },
    });

    if (existingTicket) {
      return this.getTicketById(existingTicket.id);
    }

    // Generate QR data payload
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

    const qrPayload = {
      ticket_code: this.generateTicketCode(),
      registration_id,
      event_id,
      user_id,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    // Generate QR code as base64 PNG
    const qrImage = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Create ticket in database
    const ticket = await prisma.ticket.create({
      data: {
        ticket_code: qrPayload.ticket_code,
        registration_id,
        qr_data: JSON.stringify(qrPayload),
        qr_image: qrImage,
        status: 'valid',
      },
      include: {
        registration: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                full_name: true,
                student_id: true,
                department: {
                  select: { id: true, name: true },
                },
              },
            },
            event: {
              select: {
                id: true,
                title: true,
                description: true,
                start_time: true,
                end_time: true,
                location: true,
              },
            },
          },
        },
      },
    });

    return ticket as unknown as TicketWithDetails;
  },

  /**
   * Get all tickets for a user
   */
  async getUserTickets(userId: number) {
    return prisma.ticket.findMany({
      where: {
        registration: {
          user_id: userId,
        },
      },
      include: {
        registration: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                student_id: true,
                department: {
                  select: { name: true },
                },
              },
            },
            event: {
              select: {
                id: true,
                title: true,
                start_time: true,
                end_time: true,
                location: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  },

  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: number): Promise<TicketWithDetails> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        registration: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                full_name: true,
                student_id: true,
                department: {
                  select: { id: true, name: true },
                },
              },
            },
            event: {
              select: {
                id: true,
                title: true,
                description: true,
                start_time: true,
                end_time: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket as unknown as TicketWithDetails;
  },

  /**
   * Get ticket by ticket code
   */
  async getTicketByCode(ticketCode: string) {
    return prisma.ticket.findUnique({
      where: { ticket_code: ticketCode },
      include: {
        registration: {
          include: {
            user: {
              select: {
                full_name: true,
                student_id: true,
              },
            },
            event: {
              select: {
                title: true,
                start_time: true,
                end_time: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Get QR image for ticket
   */
  async getTicketQR(ticketId: number): Promise<string | null> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { qr_image: true, qr_data: true },
    });

    if (!ticket?.qr_image) {
      // Regenerate if missing
      const qrPayload = JSON.parse(ticket?.qr_data || '{}');
      return QRCode.toDataURL(JSON.stringify(qrPayload), {
        width: 300,
        margin: 2,
      });
    }

    return ticket.qr_image;
  },

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: number, status: TicketStatus) {
    return prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
    });
  },

  /**
   * Mark ticket as sent (email sent)
   */
  async markTicketSent(ticketId: number) {
    return prisma.ticket.update({
      where: { id: ticketId },
      data: { sent_at: new Date() },
    });
  },

  /**
   * Cancel ticket when registration is cancelled
   */
  async cancelTicket(registrationId: number) {
    return prisma.ticket.update({
      where: { registration_id: registrationId },
      data: { status: 'cancelled' },
    });
  },

  /**
   * Validate ticket for check-in
   */
  async validateForCheckin(ticketId: number) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        registration: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!ticket) {
      return { valid: false, error: 'Ticket not found' };
    }

    if (ticket.status === 'used') {
      return { valid: false, error: 'Ticket already used' };
    }

    if (ticket.status === 'cancelled') {
      return { valid: false, error: 'Ticket has been cancelled' };
    }

    if (ticket.status === 'expired') {
      return { valid: false, error: 'Ticket has expired' };
    }

    if (ticket.registration.status === 'cancelled') {
      return { valid: false, error: 'Registration has been cancelled' };
    }

    const now = new Date();
    const expiresAt = new Date(JSON.parse(ticket.qr_data).expires_at);

    if (now > expiresAt) {
      return { valid: false, error: 'Ticket has expired' };
    }

    return { valid: true, ticket };
  },
};
