import axios from '@/lib/axios';
import {
  Event,
  CreateEventData,
  Category,
  Department,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

export const eventService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    category?: string;
    department?: string;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<Event>> {
    const response = await axios.get<PaginatedResponse<Event>>('/events', {
      params,
    });
    return response.data;
  },

  async getById(id: number): Promise<Event> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid event ID');
    }

    const response = await axios.get<ApiResponse<Event>>(`/events/${id}`);
    return response.data.data;
  },

  async create(data: CreateEventData): Promise<Event> {
    const response = await axios.post<ApiResponse<Event>>('/events', data);
    return response.data.data;
  },

  // Alias for backward compatibility
  async createEvent(data: CreateEventData): Promise<Event> {
    return this.create(data);
  },

  async update(id: number, data: Partial<CreateEventData>): Promise<Event> {
    const response = await axios.put<ApiResponse<Event>>(
      `/events/${id}`,
      data
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await axios.delete(`/events/${id}`);
  },

  async getCategories(): Promise<Category[]> {
    const response = await axios.get<ApiResponse<Category[]>>('/events/categories');
    return response.data.data || response.data as any;
  },

  async getDepartments(): Promise<Department[]> {
    const response = await axios.get<ApiResponse<Department[]>>('/events/departments');
    return response.data.data || response.data as any;
  },

  // Lấy sự kiện của organizer hiện tại (lọc theo organizer_id)
  async getMyEvents(): Promise<Event[]> {
    const response = await axios.get<ApiResponse<Event[]>>('/events/my');
    return response.data.data;
  },

  /** Hủy sự kiện — chuyển status cancelled + thông báo hàng loạt */
  async cancelEvent(id: number): Promise<void> {
    await axios.put(`/events/${id}/cancel`);
  },

  async getPending(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Event>> {
    const response = await axios.get<PaginatedResponse<Event>>('/events/pending', {
      params,
    });
    return response.data;
  },

  async approveEvent(id: number): Promise<Event> {
    const response = await axios.put<ApiResponse<Event>>(`/events/${id}/approve`);
    return response.data.data;
  },

  async rejectEvent(id: number, reason?: string): Promise<Event> {
    const response = await axios.put<ApiResponse<Event>>(`/events/${id}/reject`, {
      reason,
    });
    return response.data.data;
  },
};
