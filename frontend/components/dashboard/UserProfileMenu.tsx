'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { User, Settings, LogOut, ChevronDown, Shield, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import { profileService } from '@/services/profileService';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

const ROLE_CONFIG: Record<UserRole, { label: string; badge: string; icon: string }> = {
    admin:     { label: 'Quản trị viên',      badge: 'bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] text-[var(--color-brand-navy)]',  icon: '⚡' },
    organizer: { label: 'Ban tổ chức',         badge: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,transparent)] text-[var(--color-brand-orange)]', icon: '👔' },
    student:   { label: 'Sinh viên',           badge: 'bg-[color-mix(in_srgb,var(--color-brand-green)_10%,transparent)] text-[var(--color-brand-green)]',   icon: '👨‍🎓' },
};

export default function UserProfileMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user, updateUser, logout } = useAuthStore();

    const role = user?.role || 'student';
    const roleInfo = ROLE_CONFIG[role];

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch { /* Keep local logout on API failure */ }
        logout();
        router.push('/login');
    };

    const handleToggleMenu = async () => {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);
        if (!nextOpen) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const profile = await profileService.getProfile();
            updateUser(profile);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    };

    const displayName = user?.full_name || 'Tài khoản';
    const displayEmail = user?.email || '';

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={handleToggleMenu}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--bg-muted)] transition-all duration-200 group"
            >
                <Avatar
                    src={null}
                    name={displayName}
                    size="md"
                    className="ring-2 ring-[var(--border-default)] group-hover:ring-[var(--color-brand-navy)] transition-all"
                />
                <div className="text-left hidden md:block">
                    <div className="text-sm font-semibold text-[var(--text-primary)] leading-tight truncate max-w-[140px]">
                        {displayName}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-medium">{roleInfo.label}</div>
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-[var(--text-muted)] transition-all duration-200 hidden md:block ${isOpen ? 'rotate-180 text-[var(--color-brand-navy)]' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-[var(--shadow-xl)] border border-[var(--border-default)] z-50 overflow-hidden">
                    {/* Profile header */}
                    <div className="px-5 py-4 border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--bg-muted)]/40 to-transparent">
                        <div className="flex items-center gap-3">
                            <Avatar src={null} name={displayName} size="lg" className="ring-2 ring-[var(--color-brand-light)]" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{displayName}</p>
                                <p className="text-xs text-[var(--text-muted)] truncate">{displayEmail}</p>
                                <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${roleInfo.badge}`}>
                                    <span>{roleInfo.icon}</span>
                                    {roleInfo.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                        <button
                            onClick={() => { router.push('/dashboard/profile'); setIsOpen(false); }}
                            className="flex items-center gap-3 w-full px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] flex items-center justify-center">
                                <User className="w-4 h-4 text-[var(--color-brand-navy)]" />
                            </div>
                            Tài khoản của tôi
                        </button>
                        <button
                            onClick={() => { router.push('/dashboard/settings'); setIsOpen(false); }}
                            className="flex items-center gap-3 w-full px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-orange)_8%,transparent)] flex items-center justify-center">
                                <Settings className="w-4 h-4 text-[var(--color-brand-orange)]" />
                            </div>
                            Cài đặt
                        </button>
                        <button
                            onClick={() => { router.push('/dashboard/activity'); setIsOpen(false); }}
                            className="flex items-center gap-3 w-full px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-green)_8%,transparent)] flex items-center justify-center">
                                <Activity className="w-4 h-4 text-[var(--color-brand-green)]" />
                            </div>
                            Hoạt động của tôi
                        </button>
                    </div>

                    {/* Divider + Logout */}
                    <div className="border-t border-[var(--border-light)] py-1.5">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-5 py-2.5 text-sm text-[var(--color-brand-red)] hover:bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-red)_8%,transparent)] flex items-center justify-center">
                                <LogOut className="w-4 h-4 text-[var(--color-brand-red)]" />
                            </div>
                            Đăng xuất
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
