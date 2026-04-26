import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

const isJwtTokenValid = (token: string | null): boolean => {
  if (!token) {
    return false;
  }

  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) {
      return false;
    }

    const payloadJson = atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { exp?: number };

    if (!payload.exp) {
      return true;
    }

    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setHydrated: (value: boolean) => void;
  validateSession: () => void;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,
      setHydrated: (value) => {
        set({ isHydrated: value });
      },
      validateSession: () => {
        const token = localStorage.getItem('token');

        if (isJwtTokenValid(token)) {
          set(() => ({
            token,
            isAuthenticated: true,
            isHydrated: true,
          }));
          return;
        }

        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isHydrated: true,
        });
      },
      setAuth: (user, token, refreshToken) => {
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ user, token, isAuthenticated: true, isHydrated: true });
      },
      updateUser: (user) => {
        set({ user });
      },
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({ user: null, token: null, isAuthenticated: false, isHydrated: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (!state || typeof window === 'undefined') {
            return;
          }

          if (error) {
            state.logout();
            return;
          }

          state.validateSession();
        };
      },
    }
  )
);

