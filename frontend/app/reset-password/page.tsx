'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services/authService';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

const resetSchema = z
    .object({
        password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự'),
        confirmPassword: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'],
    });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordContent />
        </Suspense>
    );
}

function ResetPasswordContent() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const searchParams = useSearchParams();

    const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetForm>({
        resolver: zodResolver(resetSchema),
    });

    const onSubmit = async (data: ResetForm) => {
        if (!token) {
            toast.error('Thiếu token đặt lại mật khẩu');
            return;
        }

        try {
            setIsLoading(true);
            await authService.resetPassword(token, data.password);
            setIsSuccess(true);
            toast.success('Đặt lại mật khẩu thành công');
        } catch {
            toast.error('Token không hợp lệ hoặc đã hết hạn');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-offWhite flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-[440px] bg-white border border-gray-100 rounded-2xl shadow-sm p-7">
                <h1 className="text-2xl font-bold text-primary mb-2">Đặt lại mật khẩu</h1>
                <p className="text-sm text-gray-500 mb-6">Tạo mật khẩu mới để tiếp tục đăng nhập.</p>

                {!token && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        Thiếu token xác thực. Vui lòng mở lại link trong email.
                    </div>
                )}

                {isSuccess ? (
                    <div className="space-y-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600">Mật khẩu của bạn đã được cập nhật.</p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-brandBlue hover:text-brandBlue/80 font-medium"
                        >
                            <ArrowLeft size={16} />
                            Quay lại đăng nhập
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            label="Mật khẩu mới"
                            type="password"
                            placeholder="Nhập mật khẩu mới"
                            iconLeft={<Lock size={16} />}
                            error={errors.password?.message}
                            {...register('password')}
                        />
                        <Input
                            label="Xác nhận mật khẩu mới"
                            type="password"
                            placeholder="Nhập lại mật khẩu"
                            iconLeft={<Lock size={16} />}
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                        />

                        <Button type="submit" isLoading={isLoading} className="w-full !py-3" disabled={!token}>
                            Xác nhận mật khẩu mới
                        </Button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft size={14} />
                        Quay lại đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
}

function ResetPasswordFallback() {
    return (
        <div className="min-h-screen bg-offWhite flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-[440px] bg-white border border-gray-100 rounded-2xl shadow-sm p-7 text-center">
                <p className="text-sm text-gray-600">Dang tai trang dat lai mat khau...</p>
            </div>
        </div>
    );
}
