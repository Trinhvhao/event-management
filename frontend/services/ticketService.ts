import axios from '@/lib/axios';

export interface Ticket {
  id: number;
  ticket_code: string;
  registration_id: number;
  qr_data: string;
  qr_image: string | null;
  pdf_url: string | null;
  status: 'valid' | 'used' | 'cancelled' | 'expired';
  sent_at: string | null;
  created_at: string;
  is_past?: boolean;
  is_upcoming?: boolean;
  registration: {
    id: number;
    user_id: number;
    event_id: number;
    registered_at: string;
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
      start_time: string;
      end_time: string;
      location: string | null;
    };
  };
}

export const ticketService = {
  /**
   * Get all tickets for current user
   */
  async getMyTickets(): Promise<Ticket[]> {
    const response = await axios.get('/tickets');
    return response.data.data;
  },

  /**
   * Get ticket by ID
   */
  async getTicketById(id: number): Promise<Ticket> {
    const response = await axios.get(`/tickets/${id}`);
    return response.data.data;
  },

  /**
   * Get QR image for ticket
   */
  async getTicketQR(id: number): Promise<string> {
    const response = await axios.get(`/tickets/${id}/qr`);
    return response.data.data.qr_image;
  },

  /**
   * Download PDF ticket
   */
  async downloadPDF(id: number): Promise<Blob> {
    const response = await axios.get(`/tickets/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Resend ticket email
   */
  async resendEmail(id: number): Promise<void> {
    await axios.post(`/tickets/${id}/resend`, {});
  },

  /**
   * Get ticket by code
   */
  async getTicketByCode(code: string): Promise<Ticket> {
    const response = await axios.get(`/tickets/code/${code}`);
    return response.data.data;
  },

  /**
   * Validate ticket for check-in
   */
  async validateTicket(id: number) {
    const response = await axios.post(`/tickets/${id}/validate`, {});
    return response.data.data;
  },
};
