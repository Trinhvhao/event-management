import axios from '@/lib/axios';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ApiResponse,
} from '@/types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    return response.data.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axios.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      data
    );
    return response.data.data;
  },

  async logout(): Promise<void> {
    await axios.post('/auth/logout');
  },

  async forgotPassword(email: string): Promise<void> {
    await axios.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await axios.post('/auth/reset-password', { token, newPassword });
  },

  async verifyEmail(token: string): Promise<void> {
    await axios.get(`/auth/verify-email?token=${token}`);
  },

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const response = await axios.post<ApiResponse<{ token: string }>>(
      '/auth/refresh-token',
      { refreshToken }
    );
    return response.data.data;
  },
};
