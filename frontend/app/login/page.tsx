'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, Zap, Award, Users, TrendingUp, Star, Sparkles, GraduationCap, UserCog } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

// Demo accounts
const DEMO_ACCOUNTS = {
    student: {
        email: 'student1@dnu.edu.vn',
        password: 'student123',
    },
    admin: {
        email: 'admin@dnu.edu.vn',
        password: 'admin123',
    }
};

export default function LoginPage() {
    const router = useRouter();
    const { setAuth } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { user, token } = await authService.login(formData);
            setAuth(user, token);
            toast.success('Đăng nhập thành công!');
            router.push('/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(error.response?.data?.error?.message || 'Đăng nhập thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickLogin = (accountType: 'student' | 'admin') => {
        const account = DEMO_ACCOUNTS[accountType];
        setFormData({
            email: account.email,
            password: account.password,
        });
        setShowPassword(true);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-brandBlue py-12">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 w-full h-full opacity-60">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brandLightBlue/20 rounded-full blur-[120px] animate-float" style={{ animationDuration: '8s' }}></div>
                <div className="absolute top-[20%] right-[-5%] w-[40%] h-[60%] bg-secondary/30 rounded-full blur-[100px] animate-float" style={{ animationDuration: '10s' }}></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-[#002563]/50 rounded-full blur-[120px] animate-float" style={{ animationDuration: '12s' }}></div>
                <div className="absolute top-[50%] left-[50%] w-[35%] h-[35%] bg-secondary/20 rounded-full blur-[100px] animate-float" style={{ animationDuration: '9s' }}></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150"></div>

            {/* Floating Decorative Elements */}
            <motion.div
                animate={{
                    y: [0, -20, 0],
                    x: [0, 10, 0],
                    rotate: [0, 5, 0]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-20 left-10 w-20 h-20 bg-secondary/30 rounded-2xl backdrop-blur-sm border-2 border-secondary/40 shadow-lg shadow-secondary/20 hidden xl:block"
            />
            <motion.div
                animate={{
                    y: [0, 20, 0],
                    x: [0, -15, 0],
                    rotate: [0, -5, 0]
                }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-32 right-16 w-16 h-16 bg-brandLightBlue/30 rounded-full backdrop-blur-sm border-2 border-brandLightBlue/40 shadow-lg shadow-brandLightBlue/20 hidden xl:block"
            />
            <motion.div
                animate={{
                    y: [0, -15, 0],
                    x: [0, 12, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 right-32 w-12 h-12 bg-brandRed/30 rounded-lg backdrop-blur-sm border-2 border-brandRed/40 shadow-lg shadow-brandRed/20 hidden xl:block"
            />

            <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center max-w-6xl">
                {/* Left Side - Branding */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="hidden lg:block space-y-6"
                >
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
                        >
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                            </span>
                            <span className="text-brandLightBlue text-sm font-medium whitespace-nowrap">Hệ thống hoạt động</span>
                        </motion.div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                            Chào mừng
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary via-brandRed to-brandLightBlue animate-gradient bg-300%">
                                trở lại
                            </span>
                        </h1>

                        <p className="text-lg text-brandLightBlue/90 max-w-md leading-relaxed font-light">
                            Đăng nhập để quản lý sự kiện, theo dõi điểm danh và trải nghiệm hệ sinh thái toàn diện.
                        </p>
                    </div>

                    {/* Feature Highlights */}
                    <div className="space-y-3 pt-2">
                        {[
                            { icon: <Zap size={20} />, text: 'Check-in 0.1s', color: 'secondary' },
                            { icon: <ShieldCheck size={20} />, text: 'Bảo mật AES-256', color: 'brandLightBlue' },
                            { icon: <Award size={20} />, text: 'E-Certificate tự động', color: 'secondary' },
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.1 }}
                                className="flex items-center gap-3 text-white group"
                            >
                                <div className={`${feature.color === 'secondary' ? 'bg-secondary/20 border-secondary/30' : 'bg-brandLightBlue/20 border-brandLightBlue/30'} p-3 rounded-xl backdrop-blur-sm border group-hover:scale-110 transition-transform duration-300`}>
                                    {feature.icon}
                                </div>
                                <span className="font-semibold text-base whitespace-nowrap">{feature.text}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10"
                    >
                        {[
                            { icon: <Users size={18} />, value: '2K+', label: 'Người dùng' },
                            { icon: <TrendingUp size={18} />, value: '50+', label: 'Trường ĐH' },
                            { icon: <Star size={18} />, value: '4.9', label: 'Đánh giá' },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.05 }}
                                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-all"
                            >
                                <div className="text-secondary mb-2">{stat.icon}</div>
                                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                                <div className="text-xs text-brandLightBlue/80 whitespace-nowrap">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>

                {/* Right Side - Login Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="w-full"
                >
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl border border-white/20 relative overflow-hidden">
                        {/* Decorative gradient bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brandBlue via-secondary to-brandLightBlue"></div>

                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-gradient-to-br from-brandBlue to-secondary p-2.5 rounded-xl">
                                    <Sparkles className="text-white" size={24} />
                                </div>
                                <h2 className="text-3xl font-bold text-primary">Đăng nhập</h2>
                            </div>
                            <p className="text-slate-500">Nhập thông tin tài khoản của bạn</p>
                        </div>

                        {/* Quick Login Demo Accounts */}
                        <div className="mb-4">
                            <p className="text-xs text-slate-500 mb-2 text-center font-medium">Demo nhanh - Click để tự động điền</p>
                            <div className="grid grid-cols-2 gap-2">
                                {/* Student Account */}
                                <motion.button
                                    type="button"
                                    onClick={() => handleQuickLogin('student')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center gap-2 p-2.5 rounded-lg border border-brandBlue/20 bg-brandBlue/5 hover:bg-brandBlue/10 hover:border-brandBlue/40 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-brandBlue/10 flex items-center justify-center group-hover:bg-brandBlue/20 transition-colors flex-shrink-0">
                                        <GraduationCap className="text-brandBlue" size={16} />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-primary text-xs">Student</div>
                                        <div className="text-[10px] text-slate-500">Sinh viên</div>
                                    </div>
                                </motion.button>

                                {/* Admin Account */}
                                <motion.button
                                    type="button"
                                    onClick={() => handleQuickLogin('admin')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center gap-2 p-2.5 rounded-lg border border-secondary/20 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary/40 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors flex-shrink-0">
                                        <UserCog className="text-secondary" size={16} />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-primary text-xs">Admin</div>
                                        <div className="text-[10px] text-slate-500">Quản trị</div>
                                    </div>
                                </motion.button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email Input */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-semibold text-primary">
                                    Email
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brandBlue transition-colors" size={20} />
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20 outline-none transition-all bg-white text-primary placeholder:text-slate-400"
                                        placeholder="student@university.edu.vn"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-primary">
                                    Mật khẩu
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brandBlue transition-colors" size={20} />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20 outline-none transition-all bg-white text-primary placeholder:text-slate-400"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember & Forgot */}
                            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-brandBlue focus:ring-brandBlue/20"
                                    />
                                    <span className="text-slate-600 group-hover:text-primary transition-colors whitespace-nowrap">
                                        Ghi nhớ
                                    </span>
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-secondary hover:text-secondary/80 font-semibold transition-colors whitespace-nowrap"
                                >
                                    Quên mật khẩu?
                                </Link>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-brandBlue to-secondary hover:from-brandBlue/90 hover:to-secondary/90 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-brandBlue/25 hover:shadow-xl hover:shadow-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed group mt-5"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Đăng nhập</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-5">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-slate-500">Hoặc</span>
                            </div>
                        </div>

                        {/* Register Link */}
                        <div className="text-center">
                            <p className="text-slate-600">
                                Chưa có tài khoản?{' '}
                                <Link
                                    href="/register"
                                    className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
                                >
                                    Đăng ký ngay
                                </Link>
                            </p>
                        </div>

                        {/* Back to Home */}
                        <div className="mt-4 text-center">
                            <Link
                                href="/"
                                className="text-sm text-slate-500 hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                                ← Quay về trang chủ
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
