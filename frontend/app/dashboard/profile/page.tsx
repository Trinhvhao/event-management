'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { User, Calendar, Edit2, Save, X, Eye, EyeOff, Shield, Mail, Phone, Building2, Award, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { profileService } from '@/services/profileService';
import type { User as AuthUser } from '@/types';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
};

interface UserProfile {
    id: number;
    email: string;
    full_name: string;
    student_id?: string;
    phone?: string;
    department?: {
        id: number;
        name: string;
    };
    role: string;
    created_at: string;
    last_login?: string;
    total_events_attended?: number;
    total_points?: number;
    registration_count?: number;
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    admin: {
        bg: 'bg-[color-mix(in_srgb,var(--color-brand-red)_10%,transparent)]',
        text: 'text-[var(--color-brand-red)]',
        border: 'border-[var(--color-brand-red)]/20'
    },
    organizer: {
        bg: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,transparent)]',
        text: 'text-[var(--color-brand-orange)]',
        border: 'border-[var(--color-brand-orange)]/20'
    },
    student: {
        bg: 'bg-[color-mix(in_srgb,var(--color-brand-green)_10%,transparent)]',
        text: 'text-[var(--color-brand-green)]',
        border: 'border-[var(--color-brand-green)]/20'
    }
};

const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    organizer: 'Người tổ chức',
    student: 'Sinh viên'
};

