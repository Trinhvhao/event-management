'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Toggle from '@/components/ui/Toggle';
import { Bell, Calendar, ClipboardCheck, Award, UserCheck, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const STORAGE_KEY = 'notification_preferences';

interface NotificationPreferences {
    event_reminder: boolean;
    event_update: boolean;
    event_cancelled: boolean;
    registration_confirm: boolean;
    feedback_request: boolean;
    training_points_awarded: boolean;
    checkin_success: boolean;
}

const defaultPreferences: NotificationPreferences = {
    event_reminder: true,
    event_update: true,
    event_cancelled: true,
    registration_confirm: true,
    feedback_request: true,
    training_points_awarded: true,
    checkin_success: true,
};

type NotificationCategory = {
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    colorBg: string;
    items: {
        key: keyof NotificationPreferences;
        label: string;
        description: string;
    }[];
};

const notificationCategories: NotificationCategory[] = [
    {
        id: 'event',
        title: 'Sự kiện',
        icon: <Calendar className="w-5 h-5" />,
        color: 'text-blue-600',
        colorBg: 'bg-blue-100',
        items: [
            {
                key: 'event_reminder',
                label: 'Nhắc nhở sự kiện sắp diễn ra',
                description: 'Nhận thông báo trước khi sự kiện bắt đầu',
            },
            {
                key: 'event_update',
                label: 'Thông báo cập nhật sự kiện',
                description: 'Nhận thông báo khi có thay đổi về sự kiện',
            },
            {
                key: 'event_cancelled',
                label: 'Sự kiện bị hủy',
                description: 'Nhận thông báo khi sự kiện bị hủy hoặc hoãn',
            },
        ],
    },
    {
        id: 'registration',
        title: 'Đăng ký',
        icon: <ClipboardCheck className="w-5 h-5" />,
        color: 'text-green-600',
        colorBg: 'bg-green-100',
        items: [
            {
                key: 'registration_confirm',
                label: 'Xác nhận đăng ký thành công',
                description: 'Nhận xác nhận khi đăng ký sự kiện thành công',
            },
            {
                key: 'feedback_request',
                label: 'Nhắc đăng ký sự kiện',
                description: 'Nhận lời nhắc để gửi đánh giá sau sự kiện',
            },
        ],
    },
    {
        id: 'training_points',
        title: 'Điểm rèn luyện',
        icon: <Award className="w-5 h-5" />,
        color: 'text-amber-600',
        colorBg: 'bg-amber-100',
        items: [
            {
                key: 'training_points_awarded',
                label: 'Điểm rèn luyện được cộng',
                description: 'Nhận thông báo khi có điểm rèn luyện mới',
            },
        ],
    },
    {
        id: 'attendance',
        title: 'Điểm danh',
        icon: <UserCheck className="w-5 h-5" />,
        color: 'text-purple-600',
        colorBg: 'bg-purple-100',
        items: [
            {
                key: 'checkin_success',
                label: 'Check-in thành công',
                description: 'Nhận thông báo khi check-in thành công',
            },
        ],
    },
];

function LoadingSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-14 w-64 rounded-xl skeleton-animate" />
            <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-8">
                <div className="h-6 w-48 rounded-lg skeleton-animate mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-xl skeleton-animate" />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function NotificationPreferencesPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [hasChanges, setHasChanges] = useState(false);
    const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences>(defaultPreferences);

    const loadPreferences = useCallback(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setPreferences({ ...defaultPreferences, ...parsed });
                setOriginalPreferences({ ...defaultPreferences, ...parsed });
            } else {
                setPreferences(defaultPreferences);
                setOriginalPreferences(defaultPreferences);
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
            setPreferences(defaultPreferences);
            setOriginalPreferences(defaultPreferences);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    const handleToggle = (key: keyof NotificationPreferences) => {
        setPreferences(prev => {
            const updated = { ...prev, [key]: !prev[key] };
            setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalPreferences));
            return updated;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
            setOriginalPreferences(preferences);
            setHasChanges(false);
            toast.success('Lưu cài đặt thông báo thành công!');
        } catch (error) {
            console.error('Error saving preferences:', error);
            toast.error('Có lỗi xảy ra khi lưu cài đặt');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setPreferences(defaultPreferences);
        setHasChanges(JSON.stringify(defaultPreferences) !== JSON.stringify(originalPreferences));
    };

    if (loading) {
        return (
            <DashboardLayout>
                <LoadingSkeleton />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Top Accent Line */}
                <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)] rounded-full" />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cài đặt thông báo</h1>
                        <p className="text-[var(--text-muted)] text-sm mt-0.5">Quản lý các thông báo bạn nhận được</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasChanges && (
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[var(--border-default)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-muted)] transition-all"
                            >
                                <X className="w-4 h-4" />
                                Hủy thay đổi
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand-navy)] text-white font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </div>

                {/* Notification Categories */}
                {notificationCategories.map((category, categoryIndex) => (
                    <motion.section
                        key={category.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: categoryIndex * 0.05 }}
                        className="relative bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden"
                    >
                        {/* Category Header */}
                        <div className="p-6 border-b border-[var(--border-default)]">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${category.colorBg} flex items-center justify-center shadow-sm`}>
                                    <span className={category.color}>
                                        {category.icon}
                                    </span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--text-primary)]">{category.title}</h2>
                                    <p className="text-sm text-[var(--text-muted)]">
                                        {category.items.filter(item => preferences[item.key]).length}/{category.items.length} đã bật
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Toggle Items */}
                        <div className="divide-y divide-[var(--border-light)]">
                            {category.items.map((item) => (
                                <div
                                    key={item.key}
                                    className="flex items-center justify-between p-5 hover:bg-[var(--bg-muted)]/50 transition-colors"
                                >
                                    <div className="flex-1 pr-4">
                                        <p className="font-semibold text-[var(--text-primary)]">{item.label}</p>
                                        <p className="text-sm text-[var(--text-muted)] mt-0.5">{item.description}</p>
                                    </div>
                                    <Toggle
                                        checked={preferences[item.key]}
                                        onChange={() => handleToggle(item.key)}
                                    />
                                </div>
                            ))}
                        </div>
                    </motion.section>
                ))}

                {/* Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: notificationCategories.length * 0.05 }}
                    className="bg-blue-50 rounded-2xl border border-blue-200 p-5"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <Bell className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-blue-900">Lưu ý</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Một số thông báo quan trọng như thông báo hủy sự kiện có thể được gửi bất kể cài đặt của bạn để đảm bảo bạn không bỏ lỡ thông tin quan trọng.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
