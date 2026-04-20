'use client';

import { motion } from 'framer-motion';
import { Activity, FileCheck, Download, AlertCircle, Zap, TrendingUp } from 'lucide-react';
import { UserRole } from '@/types';
import Link from 'next/link';

interface QuickLink {
    icon: React.ReactNode;
    text: string;
    href: string;
    badge?: number;
    variant?: 'default' | 'highlight';
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

    const roleGradients: Record<UserRole, { bg: string; badge: string; badgeText: string }> = {
        admin: {
            bg: 'bg-gradient-to-br from-[var(--color-brand-navy)] via-[#0047ab] to-[#1a5fc8]',
            badge: 'bg-white/20 backdrop-blur-sm',
            badgeText: 'text-white',
        },
        organizer: {
            bg: 'bg-gradient-to-br from-[#1a5fc8] via-[var(--color-brand-navy)] to-[#002f6e]',
            badge: 'bg-[var(--color-brand-orange)]/20',
            badgeText: 'text-[var(--color-brand-orange)]',
        },
        student: {
            bg: 'bg-gradient-to-br from-[var(--color-brand-green)] via-[#00875a] to-[#006644]',
            badge: 'bg-[var(--color-brand-gold)]/20',
            badgeText: 'text-[var(--color-brand-gold)]',
        },
    };

    const defaultQuickLinks: QuickLink[] = [
        {
            icon: <FileCheck className="w-4 h-4" />,
            text: 'Sự kiện đang chờ duyệt',
            href: '/dashboard/events/pending',
            badge: 3,
            variant: 'highlight',
        },
        {
            icon: <Download className="w-4 h-4" />,
            text: 'Xuất báo cáo tháng này',
            href: '/dashboard/training-points/export',
        },
        {
            icon: <AlertCircle className="w-4 h-4" />,
            text: 'Thông báo hệ thống',
            href: '/dashboard/notifications',
        },
    ];

    const links = quickLinks || (role === 'admin' ? defaultQuickLinks : []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`relative overflow-hidden rounded-2xl ${roleGradients[role].bg} text-white shadow-xl`}
        >
            {/* Decorative orbs */}
            <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[var(--color-brand-orange)]/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 p-6 md:p-8">
                {/* Top row: role badge + greeting */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        {/* Animated icon */}
                        <motion.div
                            className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg"
                            initial={{ rotate: -10, scale: 0.9 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
                        >
                            <Activity className="w-6 h-6" />
                        </motion.div>

                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                                Xin chào, {userName}!
                            </h1>
                            <p className="text-white/80 text-sm mt-0.5 font-medium flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${roleGradients[role].badge} ${roleGradients[role].badgeText}`}>
                                    <Zap className="w-3 h-3" />
                                    {roleLabels[role]}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Decorative trend indicator */}
                    <motion.div
                        className="hidden md:flex items-center gap-2 text-white/60 text-sm font-medium"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <TrendingUp className="w-4 h-4 text-[var(--color-brand-gold)]" />
                        <span>Hệ thống hoạt động tốt</span>
                    </motion.div>
                </div>

                {/* Quick Links */}
                {links.length > 0 && (
                    <motion.div
                        className="flex flex-wrap gap-2.5"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                    >
                        {links.map((link, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35 + index * 0.07, duration: 0.3 }}
                            >
                                <Link
                                    href={link.href}
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 active:scale-95 ${
                                        link.variant === 'highlight'
                                            ? 'bg-white/15 hover:bg-white/25 backdrop-blur-sm border-white/25 text-white hover:border-white/40'
                                            : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/20 text-white/90 hover:border-white/30 hover:text-white'
                                    }`}
                                >
                                    {link.icon}
                                    <span>{link.text}</span>
                                    {link.badge !== undefined && (
                                        <span className="ml-0.5 px-2 py-0.5 bg-[var(--color-brand-red)] text-white text-[11px] font-bolder rounded-full shadow-md">
                                            {link.badge}
                                        </span>
                                    )}
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Bottom wave decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--color-brand-orange)] via-[var(--color-brand-gold)] to-[var(--color-brand-green)]" />
        </motion.div>
    );
}
