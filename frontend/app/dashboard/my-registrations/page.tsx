'use client';

import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, X, Award, QrCode } from 'lucide-react';
import Link from 'next/link';
import { registrationService } from '@/services/registrationService';
import { Registration } from '@/types';
import { formatDate } from '@/utils/formatDate';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }
    return fallback;
};

export default function MyRegistrationsPage() {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [qrModal, setQrModal] = useState<Registration | null>(null);

    const loadRegistrations = useCallback(async () => {
        try {
            setLoading(true);
            const data = await registrationService.getMyRegistrations();
            setRegistrations(data);
        } catch {
            toast.error('Không thể tải danh sách đăng ký');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRegistrations();
    }, [loadRegistrations]);

    const handleOpenQR = async (registration: Registration) => {
        try {
            const qrData = await registrationService.getRegistrationQRCode(registration.id);
            setQrModal({ ...registration, qr_code: qrData.qr_code });
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Không thể tải mã QR'));
        }
    };

    const handleCancel = async (regId: number) => {
        try {
            await registrationService.cancel(regId);
            toast.success('Đã hủy đăng ký');
            await loadRegistrations();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Hủy đăng ký thất bại'));
        }
    };

    const activeRegs = registrations.filter(r => r.status === 'registered');
    const cancelledRegs = registrations.filter(r => r.status === 'cancelled');

    return (
        <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sự kiện đã đăng ký</h1>
                    <p className="page-subtitle">Quản lý các sự kiện bạn đã đăng ký tham gia</p>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} height={120} style={{ borderRadius: 16 }} />
                    ))}
                </div>
            ) : registrations.length === 0 ? (
                <EmptyState
                    title="Chưa đăng ký sự kiện nào"
                    description="Khám phá và đăng ký tham gia các sự kiện hấp dẫn"
                    actionLabel="Xem sự kiện"
                    onAction={() => window.location.href = '/dashboard/events'}
                    icon={<Calendar size={28} />}
                />
            ) : (
                <>
                    {/* Đang tham gia */}
                    {activeRegs.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-(--dash-text-primary) mb-4">
                                Đang tham gia ({activeRegs.length})
                            </h2>
                            <div className="space-y-3">
                                {activeRegs.map(reg => (
                                    <Card key={reg.id} variant="glass" padding="md" hover>
                                        <div className="flex items-start gap-4">
                                            {/* QR Preview */}
                                            <button
                                                onClick={() => handleOpenQR(reg)}
                                                className="w-16 h-16 rounded-xl bg-white border border-(--dash-border) flex items-center justify-center shrink-0 hover:scale-105 transition-transform cursor-pointer"
                                                title="Xem mã QR"
                                            >
                                                <QRCodeSVG value={reg.qr_code} size={48} level="L" />
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <Link href={`/dashboard/events/${reg.event_id}`}>
                                                    <h3 className="text-sm font-semibold text-(--dash-text-primary) hover:text-(--dash-accent) truncate">
                                                        {reg.event?.title || `Sự kiện #${reg.event_id}`}
                                                    </h3>
                                                </Link>
                                                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-(--dash-text-muted)">
                                                    {reg.event?.start_time && (
                                                        <span className="flex items-center gap-1"><Clock size={12} />{formatDate(reg.event.start_time)}</span>
                                                    )}
                                                    {reg.event?.location && (
                                                        <span className="flex items-center gap-1"><MapPin size={12} />{reg.event.location}</span>
                                                    )}
                                                    {reg.event?.training_points ? (
                                                        <span className="flex items-center gap-1 text-orange-500"><Award size={12} />+{reg.event.training_points} điểm</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenQR(reg)} icon={<QrCode size={14} />}>
                                                    QR
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleCancel(reg.id)}>
                                                    <X size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Đã hủy */}
                    {cancelledRegs.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-(--dash-text-muted) mb-4">
                                Đã hủy ({cancelledRegs.length})
                            </h2>
                            <div className="space-y-3 opacity-60">
                                {cancelledRegs.map(reg => (
                                    <Card key={reg.id} variant="glass" padding="md">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                                                <Calendar size={22} className="text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-medium text-(--dash-text-muted) truncate line-through">
                                                    {reg.event?.title || `Sự kiện #${reg.event_id}`}
                                                </h3>
                                            </div>
                                            <Badge variant="danger">Đã hủy</Badge>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal hiển thị QR lớn */}
            {qrModal && (
                <Modal isOpen={!!qrModal} onClose={() => setQrModal(null)} size="sm" title="Mã QR Check-in">
                    <div className="text-center py-4">
                        <div className="inline-block p-4 bg-white rounded-2xl shadow-sm border">
                            <QRCodeSVG value={qrModal.qr_code} size={200} level="M" />
                        </div>
                        <h3 className="text-base font-semibold mt-4 text-(--dash-text-primary)">
                            {qrModal.event?.title}
                        </h3>
                        <p className="text-sm text-(--dash-text-muted) mt-1">
                            Đưa mã QR này cho ban tổ chức để check-in
                        </p>
                        {qrModal.event?.start_time && (
                            <p className="text-xs text-(--dash-text-muted) mt-2">
                                <Clock size={12} className="inline mr-1" />
                                {formatDate(qrModal.event.start_time)}
                            </p>
                        )}
                    </div>
                </Modal>
            )}
        </motion.div>
        </DashboardLayout>
    );
}
