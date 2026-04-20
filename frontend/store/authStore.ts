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
      setAuth: (user, token, refreshToken) => {
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ user, token, isAuthenticated: true });
      },
      updateUser: (user) => {
        set({ user });
      },
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || !state || typeof window === 'undefined') {
            return;
          }

          const token = localStorage.getItem('token');

          // Check if token is valid
          if (isJwtTokenValid(token)) {
            // Token is valid, mark as hydrated and authenticated
            state.isHydrated = true;
            state.token = token;
            state.isAuthenticated = true;
          } else {
            // Token is invalid or missing, clear everything
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isHydrated = true;
          }
        };
      },
    }
  )
);

