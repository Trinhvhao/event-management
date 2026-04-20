'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Building2, CheckCircle2, Sparkles, Zap, Award, Users as UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { eventService } from '@/services/eventService';
import type { Department, RegisterData } from '@/types';

const toErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }

    return fallback;
};

export default function RegisterPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        studentId: '',
        departmentId: '',
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const data = await eventService.getDepartments();
                setDepartments(data);
            } catch {
                toast.error('Không tải được danh sách khoa. Bạn vẫn có thể đăng ký mà không chọn khoa.');
            } finally {
                setIsLoadingDepartments(false);
            }
        };

        fetchDepartments();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }

        setIsLoading(true);

        try {
            const payload: RegisterData = {
                email: formData.email.trim(),
                password: formData.password,
                full_name: formData.fullName.trim(),
                student_id: formData.studentId.trim() || undefined,
                role: 'student',
                department_id: formData.departmentId ? Number(formData.departmentId) : undefined,
            };

            await authService.register(payload);
            toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
            router.push('/login');
        } catch (error: unknown) {
            toast.error(toErrorMessage(error, 'Đăng ký thất bại'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-brandBlue py-12">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 w-full h-full opacity-60">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-brandLightBlue/20 rounded-full blur-[120px] animate-float" style={{ animationDuration: '8s' }}></div>
                <div className="absolute top-[20%] left-[-5%] w-[40%] h-[60%] bg-secondary/30 rounded-full blur-[100px] animate-float" style={{ animationDuration: '10s' }}></div>
                <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] bg-[#002563]/50 rounded-full blur-[120px] animate-float" style={{ animationDuration: '12s' }}></div>
                <div className="absolute top-[50%] left-[50%] w-[35%] h-[35%] bg-secondary/20 rounded-full blur-[100px] animate-float" style={{ animationDuration: '9s' }}></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150"></div>

            {/* Floating Decorative Elements */}
            <motion.div
                animate={{
                    y: [0, -20, 0],
                    x: [0, -10, 0],
                    rotate: [0, -5, 0]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-20 right-10 w-20 h-20 bg-secondary/30 rounded-2xl backdrop-blur-sm border-2 border-secondary/40 shadow-lg shadow-secondary/20 hidden xl:block"
            />
            <motion.div
                animate={{
                    y: [0, 20, 0],
                    x: [0, 15, 0],
                    rotate: [0, 5, 0]
                }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-32 left-16 w-16 h-16 bg-brandLightBlue/30 rounded-full backdrop-blur-sm border-2 border-brandLightBlue/40 shadow-lg shadow-brandLightBlue/20 hidden xl:block"
            />
            <motion.div
                animate={{
                    y: [0, -15, 0],
                    x: [0, -12, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-32 w-12 h-12 bg-brandRed/30 rounded-lg backdrop-blur-sm border-2 border-brandRed/40 shadow-lg shadow-brandRed/20 hidden xl:block"
            />

            <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center max-w-6xl">
                {/* Left Side - Registration Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-full order-2 lg:order-1"
                >
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl border border-white/20 relative overflow-hidden">
                        {/* Decorative gradient bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brandBlue via-secondary to-brandLightBlue"></div>

                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-gradient-to-br from-secondary to-brandRed p-2.5 rounded-xl">
                                    <Sparkles className="text-white" size={24} />
                                </div>
                                <h2 className="text-3xl font-bold text-primary">Tạo tài khoản</h2>
                            </div>
                            <p className="text-slate-500">Điền thông tin để bắt đầu trải nghiệm</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Full Name */}
                            <div className="space-y-2">
                                <label htmlFor="fullName" className="block text-sm font-semibold text-primary">
                                    Họ và tên
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brandBlue transition-colors" size={20} />
                                    <input
                                        id="fullName"
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20 outline-none transition-all bg-white text-primary placeholder:text-slate-400"
                                        placeholder="Nguyễn Văn A"
                                    />
                                </div>
                            </div>

                            {/* Email */}
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

                            {/* Student ID & Department */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label htmlFor="studentId" className="block text-sm font-semibold text-primary">
                                        MSSV
                                    </label>
                                    <input
                                        id="studentId"
                                        type="text"
                                        required
                                        value={formData.studentId}
                                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20 outline-none transition-all bg-white text-primary placeholder:text-slate-400"
                                        placeholder="2024001"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="department" className="block text-sm font-semibold text-primary">
                                        Khoa
                                    </label>
                                    <div className="relative group">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brandBlue transition-colors pointer-events-none z-10" size={20} />
                                        <select
                                            id="department"
                                            value={formData.departmentId}
                                            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20 outline-none transition-all bg-white text-primary appearance-none"
                                        >
                                            <option value="">Chọn (không bắt buộc)</option>
                                            {isLoadingDepartments && <option value="">Đang tải khoa...</option>}
                                            {!isLoadingDepartments && departments.map((department) => (
                                                <option key={department.id} value={department.id}>
                                                    {department.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Password */}
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

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-primary">
                                    Xác nhận mật khẩu
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brandBlue transition-colors" size={20} />
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20 outline-none transition-all bg-white text-primary placeholder:text-slate-400"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Terms */}
                            <label className="flex items-start gap-3 cursor-pointer group pt-1">
                                <input
                                    type="checkbox"
                                    required
                                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-brandBlue focus:ring-brandBlue/20"
                                />
                                <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">
                                    Tôi đồng ý với{' '}
                                    <Link href="/terms" className="text-secondary hover:underline font-semibold">
                                        Điều khoản
                                    </Link>{' '}
                                    và{' '}
                                    <Link href="/privacy" className="text-secondary hover:underline font-semibold">
                                        Chính sách
                                    </Link>
                                </span>
                            </label>

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
                                        <span>Tạo tài khoản</span>
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

                        {/* Login Link */}
                        <div className="text-center">
                            <p className="text-slate-600">
                                Đã có tài khoản?{' '}
                                <Link
                                    href="/login"
                                    className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
                                >
                                    Đăng nhập ngay
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

                {/* Right Side - Benefits */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="hidden lg:block space-y-6 order-1 lg:order-2"
                >
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
                        >
                            <CheckCircle2 size={16} className="text-secondary" />
                            <span className="text-brandLightBlue text-sm font-medium whitespace-nowrap">Miễn phí 100%</span>
                        </motion.div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                            Tham gia
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary via-brandRed to-brandLightBlue animate-gradient bg-300%">
                                cộng đồng
                            </span>
                        </h1>

                        <p className="text-lg text-brandLightBlue/90 max-w-md leading-relaxed font-light">
                            Hơn 50+ trường đại học và 2000+ sinh viên đã tin dùng hệ thống quản lý sự kiện của chúng tôi.
                        </p>
                    </div>

                    {/* Benefits List */}
                    <div className="space-y-3 pt-2">
                        {[
                            { icon: <Zap size={18} />, title: 'Quản lý dễ dàng', desc: 'Đăng ký và theo dõi sự kiện nhanh chóng', color: 'secondary' },
                            { icon: <CheckCircle2 size={18} />, title: 'Điểm danh tự động', desc: 'Check-in bằng mã QR độc quyền', color: 'brandLightBlue' },
                            { icon: <Award size={18} />, title: 'Chứng nhận điện tử', desc: 'Nhận E-Certificate ngay lập tức', color: 'secondary' },
                            { icon: <UsersIcon size={18} />, title: 'Theo dõi điểm RL', desc: 'Cập nhật điểm tích lũy real-time', color: 'brandLightBlue' },
                        ].map((benefit, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:bg-white/15 transition-all duration-300 group"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`${benefit.color === 'secondary' ? 'bg-secondary/20 border-secondary/30' : 'bg-brandLightBlue/20 border-brandLightBlue/30'} p-2 rounded-lg border group-hover:scale-110 transition-transform duration-300`}>
                                        {benefit.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold mb-1 text-base">{benefit.title}</h3>
                                        <p className="text-brandLightBlue/80 text-sm leading-snug">{benefit.desc}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
