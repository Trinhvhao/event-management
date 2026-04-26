import axios from '@/lib/axios';
import {
  Event,
  CreateEventData,
  Category,
  Department,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export const eventService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    category?: string;
    department?: string;
    status?: string;
    search?: string;
    category_id?: number;
    department_id?: number;
    sortBy?: string;
    sortOrder?: string;
    is_free?: boolean;
  }): Promise<PaginatedResponse<Event>> {
    // Map FE params to BE params, strip unsupported fields to avoid 400 errors
    const {
      category_id,
      department_id,
      is_free,
      ...rest
    } = params ?? {};

    const apiParams: Record<string, unknown> = { ...rest };

    if (category_id !== undefined) {
      apiParams.category = category_id;
    }
    if (department_id !== undefined) {
      apiParams.department = department_id;
    }
    if (is_free !== undefined) {
      apiParams.is_free = String(is_free);
    }

    const response = await axios.get<PaginatedResponse<Event>>('/events', {
      params: apiParams,
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
    const response = await axios.get<ApiResponse<Category[]> | Category[]>('/events/categories');
    const payload = response.data;

    if (Array.isArray(payload)) {
      return payload;
    }

    return payload.data || [];
  },

  async getDepartments(): Promise<Department[]> {
    const response = await axios.get<ApiResponse<Department[]> | Department[]>('/events/departments');
    const payload = response.data;

    if (Array.isArray(payload)) {
      return payload;
    }

    return payload.data || [];
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

  /** Upload hình ảnh lên server */
  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axios.post<ApiResponse<UploadResponse>>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },
};
