'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services/authService';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GraduationCap, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const forgotSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const { register, handleSubmit, formState: { errors }, watch } = useForm<ForgotForm>({
        resolver: zodResolver(forgotSchema),
    });

    const onSubmit = async (data: ForgotForm) => {
        setIsLoading(true);
        try {
            await authService.forgotPassword(data.email);
            setIsSent(true);
            toast.success('Email đặt lại mật khẩu đã được gửi!');
        } catch {
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-offWhite">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[420px]"
            >
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-brandBlue flex items-center justify-center">
                        <GraduationCap size={22} className="text-white" />
                    </div>
                    <span className="text-xl font-bold text-primary">DaiNam Events</span>
                </div>

                {!isSent ? (
                    <>
                        <h2 className="text-2xl font-bold text-primary mb-1">Quên mật khẩu?</h2>
                        <p className="text-gray-500 mb-8">Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <Input
                                label="Email"
                                type="email"
                                placeholder="email@university.edu.vn"
                                error={errors.email?.message}
                                iconLeft={<Mail size={16} />}
                                {...register('email')}
                            />
                            <Button type="submit" variant="primary" isLoading={isLoading} className="w-full !py-3">
                                Gửi link đặt lại
                            </Button>
                        </form>
                    </>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center mx-auto mb-5">
                            <CheckCircle size={32} className="text-[#22c55e]" />
                        </div>
                        <h2 className="text-2xl font-bold text-primary mb-2">Email đã được gửi!</h2>
                        <p className="text-gray-500 mb-2">
                            Vui lòng kiểm tra hộp thư <strong className="text-primary">{watch('email')}</strong>
                        </p>
                        <p className="text-sm text-gray-400 mb-8">
                            Nếu không thấy email, hãy kiểm tra thư mục spam.
                        </p>
                    </motion.div>
                )}

                <div className="mt-8 text-center">
                    <Link href="/login" className="inline-flex items-center gap-2 text-sm text-brandBlue hover:text-brandBlue/80 font-medium transition-colors">
                        <ArrowLeft size={14} />
                        Quay lại đăng nhập
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
