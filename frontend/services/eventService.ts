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
    const response = await axios.get<ApiResponse<Event>>(`/events/${id}`);
    return response.data.data;
  },

  async create(data: CreateEventData): Promise<Event> {
    const response = await axios.post<ApiResponse<Event>>('/events', data);
    return response.data.data;
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
    const response = await axios.get<ApiResponse<Category[]>>(
      '/events/meta/categories'
    );
    return response.data.data;
  },

  async getDepartments(): Promise<Department[]> {
    const response = await axios.get<ApiResponse<Department[]>>(
      '/events/meta/departments'
    );
    return response.data.data;
  },
};
