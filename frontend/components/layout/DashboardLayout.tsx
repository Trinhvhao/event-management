'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Calendar,
    Home,
    Bell,
    User,
    LogOut,
    Menu,
    X,
    Award,
    QrCode,
    BarChart3,
    Users,
    Search,
    Plus,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    Settings,
    FileText,
    Shield
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import NotificationBell from '@/components/dashboard/NotificationBell';
import GlobalSearch from '@/components/dashboard/GlobalSearch';
import UserProfileMenu from '@/components/dashboard/UserProfileMenu';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        toast.success('Đăng xuất thành công');
        router.push('/login');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    // Simplified navigation items based on role
    const getNavItems = () => {
        if (user?.role === 'admin') {
            return [
                { href: '/dashboard', icon: Home, label: 'Dashboard' },
                {
                    label: 'Sự kiện',
                    items: [
                        { href: '/dashboard/events', icon: Calendar, label: 'Danh sách sự kiện' },
                        { href: '/dashboard/events/calendar', icon: Calendar, label: 'Lịch sự kiện' },
                        { href: '/dashboard/events/pending', icon: CheckSquare, label: 'Phê duyệt sự kiện' }
                    ]
                },
                {
                    label: 'Người dùng',
                    items: [
                        { href: '/dashboard/admin/users', icon: Users, label: 'Quản lý người dùng' },
                        { href: '/dashboard/admin/organizers', icon: User, label: 'Ban tổ chức' }
                    ]
                },
                { href: '/dashboard/training-points', icon: Award, label: 'Điểm rèn luyện' },
                { href: '/dashboard/statistics', icon: BarChart3, label: 'Thống kê' },
                {
                    label: 'Cài đặt hệ thống',
                    items: [
                        { href: '/dashboard/settings/roles', icon: Shield, label: 'Phân quyền' },
                        { href: '/dashboard/settings/categories', icon: FileText, label: 'Danh mục' }
                    ]
                }
            ];
        }

        if (user?.role === 'organizer') {
            return [
                { href: '/dashboard', icon: Home, label: 'Trang chủ' },
                { href: '/dashboard/my-events', icon: Calendar, label: 'Sự kiện của tôi' },
                { href: '/dashboard/events', icon: QrCode, label: 'Tất cả sự kiện' },
                { href: '/dashboard/checkin', icon: CheckSquare, label: 'Check-in' },
                { href: '/dashboard/statistics', icon: BarChart3, label: 'Thống kê' },
            ];
        }

        // Student
        return [
            { href: '/dashboard', icon: Home, label: 'Trang chủ' },
            { href: '/dashboard/events', icon: Calendar, label: 'Khám phá sự kiện' },
            { href: '/dashboard/my-registrations', icon: CheckSquare, label: 'Sự kiện đã đăng ký' },
            { href: '/dashboard/training-points', icon: Award, label: 'Điểm rèn luyện' },
        ];
    };

    const navItems = getNavItems();

    const getRoleBadge = () => {
        const roleMap = {
            admin: { label: 'Quản trị viên', color: 'bg-red-100 text-red-700' },
            organizer: { label: 'Ban tổ chức', color: 'bg-blue-100 text-blue-700' },
            student: { label: 'Sinh viên', color: 'bg-green-100 text-green-700' },
        };
        return roleMap[user?.role || 'student'];
    };

    return (
        <div className="min-h-screen bg-offWhite">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen bg-white border-r border-gray-200 shadow-sm transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
            >
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:flex absolute -right-3 top-24 z-20 h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-primary transition-colors"
                    title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
                    aria-label={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                >
                    {sidebarCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </button>

                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        {!sidebarCollapsed && (
                            <Link href="/dashboard" className="flex items-center space-x-2 group">
                                <div className="w-8 h-8 bg-linear-to-br from-brandBlue to-indigo-500 rounded-lg flex items-center justify-center shadow-sm shadow-brandBlue/20 transition-transform group-hover:scale-105">
                                    <span className="text-white font-bold text-sm tracking-wide">DN</span>
                                </div>
                                <span className="text-lg font-bold text-primary tracking-tight">DaiNam Events</span>
                            </Link>
                        )}
                        {sidebarCollapsed && (
                            <div className="w-8 h-8 bg-linear-to-br from-brandBlue to-indigo-500 rounded-lg flex items-center justify-center mx-auto">
                                <span className="text-white font-bold text-sm">DN</span>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-gray-500 hover:text-primary"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                        {navItems.map((item, index) => {
                            if ('items' in item && item.items) {
                                // Group header
                                return (
                                    <div key={index} className="space-y-1">
                                        {!sidebarCollapsed && (
                                            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                {item.label}
                                            </div>
                                        )}
                                        {item.items.map((subItem) => {
                                            const Icon = subItem.icon;
                                            const isActive = pathname === subItem.href;
                                            return (
                                                <Link
                                                    key={subItem.href}
                                                    href={subItem.href}
                                                    className={`relative flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                                        ? 'bg-brandLightBlue/20 text-brandBlue font-semibold'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                        }`}
                                                    title={sidebarCollapsed ? subItem.label : ''}
                                                    onClick={() => setSidebarOpen(false)}
                                                >
                                                    {isActive && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brandBlue rounded-r-md" />
                                                    )}
                                                    <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-brandBlue' : 'text-slate-400 group-hover:text-slate-600'
                                                        }`} />
                                                    {!sidebarCollapsed && <span className="text-sm">{subItem.label}</span>}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                );
                            } else {
                                // Regular item
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`relative flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                            ? 'bg-brandLightBlue/20 text-brandBlue font-semibold'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                        title={sidebarCollapsed ? item.label : ''}
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brandBlue rounded-r-md" />
                                        )}
                                        <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-brandBlue' : 'text-slate-400 group-hover:text-slate-600'
                                            }`} />
                                        {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                                    </Link>
                                );
                            }
                        })}
                    </nav>

                    {/* Logout button */}
                    {!sidebarCollapsed && (
                        <div className="p-3 border-t border-gray-200">
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="w-5 h-5 shrink-0" />
                                <span className="font-medium text-sm">Đăng xuất</span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main content */}
            <div className={`min-h-screen flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between px-4 lg:px-6 py-3 gap-4">
                        <div className="flex items-center space-x-4 flex-1">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden text-gray-500 hover:text-brandBlue p-2"
                            >
                                <Menu className="w-6 h-6" />
                            </button>

                            {/* Global Search */}
                            <div className="hidden md:block flex-1 max-w-xl">
                                <GlobalSearch />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* CTA Button - Create Event for Admin/Organizer */}
                            {(user?.role === 'admin' || user?.role === 'organizer') && (
                                <Link
                                    href="/dashboard/events/create"
                                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brandBlue text-white rounded-lg hover:bg-brandBlue/90 transition-colors shadow-sm font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="text-sm">Tạo sự kiện</span>
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
