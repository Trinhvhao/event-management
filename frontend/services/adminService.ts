import axios from '@/lib/axios';

interface GetUsersParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    department_id?: string;
    is_active?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

interface BulkActionResult {
    successCount: number;
    failureCount: number;
    failures?: Array<{ userId: string; error: string }>;
}

export const adminService = {
    // Get users with filters and pagination
    async getUsers(params: GetUsersParams) {
        const response = await axios.get('/admin/users', { params });
        return response.data;
    },

    // Lock a user
    async lockUser(userId: string) {
        const response = await axios.put(`/admin/users/${userId}/lock`);
        return response.data;
    },

    // Unlock a user
    async unlockUser(userId: string) {
        const response = await axios.put(`/admin/users/${userId}/unlock`);
        return response.data;
    },

    // Change user role
    async changeUserRole(userId: string, role: string) {
        const response = await axios.put(`/admin/users/${userId}/role`, { role });
        return response.data;
    },

    // Bulk lock users
    async bulkLock(userIds: string[]): Promise<BulkActionResult> {
        const response = await axios.post('/admin/users/bulk-lock', { userIds });
        return response.data;
    },

    // Bulk unlock users
    async bulkUnlock(userIds: string[]): Promise<BulkActionResult> {
        const response = await axios.post('/admin/users/bulk-unlock', { userIds });
        return response.data;
    },

    // Get user audit logs
    async getUserAuditLogs(userId: string, params?: { page?: number; limit?: number; actionType?: string }) {
        const response = await axios.get(`/admin/users/${userId}/audit-logs`, { params });
        return response.data;
    },
};
