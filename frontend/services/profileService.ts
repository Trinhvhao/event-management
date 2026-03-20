import axios from '@/lib/axios';
import { User, ApiResponse } from '@/types';

export const profileService = {
    async getProfile(): Promise<User> {
        const response = await axios.get<ApiResponse<User>>('/auth/me');
        return response.data.data;
    },

    async updateProfile(data: { full_name: string; department_id?: number }): Promise<User> {
        const response = await axios.put<ApiResponse<User>>('/auth/me', data);
        return response.data.data;
    },

    /** Đổi mật khẩu — verify mật khẩu cũ trước khi đổi */
    async changePassword(data: { old_password: string; new_password: string }): Promise<void> {
        await axios.put('/auth/change-password', data);
    },
};
