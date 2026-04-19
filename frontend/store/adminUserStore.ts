import { create } from 'zustand';
import { adminService } from '@/services/adminService';

interface User {
    id: string;
    full_name: string;
    email: string;
    role: 'admin' | 'organizer' | 'student';
    department_id: string;
    department?: {
        id: string;
        name: string;
    };
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

interface UserFilters {
    search: string;
    role: string;
    department_id: string;
    is_active: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const toUserRole = (role: string): User['role'] | null => {
    if (role === 'admin' || role === 'organizer' || role === 'student') {
        return role;
    }

    return null;
};

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

interface AdminUserState {
    users: User[];
    selectedUsers: Set<string>;
    filters: UserFilters;
    pagination: Pagination;
    loading: boolean;
    error: string | null;

    // Actions
    fetchUsers: () => Promise<void>;
    updateFilters: (filters: Partial<UserFilters>) => void;
    lockUser: (userId: string) => Promise<void>;
    unlockUser: (userId: string) => Promise<void>;
    changeUserRole: (userId: string, newRole: string) => Promise<void>;
    bulkLock: (userIds: string[]) => Promise<{ successCount: number; failureCount: number }>;
    bulkUnlock: (userIds: string[]) => Promise<{ successCount: number; failureCount: number }>;
    toggleUserSelection: (userId: string) => void;
    selectAllUsers: () => void;
    clearSelection: () => void;
    setPage: (page: number) => void;
    setPageSize: (limit: number) => void;
}

export const useAdminUserStore = create<AdminUserState>((set, get) => ({
    users: [],
    selectedUsers: new Set(),
    filters: {
        search: '',
        role: '',
        department_id: '',
        is_active: '',
        sortBy: 'created_at',
        sortOrder: 'desc',
    },
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    },
    loading: false,
    error: null,

    fetchUsers: async () => {
        set({ loading: true, error: null });
        try {
            const { filters, pagination } = get();

            const data = await adminService.getUsers({
                page: pagination.page,
                limit: pagination.limit,
                search: filters.search || undefined,
                role: filters.role || undefined,
                department_id: filters.department_id || undefined,
                is_active: filters.is_active || undefined,
                sortBy: filters.sortBy,
                sortOrder: filters.sortOrder,
            });

            const normalizedUsers: User[] = (data.data || []).map((user: User) => ({
                ...user,
                id: String(user.id),
                department_id: user.department_id ? String(user.department_id) : '',
            }));

            set({
                users: normalizedUsers,
                pagination: {
                    page: data.pagination.page,
                    limit: data.pagination.limit,
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages,
                },
                loading: false,
            });
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
        }
    },

    updateFilters: (newFilters) => {
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
            pagination: { ...state.pagination, page: 1 },
        }));
        get().fetchUsers();
    },

    lockUser: async (userId) => {
        const { users } = get();
        const originalUser = users.find((u) => u.id === userId);
        if (!originalUser) return;

        // Optimistic update
        set({
            users: users.map((u) =>
                u.id === userId ? { ...u, is_active: false } : u
            ),
        });

        try {
            await adminService.lockUser(userId);
        } catch (error) {
            // Rollback on failure
            set({
                users: users.map((u) =>
                    u.id === userId ? originalUser : u
                ),
                error: toErrorMessage(error),
            });
            throw error;
        }
    },

    unlockUser: async (userId) => {
        const { users } = get();
        const originalUser = users.find((u) => u.id === userId);
        if (!originalUser) return;

        // Optimistic update
        set({
            users: users.map((u) =>
                u.id === userId ? { ...u, is_active: true } : u
            ),
        });

        try {
            await adminService.unlockUser(userId);
        } catch (error) {
            // Rollback on failure
            set({
                users: users.map((u) =>
                    u.id === userId ? originalUser : u
                ),
                error: toErrorMessage(error),
            });
            throw error;
        }
    },

    changeUserRole: async (userId, newRole) => {
        const { users } = get();
        const originalUser = users.find((u) => u.id === userId);
        const nextRole = toUserRole(newRole);
        if (!originalUser || !nextRole) return;

        // Optimistic update
        set({
            users: users.map((u) =>
                u.id === userId ? { ...u, role: nextRole } : u
            ),
        });

        try {
            await adminService.changeUserRole(userId, newRole);
        } catch (error) {
            // Rollback on failure
            set({
                users: users.map((u) =>
                    u.id === userId ? originalUser : u
                ),
                error: toErrorMessage(error),
            });
            throw error;
        }
    },

    bulkLock: async (userIds) => {
        set({ loading: true });
        try {
            const result = await adminService.bulkLock(userIds);
            await get().fetchUsers();
            set({ loading: false });
            return result;
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
            throw error;
        }
    },

    bulkUnlock: async (userIds) => {
        set({ loading: true });
        try {
            const result = await adminService.bulkUnlock(userIds);
            await get().fetchUsers();
            set({ loading: false });
            return result;
        } catch (error) {
            set({ error: toErrorMessage(error), loading: false });
            throw error;
        }
    },

    toggleUserSelection: (userId) => {
        set((state) => {
            const newSelection = new Set(state.selectedUsers);
            if (newSelection.has(userId)) {
                newSelection.delete(userId);
            } else {
                newSelection.add(userId);
            }
            return { selectedUsers: newSelection };
        });
    },

    selectAllUsers: () => {
        set((state) => ({
            selectedUsers: new Set(state.users.map((u) => u.id)),
        }));
    },

    clearSelection: () => {
        set({ selectedUsers: new Set() });
    },

    setPage: (page) => {
        set((state) => ({
            pagination: { ...state.pagination, page },
        }));
        get().fetchUsers();
    },

    setPageSize: (limit) => {
        set((state) => ({
            pagination: { ...state.pagination, limit, page: 1 },
        }));
        get().fetchUsers();
    },
}));
