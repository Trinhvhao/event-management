'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { authService } from '@/services/authService';

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<VerifyEmailFallback />}>
            <VerifyEmailContent />
        </Suspense>
    );
}

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                return;
            }

            try {
                await authService.verifyEmail(token);
                setStatus('success');
            } catch {
                setStatus('error');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="min-h-screen bg-offWhite flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-[440px] bg-white border border-gray-100 rounded-2xl shadow-sm p-7 text-center">
                <h1 className="text-2xl font-bold text-primary mb-2">Xác thực email</h1>
                <p className="text-sm text-gray-500 mb-6">Chúng tôi đang kiểm tra liên kết xác thực của bạn.</p>

                {status === 'loading' && (
                    <div className="space-y-3">
                        <Loader2 className="w-10 h-10 text-brandBlue animate-spin mx-auto" />
                        <p className="text-sm text-gray-600">Đang xác thực, vui lòng chờ...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-700">Email đã được xác thực thành công. Bạn có thể đăng nhập ngay bây giờ.</p>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center rounded-lg bg-brandBlue px-4 py-2 text-sm font-medium text-white hover:bg-brandBlue/90"
                        >
                            Đăng nhập
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                            <MailWarning className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-sm text-gray-700">Liên kết xác thực không hợp lệ hoặc đã hết hạn.</p>
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Tạo tài khoản mới
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

function VerifyEmailFallback() {
    return (
        <div className="min-h-screen bg-offWhite flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-[440px] bg-white border border-gray-100 rounded-2xl shadow-sm p-7 text-center">
                <p className="text-sm text-gray-600">Dang xac thuc thong tin...</p>
            </div>
        </div>
    );
}
