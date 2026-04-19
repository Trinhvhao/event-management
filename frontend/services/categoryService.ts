import axios from '@/lib/axios';

interface Category {
    id?: string;
    name?: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
}

interface Department {
    id?: string;
    name?: string;
    code?: string;
    description?: string | null;
}

interface DeleteCategoryResult {
    success: boolean;
    reassignedCount?: number;
}

export const categoryService = {
    // Category operations
    async getCategories() {
        const response = await axios.get('/admin/categories');
        return response.data.data;
    },

    async createCategory(data: Category) {
        const response = await axios.post('/admin/categories', data);
        return response.data.data;
    },

    async updateCategory(id: string, data: Category) {
        const response = await axios.put(`/admin/categories/${id}`, data);
        return response.data.data;
    },

    async deleteCategory(id: string, reassignTo?: string): Promise<DeleteCategoryResult> {
        const url = reassignTo
            ? `/admin/categories/${id}?reassignTo=${reassignTo}`
            : `/admin/categories/${id}`;
        const response = await axios.delete(url);
        return response.data;
    },

    // Department operations
    async getDepartments() {
        const response = await axios.get('/admin/departments');
        return response.data.data;
    },

    async createDepartment(data: Department) {
        const response = await axios.post('/admin/departments', data);
        return response.data.data;
    },

    async updateDepartment(id: string, data: Department) {
        const response = await axios.put(`/admin/departments/${id}`, data);
        return response.data.data;
    },

    async deleteDepartment(id: string) {
        const response = await axios.delete(`/admin/departments/${id}`);
        return response.data;
    },
};
