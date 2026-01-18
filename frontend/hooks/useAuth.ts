import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { LoginCredentials, RegisterData } from '@/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, logout: logoutStore } = useAuthStore();
  const router = useRouter();

  const login = async (credentials: LoginCredentials) => {
    try {
      const data = await authService.login(credentials);
      setAuth(data.user, data.token);
      toast.success('Đăng nhập thành công!');
      router.push('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Đăng nhập thất bại';
      toast.error(message);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await authService.register(data);
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
      router.push('/login');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Đăng ký thất bại';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      logoutStore();
      toast.success('Đăng xuất thành công!');
      router.push('/login');
    } catch (error) {
      // Still logout locally even if API call fails
      logoutStore();
      router.push('/login');
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
  };
}
