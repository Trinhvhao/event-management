import { create } from 'zustand';
import { categoryService } from '@/services/categoryService';

interface Category {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    event_count?: number;
    created_at: string;
}

interface Department {
    id: string;
    name: string;
    code: string;
    description: string | null;
    user_count?: number;
    created_at: string;
}

interface CategoryState {
    categories: Category[];
    departments: Department[];
    loading: boolean;
    error: string | null;

    // Category actions
    fetchCategories: () => Promise<void>;
    createCategory: (data: Partial<Category>) => Promise<void>;
    updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
    deleteCategory: (id: string, reassignTo?: string) => Promise<{ reassignedCount?: number }>;

    // Department actions
    fetchDepartments: () => Promise<void>;
    createDepartment: (data: Partial<Department>) => Promise<void>;
    updateDepartment: (id: string, data: Partial<Department>) => Promise<void>;
    deleteDepartment: (id: string) => Promise<void>;
}

const toErrorMessage = (error: unknown): string => {
    const err = error as {
        response?: { data?: { message?: string; error?: { message?: string } } };
        message?: string;
    };

    return (
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Request failed'
    );
};

export const useCategoryStore = create<CategoryState>((set, get) => ({
    categories: [],
    departments: [],
    loading: false,
    error: null,

    fetchCategories: async () => {
        set({ loading: true, error: null });
        try {
            const data = await categoryService.getCategories();
            set({ categories: data, loading: false });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
        }
    },

    createCategory: async (data) => {
        set({ loading: true });
        try {
            await categoryService.createCategory(data);

            await get().fetchCategories();
            set({ loading: false });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
            throw error;
        }
    },

    updateCategory: async (id, data) => {
        set({ loading: true });
        try {
            await categoryService.updateCategory(id, data);

            await get().fetchCategories();
            set({ loading: false });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
            throw error;
        }
    },

    deleteCategory: async (id, reassignTo) => {
        set({ loading: true });
        try {
            const result = await categoryService.deleteCategory(id, reassignTo);
            await get().fetchCategories();
            set({ loading: false });
            return result;
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
            throw error;
        }
    },

    fetchDepartments: async () => {
        set({ loading: true, error: null });
        try {
            const data = await categoryService.getDepartments();
            set({ departments: data, loading: false });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
        }
    },

    createDepartment: async (data) => {
        set({ loading: true });
        try {
            await categoryService.createDepartment(data);

            await get().fetchDepartments();
            set({ loading: false });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
            throw error;
        }
    },

    updateDepartment: async (id, data) => {
        set({ loading: true });
        try {
            await categoryService.updateDepartment(id, data);

            await get().fetchDepartments();
            set({ loading: false });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
            throw error;
        }
    },

    deleteDepartment: async (id) => {
        set({ loading: true });
        try {
            await categoryService.deleteDepartment(id);

            await get().fetchDepartments();
            set({ loading: false });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
            throw error;
        }
    },
}));
