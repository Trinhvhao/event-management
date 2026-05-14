'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Toggle from '@/components/ui/Toggle';
import {
    Settings,
    Bell,
    Shield,
    Eye,
    EyeOff,
    Save,
    X,
    Lock,
    Smartphone,
    Mail,
    Monitor,
    Building2,
    Globe,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

type TabId = 'notifications' | 'security' | 'appearance' | 'general';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    badge?: string;
}

interface NotificationPreferences {
    event_reminder: boolean;
    event_update: boolean;
    event_cancelled: boolean;
    registration_confirm: boolean;
    feedback_request: boolean;
    training_points_awarded: boolean;
    checkin_success: boolean;
    email_notifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
    event_reminder: true,
    event_update: true,
    event_cancelled: true,
    registration_confirm: true,
    feedback_request: true,
    training_points_awarded: true,
    checkin_success: true,
    email_notifications: true,
};

const NOTIFICATION_ITEMS: { key: keyof Omit<NotificationPreferences, 'email_notifications'>; label: string; description: string; category: string; color: string }[] = [
    { key: 'event_reminder', label: 'Nhắc nhở sự kiện sắp diễn ra', description: 'Nhận thông báo trước khi sự kiện bắt đầu', category: 'Sự kiện', color: '#00358F' },
    { key: 'event_update', label: 'Thông báo cập nhật sự kiện', description: 'Nhận thông báo khi có thay đổi về sự kiện', category: 'Sự kiện', color: '#00358F' },
    { key: 'event_cancelled', label: 'Sự kiện bị hủy hoặc hoãn', description: 'Nhận thông báo khi sự kiện bị hủy hoặc hoãn', category: 'Sự kiện', color: '#dc2626' },
    { key: 'registration_confirm', label: 'Xác nhận đăng ký thành công', description: 'Nhận xác nhận khi đăng ký sự kiện thành công', category: 'Đăng ký', color: '#00A651' },
    { key: 'feedback_request', label: 'Nhắc gửi đánh giá', description: 'Nhận lời nhắc để gửi đánh giá sau sự kiện', category: 'Đăng ký', color: '#00A651' },
    { key: 'training_points_awarded', label: 'Điểm rèn luyện được cộng', description: 'Nhận thông báo khi có điểm rèn luyện mới', category: 'Điểm rèn luyện', color: '#F26600' },
    { key: 'checkin_success', label: 'Check-in thành công', description: 'Nhận thông báo khi check-in thành công', category: 'Điểm danh', color: '#8b5cf6' },
];

const NOTIF_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    'Sự kiện': { bg: 'bg-blue-100', text: 'text-blue-600' },
    'Đăng ký': { bg: 'bg-green-100', text: 'text-green-600' },
    'Điểm rèn luyện': { bg: 'bg-amber-100', text: 'text-amber-600' },
    'Điểm danh': { bg: 'bg-purple-100', text: 'text-purple-600' },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Sự kiện': <span className="text-blue-600 text-base">📅</span>,
    'Đăng ký': <span className="text-green-600 text-base">✓</span>,
    'Điểm rèn luyện': <span className="text-amber-600 text-base">⭐</span>,
    'Điểm danh': <span className="text-purple-600 text-base">📋</span>,
};

const NOTIFICATION_STORAGE_KEY = 'settings_notification_prefs_v2';

