'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Calendar, MapPin, Award, QrCode as QrCodeIcon, X, Download } from 'lucide-react';
import { registrationService } from '@/services/registrationService';
import { Registration } from '@/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }
    return fallback;
};

export default function MyEventsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [selectedQR, setSelectedQR] = useState<Registration | null>(null);
    const [qrLoadingId, setQrLoadingId] = useState<number | null>(null);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        fetchMyEvents();
    }, [isAuthenticated, router]);

    const fetchMyEvents = async () => {
        try {
            setLoading(true);
            const response = await registrationService.getMyRegistrations();
            setRegistrations(response || []);
        } catch (error: unknown) {
            console.error('Error fetching my events:', error);
            toast.error(getErrorMessage(error, 'Không thể tải danh sách sự kiện'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRegistration = async (registrationId: number) => {
        if (!confirm('Bạn có chắc chắn muốn hủy đăng ký sự kiện này?')) {
            return;
        }

        try {
            await registrationService.cancel(registrationId);
            toast.success('Hủy đăng ký thành công');
            fetchMyEvents();
        } catch (error: unknown) {
            const message = getErrorMessage(error, 'Hủy đăng ký thất bại');
            toast.error(message);
        }
    };

    const handleOpenQrModal = async (registration: Registration) => {
        try {
            setQrLoadingId(registration.id);
            const qrPayload = await registrationService.getRegistrationQRCode(registration.id);
            setSelectedQR({ ...registration, qr_code: qrPayload.qr_code });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Không thể tải QR code'));
        } finally {
            setQrLoadingId(null);
        }
    };

    const downloadQRCode = (registration: Registration) => {
        const svg = document.getElementById(`qr-${registration.id}`);
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL('image/png');

            const downloadLink = document.createElement('a');
            downloadLink.download = `qr-code-${registration.event?.title}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    };

    const filteredRegistrations = registrations.filter((reg) => {
        if (filter === 'all') return true;
        if (filter === 'upcoming') return reg.event?.status === 'upcoming' || reg.event?.status === 'ongoing';
        if (filter === 'completed') return reg.event?.status === 'completed';
        return true;
    });

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandBlue"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Calendar className="w-32 h-32 transform rotate-12" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-primary tracking-tight mb-1">Sự kiện của tôi</h2>
                            <p className="text-gray-500 font-medium">Quản lý các sự kiện đã đăng ký</p>
                        </div>

                        {/* Filter tabs */}
                        <div className="flex p-1.5 bg-offWhite backdrop-blur rounded-xl gap-1 border border-gray-200">
                            <button
                                onClick={() => setFilter('upcoming')}
                                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${filter === 'upcoming'
                                        ? 'bg-white text-brandBlue shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                    }`}
                            >
                                Sắp tới
                            </button>
                            <button
                                onClick={() => setFilter('completed')}
                                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${filter === 'completed'
                                        ? 'bg-white text-brandBlue shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                    }`}
                            >
                                Đã tham gia
                            </button>
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${filter === 'all'
                                        ? 'bg-white text-brandBlue shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                    }`}
                            >
                                Tất cả
                            </button>
                        </div>
                    </div>
                </div>

                {/* Events list */}
                {filteredRegistrations.length === 0 ? (
                    <div className="bg-offWhite rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-white shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Calendar className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-primary mb-2">
                            Chưa có sự kiện nào
                        </h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                            Bạn chưa đăng ký sự kiện nào. Hãy khám phá các sự kiện thú vị trong danh sách sự kiện nhé!
                        </p>
                        <button
                            onClick={() => router.push('/dashboard/events')}
                            className="px-8 py-3.5 bg-brandBlue text-white font-semibold flex items-center gap-2 mx-auto rounded-xl shadow-md shadow-brandBlue/20 hover:scale-105 transition-all"
                        >
                            Khám phá sự kiện
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5">
                        {filteredRegistrations.map((registration) => (
                            <div
                                key={registration.id}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-brandBlue/30 transition-all duration-300 group"
                            >
                                <div className="flex flex-col md:flex-row gap-8">
                                    {/* Event info */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-brandBlue transition-colors leading-tight">
                                                    {registration.event?.title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="px-3 py-1 bg-brandLightBlue/20 text-brandBlue rounded-lg text-xs font-bold uppercase tracking-wide">
                                                        {registration.event?.category?.name}
                                                    </span>
                                                    {registration.status === 'registered' ? (
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đã đăng ký
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Đã hủy
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: 0.1 }}
                                            className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 mb-6 bg-offWhite rounded-xl p-4 border border-gray-100"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-brandBlue shrink-0">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium">
                                                    {format(new Date(registration.event?.start_time || ''), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-orange-500 shrink-0">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium line-clamp-1">{registration.event?.location}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-500 shrink-0">
                                                    <Award className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-emerald-600">
                                                    +{registration.event?.training_points} ĐRL
                                                </span>
                                            </div>
                                        </motion.div>

                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={() => router.push(`/dashboard/events/${registration.event_id}`)}
                                                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-offWhite hover:border-gray-400 transition-colors font-semibold shadow-sm"
                                            >
                                                Xem chi tiết
                                            </button>
                                            {registration.status === 'registered' && registration.event?.status === 'upcoming' && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenQrModal(registration)}
                                                        disabled={qrLoadingId === registration.id}
                                                        className="px-5 py-2.5 bg-brandBlue text-white rounded-xl hover:bg-brandBlue/90 transition-all font-semibold flex items-center gap-2 shadow-md shadow-brandBlue/20 hover:scale-105"
                                                    >
                                                        <QrCodeIcon className="w-5 h-5" />
                                                        {qrLoadingId === registration.id ? 'Đang tải QR...' : 'Lấy QR Code'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelRegistration(registration.id)}
                                                        className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors font-semibold"
                                                    >
                                                        Hủy tham gia
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* QR Code preview (desktop) */}
                                    {registration.status === 'registered' && registration.event?.status === 'upcoming' && (
                                        <div className="hidden md:flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                                <QRCodeSVG
                                                    id={`qr-${registration.id}`}
                                                    value={registration.qr_code}
                                                    size={120}
                                                    level="H"
                                                    includeMargin
                                                />
                                            </div>
                                            <button
                                                onClick={() => setSelectedQR(registration)}
                                                className="mt-2 text-xs text-brandBlue hover:text-secondary"
                                            >
                                                Xem lớn hơn
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* QR Code Modal */}
                {selectedQR && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-primary">QR Code Check-in</h3>
                                <button
                                    onClick={() => setSelectedQR(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="text-center">
                                <p className="text-gray-600 mb-4">{selectedQR.event?.title}</p>
                                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 inline-block">
                                    <QRCodeSVG
                                        id={`qr-modal-${selectedQR.id}`}
                                        value={selectedQR.qr_code}
                                        size={256}
                                        level="H"
                                        includeMargin
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-4">
                                    Xuất trình mã QR này khi check-in tại sự kiện
                                </p>
                                <button
                                    onClick={() => downloadQRCode(selectedQR)}
                                    className="mt-4 w-full px-4 py-3 bg-brandBlue text-white rounded-lg hover:bg-brandBlue/90 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Download className="w-5 h-5" />
                                    Tải xuống QR Code
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