function LoadingSkeleton() {
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header Skeleton */}
            <div className="h-14 w-64 rounded-xl skeleton-animate" />
            {/* Hero Card Skeleton */}
            <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] relative">
                    <div className="absolute -bottom-12 left-8">
                        <div className="w-32 h-32 rounded-full skeleton-animate bg-white/30" />
                    </div>
                </div>
                <div className="pt-16 px-8 pb-8">
                    <div className="h-8 w-64 rounded-lg skeleton-animate mb-3" />
                    <div className="h-5 w-48 rounded-lg skeleton-animate mb-6" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 rounded-2xl skeleton-animate" />
                        ))}
                    </div>
                </div>
            </div>
            {/* Form Skeleton */}
            <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-8">
                <div className="h-6 w-48 rounded-lg skeleton-animate mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-14 rounded-xl skeleton-animate" />
                    <div className="h-14 rounded-xl skeleton-animate" />
                    <div className="h-14 rounded-xl skeleton-animate" />
                    <div className="h-14 rounded-xl skeleton-animate" />
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const router = useRouter();
    const { user: authUser, token, isAuthenticated, isHydrated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const fetchProfile = useCallback(async () => {
        try {
            let userData: UserProfile | null = (authUser as UserProfile | null) || null;

            if (!userData) {
                userData = (await profileService.getProfile()) as UserProfile;
            }

            if (!userData) {
                throw new Error('Không tải được thông tin người dùng');
            }

            setUser(userData);
            setFormData({
                full_name: userData.full_name || '',
                phone: userData.phone || '',
                current_password: '',
                new_password: '',
                confirm_password: '',
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Không thể tải thông tin cá nhân');
        } finally {
            setLoading(false);
        }
    }, [authUser]);

    useEffect(() => {
        if (!isHydrated) {
            return;
        }

        if (!isAuthenticated || !token) {
            router.push('/login');
            return;
        }
        fetchProfile();
    }, [router, token, fetchProfile, isAuthenticated, isHydrated]);

    const handleSave = async () => {
        if (!formData.full_name.trim()) {
            toast.error('Vui lòng nhập họ và tên');
            return;
        }

        if (formData.new_password) {
            if (formData.new_password !== formData.confirm_password) {
                toast.error('Mật khẩu mới không khớp');
                return;
            }
            if (!formData.current_password) {
                toast.error('Vui lòng nhập mật khẩu hiện tại');
                return;
            }
            if (formData.new_password.length < 8) {
                toast.error('Mật khẩu mới phải có ít nhất 8 ký tự');
                return;
            }
        }

        setSaving(true);
        try {
            const updatedUser: AuthUser = await profileService.updateProfile({
                full_name: formData.full_name.trim(),
                phone: formData.phone || undefined,
            });

            useAuthStore.getState().updateUser(updatedUser);

            if (formData.current_password && formData.new_password) {
                await profileService.changePassword({
                    old_password: formData.current_password,
                    new_password: formData.new_password,
                });
                toast.success('Đổi mật khẩu thành công!');
            }

            toast.success('Cập nhật thông tin thành công!');
            setEditing(false);
            setFormData(prev => ({
                ...prev,
                current_password: '',
                new_password: '',
                confirm_password: '',
            }));
            await fetchProfile();
        } catch (error: unknown) {
            const msg = getErrorMessage(error, 'Có lỗi xảy ra khi cập nhật');
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                phone: user.phone || '',
                current_password: '',
                new_password: '',
                confirm_password: '',
            });
        }
        setEditing(false);
    };

    const getInitials = (name: string): string => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U';
    };

    const roleConfig = user ? roleColors[user.role] || roleColors.student : roleColors.student;

    if (!isHydrated || loading) {
        return (
            <DashboardLayout>
                <LoadingSkeleton />
            </DashboardLayout>
        );
    }

    if (!user) {
        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[color-mix(in_srgb,var(--color-brand-red)_10%,transparent)] flex items-center justify-center">
                            <X className="w-8 h-8 text-[var(--color-brand-red)]" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Không tải được thông tin cá nhân</h2>
                        <p className="text-[var(--text-muted)] mb-6">Vui lòng tải lại trang hoặc đăng nhập lại.</p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={fetchProfile}
                                className="px-5 py-2.5 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-muted)] transition-all"
                            >
                                Thử lại
                            </button>
                            <button
                                onClick={() => router.push('/login')}
                                className="px-5 py-2.5 rounded-xl bg-[var(--color-brand-navy)] text-white font-semibold hover:opacity-90 transition-all"
                            >
                                Đăng nhập lại
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Top Accent Line */}
                <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)] rounded-full" />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Hồ sơ cá nhân</h1>
                        <p className="text-[var(--text-muted)] text-sm mt-0.5">Quản lý thông tin tài khoản của bạn</p>
                    </div>
                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand-navy)] text-white font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all"
                        >
                            <Edit2 className="w-4 h-4" />
                            Chỉnh sửa
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-[var(--border-default)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-muted)] transition-all disabled:opacity-50"
                            >
                                <X className="w-4 h-4" />
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand-navy)] text-white font-semibold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Hero Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)]"
                >
                    {/* Gradient Background */}
                    <div className="h-40 bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] relative">
                        {/* Decorative Elements */}
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-white/5" />
                            <div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-white/5" />
                        </div>
                        {/* Top Accent Line */}
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    </div>

                    {/* Avatar */}
                    <div className="absolute -bottom-16 left-8">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] border-4 border-white shadow-[var(--shadow-brand)] flex items-center justify-center">
                            <span className="text-5xl font-bold text-white">
                                {getInitials(user.full_name || 'User')}
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="pt-20 px-8 pb-8">
                        <div className="flex items-start justify-between flex-wrap gap-4">
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">{user.full_name}</h2>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}>
                                        <Shield className="w-3.5 h-3.5" />
                                        {roleLabels[user.role] || user.role}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-[var(--text-muted)]">
                                    <Mail className="w-4 h-4" />
                                    <span className="text-sm">{user.email}</span>
                                </div>
                                {user.department && (
                                    <div className="flex items-center gap-2 mt-1 text-[var(--text-muted)]">
                                        <Building2 className="w-4 h-4" />
                                        <span className="text-sm">{user.department.name}</span>
                                    </div>
                                )}
                                {user.student_id && (
                                    <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-light)_20%,transparent)] border border-[var(--color-brand-light)]">
                                        <span className="text-xs font-bold text-[var(--color-brand-navy)]">MSSV:</span>
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">{user.student_id}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                            <div className="bg-[var(--bg-muted)] rounded-2xl p-5 border border-[var(--border-light)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                        <Calendar className="w-5.5 h-5.5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-[var(--text-primary)]">{user.total_events_attended ?? 0}</p>
                                        <p className="text-xs font-medium text-[var(--text-muted)]">Sự kiện đã tham dự</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[var(--bg-muted)] rounded-2xl p-5 border border-[var(--border-light)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                        <Award className="w-5.5 h-5.5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-[var(--text-primary)]">{user.total_points ?? 0}</p>
                                        <p className="text-xs font-medium text-[var(--text-muted)]">Tổng điểm rèn luyện</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[var(--bg-muted)] rounded-2xl p-5 border border-[var(--border-light)]">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                        <Ticket className="w-5.5 h-5.5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-[var(--text-primary)]">{user.registration_count ?? 0}</p>
                                        <p className="text-xs font-medium text-[var(--text-muted)]">Lượt đăng ký</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Edit Form Card */}
                {editing && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />

                        <div className="p-8">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                    <User className="w-4.5 h-4.5 text-white" />
                                </div>
                                Chỉnh sửa thông tin
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Full Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                                        Họ và tên <span className="text-[var(--color-brand-red)]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Nhập họ và tên"
                                        className="input-base"
                                    />
                                </div>

                                {/* Email (readonly) */}
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className="input-base bg-[var(--bg-muted)] cursor-not-allowed opacity-70"
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                                        Số điện thoại
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-muted)]" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="Nhập số điện thoại"
                                            className="input-base pl-11"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Password Section */}
                            <div className="mt-8 pt-8 border-t border-[var(--border-default)]">
                                <h4 className="text-base font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-[var(--color-brand-navy)]" />
                                    Đổi mật khẩu
                                    <span className="text-xs font-medium text-[var(--text-muted)]">(Để trống nếu không đổi)</span>
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Current Password */}
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                                            Mật khẩu hiện tại
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.current ? 'text' : 'password'}
                                                value={formData.current_password}
                                                onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                                                placeholder="••••••••"
                                                className="input-base pr-11"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                            >
                                                {showPasswords.current ? (
                                                    <EyeOff className="w-4.5 h-4.5" />
                                                ) : (
                                                    <Eye className="w-4.5 h-4.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* New Password */}
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                                            Mật khẩu mới
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.new ? 'text' : 'password'}
                                                value={formData.new_password}
                                                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                                                placeholder="Tối thiểu 8 ký tự"
                                                className="input-base pr-11"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                            >
                                                {showPasswords.new ? (
                                                    <EyeOff className="w-4.5 h-4.5" />
                                                ) : (
                                                    <Eye className="w-4.5 h-4.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                                            Xác nhận mật khẩu
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.confirm ? 'text' : 'password'}
                                                value={formData.confirm_password}
                                                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                                placeholder="Nhập lại mật khẩu"
                                                className="input-base pr-11"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                            >
                                                {showPasswords.confirm ? (
                                                    <EyeOff className="w-4.5 h-4.5" />
                                                ) : (
                                                    <Eye className="w-4.5 h-4.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                )}

                {/* Account Info Card */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden"
                >
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />

                    <div className="p-8">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                <Shield className="w-4.5 h-4.5 text-white" />
                            </div>
                            Thông tin tài khoản
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Role */}
                            <div className="bg-[var(--bg-muted)] rounded-xl p-4 border border-[var(--border-light)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-[var(--color-brand-navy)]" />
                                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Vai trò</span>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}>
                                    {roleLabels[user.role] || user.role}
                                </span>
                            </div>

                            {/* Department */}
                            <div className="bg-[var(--bg-muted)] rounded-xl p-4 border border-[var(--border-light)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="w-4 h-4 text-[var(--color-brand-navy)]" />
                                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Khoa</span>
                                </div>
                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                    {user.department?.name || 'Chưa xác định'}
                                </p>
                            </div>

                            {/* Join Date */}
                            <div className="bg-[var(--bg-muted)] rounded-xl p-4 border border-[var(--border-light)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-[var(--color-brand-navy)]" />
                                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Ngày tham gia</span>
                                </div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    {new Date(user.created_at).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>

                            {/* Last Login */}
                            <div className="bg-[var(--bg-muted)] rounded-xl p-4 border border-[var(--border-light)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-[var(--color-brand-navy)]" />
                                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Đăng nhập cuối</span>
                                </div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    {user.last_login
                                        ? new Date(user.last_login).toLocaleDateString('vi-VN', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        : 'Gần đây'}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.section>
            </div>
        </DashboardLayout>
    );
}