export default function SettingsPage() {
    const router = useRouter();
    const { user, isHydrated, isAuthenticated } = useAuthStore();
    const [activeTab, setActiveTab] = useState<TabId>('notifications');

    // Notifications state
    const [loadingNotif, setLoadingNotif] = useState(true);
    const [savingNotif, setSavingNotif] = useState(false);
    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(defaultPreferences);
    const [originalNotifPrefs, setOriginalNotifPrefs] = useState<NotificationPreferences>(defaultPreferences);

    // Appearance state
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [compactMode, setCompactMode] = useState(false);
    const [highContrast, setHighContrast] = useState(false);

    // Security state
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [recentActivity] = useState<{ device: string; time: string; current: boolean }[]>([
        { device: 'Chrome on Windows', time: '2026-05-14 19:00', current: true },
        { device: 'Safari on iPhone', time: '2026-05-13 15:30', current: false },
    ]);

    useEffect(() => {
        if (!isHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
    }, [isHydrated, isAuthenticated, router]);

    // Load notification preferences
    const loadNotifPrefs = useCallback(async () => {
        try {
            const response = await fetch('/api/notifications/preferences', {
                headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
            });
            if (response.ok) {
                const data = await response.json();
                const loaded = { ...defaultPreferences, ...data };
                setNotificationPrefs(loaded);
                setOriginalNotifPrefs(loaded);
            }
        } catch {
            const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setNotificationPrefs({ ...defaultPreferences, ...parsed });
                setOriginalNotifPrefs({ ...defaultPreferences, ...parsed });
            }
        } finally {
            setLoadingNotif(false);
        }
    }, []);

    useEffect(() => {
        if (isHydrated) {
            loadNotifPrefs();
        }
    }, [isHydrated, loadNotifPrefs]);

    // Tabs for each role
    const getTabs = (): Tab[] => {
        const role = user?.role;
        if (role === 'admin') {
            return [
                { id: 'general', label: 'Tổng quát', icon: <Settings className="w-4 h-4" /> },
                { id: 'notifications', label: 'Thông báo', icon: <Bell className="w-4 h-4" /> },
                { id: 'security', label: 'Bảo mật', icon: <Shield className="w-4 h-4" /> },
                { id: 'appearance', label: 'Giao diện', icon: <Monitor className="w-4 h-4" /> },
            ];
        }
        if (role === 'organizer') {
            return [
                { id: 'notifications', label: 'Thông báo', icon: <Bell className="w-4 h-4" /> },
                { id: 'security', label: 'Bảo mật', icon: <Shield className="w-4 h-4" /> },
                { id: 'appearance', label: 'Giao diện', icon: <Monitor className="w-4 h-4" /> },
            ];
        }
        // participant
        return [
            { id: 'notifications', label: 'Thông báo', icon: <Bell className="w-4 h-4" /> },
            { id: 'security', label: 'Bảo mật', icon: <Shield className="w-4 h-4" /> },
            { id: 'appearance', label: 'Giao diện', icon: <Monitor className="w-4 h-4" /> },
        ];
    };

    const tabs = getTabs();
    const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];

    const hasNotifChanges = JSON.stringify(notificationPrefs) !== JSON.stringify(originalNotifPrefs);

    const handleNotifToggle = (key: keyof NotificationPreferences) => {
        setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSaveNotifications = async () => {
        setSavingNotif(true);
        try {
            await fetch('/api/notifications/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${useAuthStore.getState().token}`,
                },
                body: JSON.stringify(notificationPrefs),
            });
            localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationPrefs));
            setOriginalNotifPrefs(notificationPrefs);
            toast.success('Lưu cài đặt thông báo thành công!');
        } catch {
            localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationPrefs));
            setOriginalNotifPrefs(notificationPrefs);
            toast.success('Lưu cài đặt thông báo thành công!');
        } finally {
            setSavingNotif(false);
        }
    };

    const groupedNotifItems = NOTIFICATION_ITEMS.reduce<Record<string, typeof NOTIFICATION_ITEMS>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    const enabledNotifCount = Object.entries(notificationPrefs)
        .filter(([k, v]) => k !== 'email_notifications' && v).length;

    if (!isHydrated) {
        return (
            <DashboardLayout>
                <div className="max-w-6xl mx-auto p-4 md:p-6">
                    <div className="h-14 w-64 rounded-xl skeleton-animate mb-6" />
                    <div className="bg-white rounded-2xl border border-[var(--border-default)] p-8">
                        <div className="h-6 w-48 rounded-lg skeleton-animate mb-8" />
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl skeleton-animate" />)}
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
                {/* Top Accent */}
                <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)] rounded-full" />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cài đặt</h1>
                        <p className="text-[var(--text-muted)] text-sm mt-0.5">
                            Quản lý tài khoản, thông báo và giao diện
                        </p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                    <div className="flex overflow-x-auto scrollbar-none">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all
                                    ${activeTab === tab.id
                                        ? 'border-[var(--color-brand-navy)] text-[var(--color-brand-navy)] bg-[var(--color-brand-navy)]/5'
                                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
                                    }
                                `}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* ── NOTIFICATIONS TAB ── */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            {/* Email Master Toggle */}
                            <div className="relative bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] rounded-2xl shadow-lg overflow-hidden">
                                <div className="p-6 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                            <Mail className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Thông báo qua Email</h2>
                                            <p className="text-white/70 text-sm mt-0.5">Nhận email chi tiết cho các thông báo quan trọng</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={notificationPrefs.email_notifications}
                                        onChange={() => handleNotifToggle('email_notifications')}
                                    />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-brand-orange)] to-[var(--color-brand-gold)] opacity-60" />
                            </div>

                            {/* Notification categories */}
                            {Object.entries(groupedNotifItems).map(([category, items]) => {
                                const catColor = NOTIF_CATEGORY_COLORS[category];
                                return (
                                    <div key={category} className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                                        <div className="p-5 border-b border-[var(--border-default)] flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl ${catColor.bg} flex items-center justify-center`}>
                                                {CATEGORY_ICONS[category]}
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-[var(--text-primary)]">{category}</h2>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {items.filter(i => notificationPrefs[i.key]).length}/{items.length} đã bật
                                                </p>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-[var(--border-light)]">
                                            {items.map(item => (
                                                <div key={item.key} className="flex items-center justify-between p-5 hover:bg-[var(--bg-muted)]/40 transition-colors">
                                                    <div className="flex-1 pr-4">
                                                        <p className="font-semibold text-[var(--text-primary)]">{item.label}</p>
                                                        <p className="text-sm text-[var(--text-muted)] mt-0.5">{item.description}</p>
                                                    </div>
                                                    <Toggle
                                                        checked={notificationPrefs[item.key]}
                                                        onChange={() => handleNotifToggle(item.key)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Channels summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white rounded-2xl border border-[var(--border-default)] p-5 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                        <Smartphone className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)] text-sm">Thông báo trong ứng dụng</p>
                                        <p className="text-xs text-[var(--text-muted)]">{enabledNotifCount} loại đang bật</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl border border-[var(--border-default)] p-5 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                                        <Mail className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)] text-sm">Thông báo qua Email</p>
                                        <p className="text-xs text-[var(--text-muted)]">{notificationPrefs.email_notifications ? 'Đang bật' : 'Đang tắt'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Save bar */}
                            <div className="flex items-center justify-end gap-3">
                                {hasNotifChanges && (
                                    <button
                                        onClick={() => setNotificationPrefs(originalNotifPrefs)}
                                        className="px-5 py-2.5 rounded-xl border-2 border-[var(--border-default)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-muted)] transition-all"
                                    >
                                        <X className="w-4 h-4 inline mr-1" /> Hủy thay đổi
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveNotifications}
                                    disabled={savingNotif || !hasNotifChanges}
                                    className="px-5 py-2.5 rounded-xl bg-[var(--color-brand-navy)] text-white font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="w-4 h-4 inline mr-1" /> {savingNotif ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── SECURITY TAB ── */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {/* Password */}
                            <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                                <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                                <div className="p-8">
                                    <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                            <Lock className="w-4 h-4 text-white" />
                                        </div>
                                        Đổi mật khẩu
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Mật khẩu hiện tại</label>
                                            <div className="relative">
                                                <input type={showPasswords.current ? 'text' : 'password'} className="input-base pr-11" placeholder="••••••••" />
                                                <button onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Mật khẩu mới</label>
                                            <div className="relative">
                                                <input type={showPasswords.new ? 'text' : 'password'} className="input-base pr-11" placeholder="Tối thiểu 8 ký tự" />
                                                <button onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">Xác nhận mật khẩu</label>
                                            <div className="relative">
                                                <input type={showPasswords.confirm ? 'text' : 'password'} className="input-base pr-11" placeholder="Nhập lại mật khẩu" />
                                                <button onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-3">Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.</p>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                                <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                                <div className="p-8">
                                    <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                            <Shield className="w-4 h-4 text-white" />
                                        </div>
                                        Thiết bị đã đăng nhập
                                    </h2>
                                    <div className="space-y-3">
                                        {recentActivity.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-muted)]/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                                                        <Globe className="w-5 h-5 text-[var(--color-brand-navy)]" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[var(--text-primary)] text-sm">{item.device}</p>
                                                        <p className="text-xs text-[var(--text-muted)]">{item.time}</p>
                                                    </div>
                                                </div>
                                                {item.current && (
                                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Hiện tại</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── APPEARANCE TAB ── */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                                <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                                <div className="p-8 space-y-6">
                                    {/* Theme */}
                                    <div>
                                        <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">Chế độ giao diện</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {([
                                                { value: 'light', label: 'Sáng', icon: '☀️', desc: 'Giao diện sáng mặc định' },
                                                { value: 'dark', label: 'Tối', icon: '🌙', desc: 'Giao diện tối dịu mắt' },
                                                { value: 'system', label: 'Hệ thống', icon: '💻', desc: 'Theo cài đặt thiết bị' },
                                            ] as const).map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setTheme(opt.value)}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all ${theme === opt.value
                                                        ? 'border-[var(--color-brand-navy)] bg-[var(--color-brand-navy)]/5'
                                                        : 'border-[var(--border-default)] hover:border-[var(--color-brand-navy)]/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-2xl">{opt.icon}</span>
                                                        <div>
                                                            <p className="font-bold text-[var(--text-primary)]">{opt.label}</p>
                                                            <p className="text-xs text-[var(--text-muted)]">{opt.desc}</p>
                                                        </div>
                                                    </div>
                                                    {theme === opt.value && (
                                                        <div className="w-full h-1 bg-[var(--color-brand-navy)] rounded-full mt-2" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t border-[var(--border-default)] pt-6 space-y-4">
                                        <h2 className="text-base font-bold text-[var(--text-primary)]">Tùy chọn hiển thị</h2>
                                        <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-default)]">
                                            <div>
                                                <p className="font-semibold text-[var(--text-primary)]">Chế độ compact</p>
                                                <p className="text-sm text-[var(--text-muted)]">Giảm khoảng cách, hiển thị nhiều nội dung hơn</p>
                                            </div>
                                            <Toggle checked={compactMode} onChange={() => setCompactMode(!compactMode)} />
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-default)]">
                                            <div>
                                                <p className="font-semibold text-[var(--text-primary)]">Độ tương phản cao</p>
                                                <p className="text-sm text-[var(--text-muted)]">Tăng độ tương phản cho dễ đọc</p>
                                            </div>
                                            <Toggle checked={highContrast} onChange={() => setHighContrast(!highContrast)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── GENERAL TAB (Admin only) ── */}
                    {activeTab === 'general' && user?.role === 'admin' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                                <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                                <div className="p-8">
                                    <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                            <Building2 className="w-4 h-4 text-white" />
                                        </div>
                                        Cấu hình hệ thống
                                    </h2>
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-muted)]/30">
                                            <div>
                                                <p className="font-semibold text-[var(--text-primary)]">Chế độ bảo trì</p>
                                                <p className="text-sm text-[var(--text-muted)]">Tạm khóa truy cập người dùng</p>
                                            </div>
                                            <Toggle checked={false} onChange={() => toast.info('Chế độ bảo trì sẽ được kích hoạt')} />
                                        </div>
                                        <div className="flex items-center justify-between p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-muted)]/30">
                                            <div>
                                                <p className="font-semibold text-[var(--text-primary)]">Yêu cầu xác thực email</p>
                                                <p className="text-sm text-[var(--text-muted)]">User phải xác thực email trước khi đăng nhập</p>
                                            </div>
                                            <Toggle checked={true} onChange={() => {}} />
                                        </div>
                                        <div className="flex items-center justify-between p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-muted)]/30">
                                            <div>
                                                <p className="font-semibold text-[var(--text-primary)]">Gửi email thông báo tự động</p>
                                                <p className="text-sm text-[var(--text-muted)]">Gửi email khi có đăng ký mới, check-in thành công...</p>
                                            </div>
                                            <Toggle checked={true} onChange={() => {}} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
