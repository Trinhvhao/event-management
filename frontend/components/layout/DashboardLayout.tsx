'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Calendar,
    CalendarDays,
    User,
    Menu,
    X,
    Award,
    QrCode,
    BarChart3,
    Users,
    Plus,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    FileText,
    Shield,
    Activity,
    LayoutDashboard,
    ClipboardList
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import NotificationBell from '../dashboard/NotificationBell';
import GlobalSearch from '@/components/dashboard/GlobalSearch';
import UserProfileMenu from '../dashboard/UserProfileMenu';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user, isHydrated, isAuthenticated } = useAuthStore();

    React.useEffect(() => {
        if (!isHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
        }
    }, [isHydrated, isAuthenticated, router]);

    const getNavItems = () => {
        if (user?.role === 'admin') {
            return [
                { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                {
                    label: 'Sự kiện',
                    items: [
                        { href: '/dashboard/events', icon: Calendar, label: 'Danh sách sự kiện' },
                        { href: '/dashboard/events/calendar', icon: CalendarDays, label: 'Lịch sự kiện' },
                        { href: '/dashboard/events/pending', icon: ClipboardList, label: 'Phê duyệt sự kiện' }
                    ]
                },
                {
                    label: 'Người dùng',
                    items: [
                        { href: '/dashboard/admin/users', icon: Users, label: 'Quản lý người dùng' },
                        { href: '/dashboard/admin/organizers', icon: User, label: 'Ban tổ chức' },
                        { href: '/dashboard/admin/statistics', icon: BarChart3, label: 'Thống kê quản trị' }
                    ]
                },
                { href: '/dashboard/admin/training-points', icon: Award, label: 'Điểm rèn luyện' },
                {
                    label: 'Cài đặt',
                    items: [
                        { href: '/dashboard/settings/roles', icon: Shield, label: 'Phân quyền' },
                        { href: '/dashboard/settings/categories', icon: FileText, label: 'Danh mục' }
                    ]
                }
            ];
        }

        if (user?.role === 'organizer') {
            return [
                { href: '/dashboard', icon: LayoutDashboard, label: 'Trang chủ' },
                { href: '/dashboard/my-events', icon: Calendar, label: 'Sự kiện của tôi' },
                { href: '/dashboard/events', icon: Calendar, label: 'Tất cả sự kiện' },
                { href: '/dashboard/checkin', icon: QrCode, label: 'Check-in' },
                { href: '/dashboard/admin/training-points', icon: Award, label: 'Điểm rèn luyện' },
                { href: '/dashboard/statistics', icon: BarChart3, label: 'Thống kê' },
            ];
        }

        // Student
        return [
            { href: '/dashboard', icon: LayoutDashboard, label: 'Trang chủ' },
            { href: '/dashboard/events', icon: Calendar, label: 'Khám phá sự kiện' },
            { href: '/dashboard/my-registrations', icon: CheckSquare, label: 'Sự kiện đã đăng ký' },
            { href: '/dashboard/training-points', icon: Award, label: 'Điểm rèn luyện' },
        ];
    };

    const navItems = getNavItems();

    const navHrefs = navItems.flatMap((item) => ('items' in item && item.items ? item.items.map((subItem) => subItem.href) : [item.href]));
    const activeHref = navHrefs
        .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
        .sort((a, b) => b.length - a.length)[0] || null;

    return (
        <div className="min-h-screen bg-[var(--bg-page)]">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen bg-white border-r border-[var(--border-default)] shadow-[var(--shadow-sm)] transform transition-all duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
            >
                {/* Collapse toggle — desktop only */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:flex absolute -right-3.5 top-20 z-20 h-7 w-7 items-center justify-center rounded-full border border-[var(--border-default)] bg-white text-[var(--text-muted)] shadow-[var(--shadow-sm)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] hover:shadow-[var(--shadow-md)] transition-all duration-200 active:scale-95"
                    title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
                    aria-label={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                >
                    {sidebarCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronLeft className="w-3.5 h-3.5" />
                    )}
                </button>

                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="relative flex items-center justify-center p-5 border-b border-[var(--border-default)]">
                        {sidebarCollapsed ? (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                <Activity className="w-4.5 h-4.5 text-white" />
                            </div>
                        ) : (
                            <Link href="/dashboard" className="flex items-center gap-3 group w-full">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)] transition-transform group-hover:scale-105">
                                    <Activity className="w-4.5 h-4.5 text-white" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-base font-bold text-[#050608] tracking-tight leading-tight">DaiNam</span>
                                    <span className="text-xs font-semibold text-[var(--color-brand-navy)] tracking-wider uppercase">Events</span>
                                </div>
                            </Link>
                        )}

                        {/* Mobile close */}
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                        {navItems.map((item, index) => {
                            if ('items' in item && item.items) {
                                return (
                                    <div key={index} className="space-y-0.5">
                                        {!sidebarCollapsed && (
                                            <div className="px-3 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                                                {item.label}
                                            </div>
                                        )}
                                        {item.items.map((subItem) => {
                                            const Icon = subItem.icon;
                                            const isActive = activeHref === subItem.href;
                                            return (
                                                <Link
                                                    key={subItem.href}
                                                    href={subItem.href}
                                                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                                                            ? 'bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] text-[var(--color-brand-navy)] font-semibold'
                                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                                                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                                                    title={sidebarCollapsed ? subItem.label : ''}
                                                    onClick={() => setSidebarOpen(false)}
                                                >
                                                    {isActive && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[var(--color-brand-navy)] rounded-r-full" />
                                                    )}
                                                    <Icon className={`w-5 h-5 shrink-0 transition-colors flex-shrink-0 ${isActive ? 'text-[var(--color-brand-navy)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                                                        }`} />
                                                    {!sidebarCollapsed && <span className="text-sm truncate">{subItem.label}</span>}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                );
                            } else {
                                const Icon = item.icon;
                                const isActive = activeHref === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                                                ? 'bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] text-[var(--color-brand-navy)] font-semibold'
                                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                                            } ${sidebarCollapsed ? 'justify-center' : ''}`}
                                        title={sidebarCollapsed ? item.label : ''}
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[var(--color-brand-navy)] rounded-r-full" />
                                        )}
                                        <Icon className={`w-5 h-5 shrink-0 transition-colors flex-shrink-0 ${isActive ? 'text-[var(--color-brand-navy)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                                            }`} />
                                        {!sidebarCollapsed && <span className="text-sm truncate">{item.label}</span>}
                                    </Link>
                                );
                            }
                        })}
                    </nav>

                    {/* Bottom section */}
                    <div className="p-3 border-t border-[var(--border-default)] space-y-1">
                        {!sidebarCollapsed && (
                            <button
                                onClick={() => { router.push('/dashboard/profile'); setSidebarOpen(false); }}
                                className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-all duration-200"
                            >
                                <User className="w-5 h-5 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--color-brand-navy)]" />
                                <span className="text-sm font-medium">Tài khoản</span>
                            </button>
                        )}
                        {sidebarCollapsed && (
                            <button
                                onClick={() => { router.push('/dashboard/profile'); setSidebarOpen(false); }}
                                className="group flex items-center justify-center w-full p-2.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--color-brand-navy)] transition-all duration-200"
                                title="Tài khoản"
                            >
                                <User className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className={`min-h-screen flex flex-col transition-all duration-300 ease-out ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[var(--border-default)] shadow-[var(--shadow-xs)]">
                    {/* Gradient accent line */}
                    <div className="h-[2px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />

                    <div className="flex items-center justify-between px-4 lg:px-6 py-3 gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden text-[var(--text-muted)] hover:text-[var(--color-brand-navy)] p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            {/* Global Search */}
                            <div className="hidden md:block flex-1 max-w-lg">
                                <GlobalSearch />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* CTA — Create Event */}
                            {(user?.role === 'admin' || user?.role === 'organizer') && (
                                <Link
                                    href="/dashboard/events/create"
                                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--color-brand-navy)] to-[#1a5fc8] text-white rounded-xl hover:opacity-90 transition-all duration-200 shadow-[var(--shadow-brand)] hover:shadow-[var(--shadow-md)] hover:-translate-y-px font-semibold text-sm active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Tạo sự kiện</span>
                                </Link>
                            )}

                            {/* Notification Bell */}
                            <NotificationBell />

                            {/* User Profile Menu */}
                            <UserProfileMenu />
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
