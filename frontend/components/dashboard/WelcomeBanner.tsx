import { motion } from 'framer-motion';
import { Activity, FileCheck, Download, AlertCircle } from 'lucide-react';
import { UserRole } from '@/types';
import Link from 'next/link';

interface QuickLink {
    icon: React.ReactNode;
    text: string;
    href: string;
    badge?: number;
}

interface WelcomeBannerProps {
    userName: string;
    role: UserRole;
    quickLinks?: QuickLink[];
}

export default function WelcomeBanner({ userName, role, quickLinks }: WelcomeBannerProps) {
    const roleLabels: Record<UserRole, string> = {
        admin: 'Quản trị viên hệ thống',
        organizer: 'Ban tổ chức sự kiện',
        student: 'Sinh viên',
    };

    const descriptions: Record<UserRole, string> = {
        admin: 'Tổng quan hệ thống quản lý sự kiện - Đại học Đại Nam',
        organizer: 'Quản lý và tổ chức các sự kiện của bạn',
        student: 'Khám phá và tham gia các sự kiện thú vị',
    };

    const defaultQuickLinks: QuickLink[] = [
        {
            icon: <FileCheck className="w-4 h-4" />,
            text: 'Có 3 sự kiện đang chờ duyệt',
            href: '/dashboard/events/pending',
            badge: 3
        },
        {
            icon: <Download className="w-4 h-4" />,
            text: 'Xuất báo cáo điểm rèn luyện tháng này',
            href: '/dashboard/training-points/export'
        },
        {
            icon: <AlertCircle className="w-4 h-4" />,
            text: 'Xem thông báo hệ thống',
            href: '/dashboard/notifications'
        }
    ];

    const links = quickLinks || (role === 'admin' ? defaultQuickLinks : []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${role === 'admin'
                ? 'bg-linear-to-r from-brandBlue to-secondary'
                : 'bg-brandBlue'
                }`}
        >
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
            {role !== 'admin' && (
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
            )}

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {role === 'admin' && (
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <Activity className="w-6 h-6" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Xin chào, {userName}! 👋
                            </h1>
                            <p className="text-white/80 text-sm mt-1">{roleLabels[role]}</p>
                        </div>
                    </div>
                </div>

                {links.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4">
                        {links.map((link, index) => (
                            <Link
                                key={index}
                                href={link.href}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all duration-200 text-sm font-medium border border-white/20"
                            >
                                {link.icon}
                                <span>{link.text}</span>
                                {link.badge && (
                                    <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                        {link.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
