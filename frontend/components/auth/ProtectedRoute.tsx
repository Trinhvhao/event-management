'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, user, isHydrated } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isHydrated, isAuthenticated, router]);

    useEffect(() => {
        if (isHydrated && isAuthenticated && allowedRoles && user) {
            if (!allowedRoles.includes(user.role)) {
                router.replace('/dashboard');
            }
        }
    }, [isHydrated, isAuthenticated, allowedRoles, user, router]);

    // Show loading while checking hydration
    if (!isHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--dash-bg)]">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin text-[var(--dash-accent)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                    </svg>
                    <p className="text-sm text-[var(--dash-text-muted)]">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
}
