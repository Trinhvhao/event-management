'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import { profileService } from '@/services/profileService';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

export default function UserProfileMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user, updateUser, logout } = useAuthStore();

    const roleLabel = useMemo(() => {
        const roleMap: Record<UserRole, string> = {
            admin: 'Quản trị viên',
            organizer: 'Ban tổ chức',
            student: 'Sinh viên',
        };

        const role = user?.role || 'student';
        return roleMap[role];
    }, [user?.role]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch {
            // Keep local logout behavior if API logout fails.
        }

        logout();
        router.push('/login');
    };

    const handleToggleMenu = async () => {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);

        if (!nextOpen) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const profile = await profileService.getProfile();
            updateUser(profile);
        } catch (error) {
            console.error('Failed to fetch profile for menu:', error);
        }
    };

    const displayName = user?.full_name || 'Tài khoản';
    const displayEmail = user?.email || '';

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={handleToggleMenu}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
                <Avatar src={null} name={displayName} size="lg" className="ring-1 ring-gray-200" />
                <div className="text-left hidden md:block">
                    <div className="font-medium text-gray-900 text-sm">{displayName}</div>
                    <div className="text-xs text-gray-500">{roleLabel}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                        <div className="font-medium text-gray-900">{displayName}</div>
                        <div className="text-sm text-gray-500">{displayEmail}</div>
                        <div className="mt-2">
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                {roleLabel}
                            </span>
                        </div>
                    </div>

                    <div className="py-2">
                        <button
                            onClick={() => router.push('/dashboard/profile')}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <User className="w-4 h-4" />
                            Tài khoản của tôi
                        </button>
                        <button
                            onClick={() => router.push('/dashboard/settings')}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Cài đặt
                        </button>
                    </div>

                    <div className="border-t border-gray-200 py-2">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Đăng xuất
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}