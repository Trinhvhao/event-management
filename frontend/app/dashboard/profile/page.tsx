'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { User, Calendar, Edit2, Save, X, Eye, EyeOff } from 'lucide-react';
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
}

export default function ProfilePage() {
    const router = useRouter();
    const { user: authUser, token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
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

            // Fallback to API so page works even when local persisted state is stale.
            if (!userData) {
                userData = (await profileService.getProfile()) as UserProfile;
            }

            if (!userData) {
                throw new Error('Không tải được thông tin người dùng');
            }

            setUser(userData);
            setFormData({
                full_name: userData.full_name || '',
                email: userData.email || '',
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
        if (!token) {
            router.push('/login');
            return;
        }
        fetchProfile();
    }, [router, token, fetchProfile]);

    const handleSave = async () => {
        if (formData.new_password && formData.new_password !== formData.confirm_password) {
            toast.error('Mật khẩu mới không khớp');
            return;
        }

        if (formData.new_password && !formData.current_password) {
            toast.error('Vui lòng nhập mật khẩu hiện tại');
            return;
        }

        try {
            // Update profile info
            const updatedUser: AuthUser = await profileService.updateProfile({
                full_name: formData.full_name,
            });

            // Update auth store with new user data
            useAuthStore.getState().updateUser(updatedUser);

            // Change password if provided
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
            // Refresh profile data
            await fetchProfile();
        } catch (error: unknown) {
            const msg = getErrorMessage(error, 'Có lỗi xảy ra khi cập nhật');
            toast.error(msg);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!user) {
        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto rounded-2xl border border-gray-200 bg-white p-8 text-center">
                    <h2 className="text-xl font-bold text-primary mb-2">Không tải được thông tin cá nhân</h2>
                    <p className="text-gray-600 mb-6">Vui lòng tải lại trang hoặc đăng nhập lại.</p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={fetchProfile}
                            className="px-4 py-2 rounded-lg border border-brandBlue text-brandBlue hover:bg-brandBlue/5 transition-colors"
                        >
                            Thử lại
                        </button>
                        <button
                            onClick={() => router.push('/login')}
                            className="px-4 py-2 rounded-lg bg-brandBlue text-white hover:bg-brandBlue/90 transition-colors"
                        >
                            Đăng nhập lại
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-primary mb-2">Thông tin cá nhân</h1>
                        <p className="text-gray-600">Quản lý thông tin tài khoản của bạn</p>
                    </div>
                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            className="px-5 py-2.5 bg-linear-to-r from-brandBlue to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            <Edit2 className="w-4 h-4" />
                            Chỉnh sửa
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setEditing(false);
                                    fetchProfile();
                                }}
                                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-5 py-2.5 bg-linear-to-r from-brandBlue to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Lưu
                            </button>
                        </div>
                    )}
                </div>

                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                >
                    {/* Header with gradient */}
                    <div className="h-32 bg-linear-to-r from-brandBlue to-secondary relative">
                        <div className="absolute -bottom-16 left-8">
                            <div className="w-32 h-32 bg-linear-to-br from-white to-brandLightBlue rounded-2xl border-4 border-white shadow-xl flex items-center justify-center">
                                <span className="text-5xl font-bold text-brandBlue">
                                    {user.full_name?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="pt-20 px-8 pb-8">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-primary mb-1">{user.full_name}</h2>
                            <p className="text-gray-500">{user.email}</p>
                            {user.student_id && (
                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-brandLightBlue/10 border border-brandLightBlue/30 rounded-lg">
                                    <span className="text-brandBlue font-bold text-sm">MSSV:</span>
                                    <span className="text-primary font-semibold">{user.student_id}</span>
                                </div>
                            )}
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-6">
                            {/* Basic Info Section */}
                            <div>
                                <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5 text-brandBlue" />
                                    Thông tin cơ bản
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Họ và tên
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            disabled={!editing}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:bg-gray-100 disabled:text-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            disabled
                                            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            disabled
                                            placeholder="Chưa cập nhật"
                                            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Khoa
                                        </label>
                                        <input
                                            type="text"
                                            value={user.department?.name || 'Chưa xác định'}
                                            disabled
                                            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Change Password Section */}
                            {editing && (
                                <div className="pt-6 border-t border-gray-200">
                                    <h3 className="text-lg font-bold text-primary mb-4">Đổi mật khẩu</h3>
                                    <div className="space-y-4">
                                        {[
                                            { key: 'current', label: 'Mật khẩu hiện tại', field: 'current_password' },
                                            { key: 'new', label: 'Mật khẩu mới', field: 'new_password' },
                                            { key: 'confirm', label: 'Xác nhận mật khẩu mới', field: 'confirm_password' },
                                        ].map(({ key, label, field }) => (
                                            <div key={key}>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    {label}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords[key as keyof typeof showPasswords] ? 'text' : 'password'}
                                                        value={formData[field as keyof typeof formData]}
                                                        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                                                        placeholder="••••••••"
                                                        className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords({
                                                            ...showPasswords,
                                                            [key]: !showPasswords[key as keyof typeof showPasswords]
                                                        })}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-secondary transition-colors"
                                                    >
                                                        {showPasswords[key as keyof typeof showPasswords] ? (
                                                            <EyeOff className="w-5 h-5" />
                                                        ) : (
                                                            <Eye className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <p className="text-sm text-gray-500 italic">
                                            * Để trống nếu không muốn đổi mật khẩu
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Account Info */}
                            <div className="pt-6 border-t border-gray-200">
                                <h3 className="text-lg font-bold text-primary mb-4">Thông tin tài khoản</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                        <Calendar className="w-5 h-5 text-brandBlue" />
                                        <div>
                                            <p className="text-sm text-gray-500">Ngày tham gia</p>
                                            <p className="font-semibold text-primary">
                                                {new Date(user.created_at).toLocaleDateString('vi-VN')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                        <User className="w-5 h-5 text-secondary" />
                                        <div>
                                            <p className="text-sm text-gray-500">Vai trò</p>
                                            <p className="font-semibold text-primary capitalize">{user.role}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
