import axios from '@/lib/axios';
import { User, ApiResponse, Category, Department } from '@/types';

interface PaginatedData<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}

export interface CategoryWithCount extends Category {
    _count?: {
        events: number;
    };
}

export interface DepartmentWithCount extends Department {
    _count?: {
        users: number;
        events: number;
    };
}

// Backend trả về successResponse({ data, pagination })
// Axios response.data = { data: { data: User[], pagination: {...} } }
// Nên phải dùng response.data.data để lấy ra { data, pagination }

export const adminService = {
    async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string }) {
        const response = await axios.get<ApiResponse<PaginatedData<User>>>('/admin/users', { params });
        return response.data.data; // { data: User[], pagination: {...} }
    },

    async updateUser(userId: number, data: { role?: string; is_active?: boolean }): Promise<User> {
        const response = await axios.put<ApiResponse<User>>(`/admin/users/${userId}`, data);
        return response.data.data;
    },

    async getCategories(): Promise<CategoryWithCount[]> {
        const response = await axios.get<ApiResponse<CategoryWithCount[]>>('/admin/categories');
        return response.data.data || [];
    },

    async createCategory(data: { name: string; description?: string }): Promise<CategoryWithCount> {
        const response = await axios.post<ApiResponse<CategoryWithCount>>('/admin/categories', data);
        return response.data.data;
    },

    async deleteCategory(id: number): Promise<void> {
        await axios.delete(`/admin/categories/${id}`);
    },

    async getDepartments(): Promise<DepartmentWithCount[]> {
        const response = await axios.get<ApiResponse<DepartmentWithCount[]>>('/admin/departments');
        return response.data.data || [];
    },

    async createDepartment(data: { name: string; code: string; description?: string }): Promise<DepartmentWithCount> {
        const response = await axios.post<ApiResponse<DepartmentWithCount>>('/admin/departments', data);
        return response.data.data;
    },

    async deleteDepartment(id: number): Promise<void> {
        await axios.delete(`/admin/departments/${id}`);
    },
};
