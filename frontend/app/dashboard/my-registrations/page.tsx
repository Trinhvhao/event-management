'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, X, Award, QrCode, Ticket, ChevronRight, RefreshCw, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import { registrationService } from '@/services/registrationService';
import { Registration } from '@/types';
import { formatDate } from '@/utils/formatDate';
import { toast } from 'sonner';

type Status = 'registered' | 'cancelled' | 'attended' | 'pending';

const STATUS_CONFIG: Record<Status, { label: string; badge: string; color: string; bg: string; icon: React.ReactNode }> = {
    registered: { label: 'Đã đăng ký', badge: 'Mới', color: '#00358F', bg: 'rgba(0,53,143,0.08)', icon: <CheckCircle className="w-4 h-4" style={{ color: '#00358F' }} /> },
    attended:   { label: 'Đã tham gia', badge: 'Hoàn thành', color: '#00A651', bg: 'rgba(0,166,81,0.08)', icon: <CheckCircle className="w-4 h-4" style={{ color: '#00A651' }} /> },
    pending:    { label: 'Đang chờ', badge: 'Chờ', color: '#FFB800', bg: 'rgba(255,184,0,0.10)', icon: <AlertCircle className="w-4 h-4" style={{ color: '#FFB800' }} /> },
    cancelled:  { label: 'Đã hủy', badge: 'Đã hủy', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', icon: <X className="w-4 h-4" style={{ color: '#94a3b8' }} /> },
};

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 cursor-default">
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: accent }} />
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1.5">{label}</p>
            <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{value}</p>
        </div>
    );
}

function RegistrationCard({ reg, onCancel, onQR }: {
    reg: Registration;
    onCancel: (id: number) => void;
    onQR: (reg: Registration) => void;
}) {
    const isCancelled = reg.status === 'cancelled';
    const statusKey = (reg.status || 'registered') as Status;
    const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.registered;
    const hasQR = !!reg.qr_code && reg.qr_code.length > 0;
    const isUpcoming = reg.event && new Date(reg.event.start_time) > new Date();

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl border transition-all duration-200 group ${
                isCancelled
                    ? 'border-[var(--border-light)] bg-[var(--bg-muted)]/30 opacity-75'
                    : 'border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5'
            }`}
        >
            {/* Status accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: status.color }} />

            <div className="p-4 sm:p-5">
                <div className="flex items-start gap-4">
                    {/* QR / Icon */}
                    {!isCancelled ? (
                        <button
                            onClick={() => hasQR ? onQR(reg) : toast.error('Chưa có mã QR. Vui lòng đợi ban tổ chức cấp phát.')}
                            disabled={!hasQR}
                            className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                hasQR
                                    ? 'bg-white border-2 border-[var(--border-default)] cursor-pointer hover:border-[var(--color-brand-navy)] hover:scale-105 active:scale-95'
                                    : 'bg-[var(--bg-muted)] border-2 border-dashed border-[var(--border-default)] cursor-not-allowed opacity-50'
                            }`}
                            title={hasQR ? 'Xem mã QR' : 'Chưa có mã QR'}
                        >
                            {hasQR ? (
                                <div className="w-10 h-10 rounded-lg bg-[#f0fdf4] flex items-center justify-center">
                                    <QrCode className="w-5 h-5 text-[#00A651]" />
                                </div>
                            ) : (
                                <QrCode className="w-5 h-5 text-[var(--text-muted)]" />
                            )}
                        </button>
                    ) : (
                        <div className="w-14 h-14 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center shrink-0">
                            <Calendar className="w-6 h-6 text-[var(--text-muted)]" />
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-sm font-bold truncate transition-colors ${isCancelled ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)] group-hover:text-[var(--color-brand-navy)]'}`}>
                                    {reg.event?.title || `Sự kiện #${reg.event_id}`}
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                    {reg.event?.start_time && (
                                        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                            <Clock className="w-3.5 h-3.5 shrink-0" />
                                            {formatDate(reg.event.start_time)}
                                        </span>
                                    )}
                                    {reg.event?.location && (
                                        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate max-w-[160px]">{reg.event.location}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right side actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Points badge */}
                                {reg.event?.training_points ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(242,102,0,0.08)', color: '#c45500' }}>
                                        <Award className="w-3.5 h-3.5" />
                                        +{reg.event.training_points} điểm
                                    </span>
                                ) : null}

                                {/* Upcoming badge */}
                                {!isCancelled && isUpcoming && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wide" style={{ background: 'rgba(0,53,143,0.06)', color: '#00358F' }}>
                                        <Sparkles className="w-3 h-3" />
                                        Sắp tới
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Bottom row */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-light)]">
                            {/* Status */}
                            <div className="flex items-center gap-2">
                                {status.icon}
                                <span className="text-xs font-bold" style={{ color: status.color }}>{status.label}</span>
                                {reg.registered_at && !isCancelled && (
                                    <span className="text-xs text-[var(--text-muted)]">· Đăng ký {new Date(reg.registered_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                                )}
                            </div>

                            {/* Actions */}
                            {!isCancelled && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => hasQR ? onQR(reg) : toast.error('Chưa có mã QR')}
                                        disabled={!hasQR}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-[var(--bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{ color: '#00358F' }}
                                    >
                                        <QrCode className="w-3.5 h-3.5" />
                                        QR
                                    </button>
                                    <button
                                        onClick={() => onCancel(reg.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-muted)] hover:bg-red-50 hover:text-[var(--color-brand-red)] transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Hủy
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function MyRegistrationsPage() {
    const router = useRouter();
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [qrModal, setQrModal] = useState<{ reg: Registration; qr_code: string } | null>(null);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

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

    useEffect(() => { void loadRegistrations(); }, [loadRegistrations]);

    const handleOpenQR = async (reg: Registration) => {
        if (!reg.qr_code || reg.qr_code.length === 0) {
            try {
                const qrData = await registrationService.getRegistrationQRCode(reg.id);
                setQrModal({ reg, qr_code: qrData.qr_code });
            } catch {
                toast.error('Không thể tải mã QR');
            }
        } else {
            setQrModal({ reg, qr_code: reg.qr_code });
        }
    };

    const handleCancel = async (regId: number) => {
        setCancellingId(regId);
        try {
            await registrationService.cancel(regId);
            toast.success('Đã hủy đăng ký');
            await loadRegistrations();
        } catch (err: unknown) {
            const msg = (err && typeof err === 'object' && 'response' in err)
                ? ((err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || 'Hủy đăng ký thất bại')
                : 'Hủy đăng ký thất bại';
            toast.error(msg);
        } finally {
            setCancellingId(null);
        }
    };

    const activeRegs    = registrations.filter(r => r.status === 'registered');
    const cancelledRegs  = registrations.filter(r => r.status === 'cancelled');
    const totalPoints   = registrations.reduce((sum, r) => sum + (r.event?.training_points || 0), 0);
    const upcomingCount = registrations.filter(r => r.status === 'registered' && r.event && new Date(r.event.start_time) > new Date()).length;

    return (
        <DashboardLayout>
            <div className="space-y-5 p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto">

                {/* ─── PAGE HEADER ─── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[var(--color-brand-navy)] opacity-[0.03] pointer-events-none" />
                    <div className="px-6 pt-6 pb-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                                    <Ticket className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">My Events</p>
                                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">Sự kiện đã đăng ký</h1>
                                    <p className="text-sm text-[var(--text-muted)]">Quản lý các sự kiện bạn đã đăng ký tham gia</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => void loadRegistrations()}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all disabled:opacity-50 active:scale-95"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    Làm mới
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard/events')}
                                    className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all active:scale-95"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Khám phá
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── SUMMARY STRIP ─── */}
                {!loading && registrations.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <SummaryCard label="Tổng đăng ký" value={registrations.length} accent="#00358F" />
                        <SummaryCard label="Sắp tới" value={upcomingCount} accent="#F26600" />
                        <SummaryCard label="Đã hủy" value={cancelledRegs.length} accent="#94a3b8" />
                        <SummaryCard label="Tổng điểm tiềm năng" value={totalPoints} accent="#FFB800" />
                    </div>
                )}

                {/* ─── CONTENT ─── */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-28 rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
                                <div className="flex items-start gap-4 p-4 sm:p-5">
                                    <div className="w-14 h-14 rounded-xl bg-[var(--bg-muted)] animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-48 bg-[var(--bg-muted)] rounded-lg animate-pulse" />
                                        <div className="h-3 w-32 bg-[var(--bg-muted)] rounded-lg animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : registrations.length === 0 ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center gap-5 py-20 rounded-2xl border-2 border-dashed border-[var(--border-default)] bg-white">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                        <div className="text-center">
                            <p className="text-base font-bold text-[var(--text-secondary)]">Chưa đăng ký sự kiện nào</p>
                            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xs">Khám phá và đăng ký tham gia các sự kiện hấp dẫn để tích lũy điểm rèn luyện</p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/events')}
                            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all active:scale-95"
                        >
                            <Calendar className="w-4 h-4" />
                            Khám phá sự kiện
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                                {/* Đã đăng ký */}
                                {activeRegs.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-2 h-2 rounded-full bg-[var(--color-brand-navy)]" />
                                    <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Đã đăng ký ({activeRegs.length})</h2>
                                </div>
                                <div className="space-y-3">
                                    {activeRegs.map(reg => (
                                        <RegistrationCard
                                            key={reg.id}
                                            reg={reg}
                                            onCancel={handleCancel}
                                            onQR={handleOpenQR}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Đã hủy */}
                        {cancelledRegs.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
                                    <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Đã hủy ({cancelledRegs.length})</h2>
                                </div>
                                <div className="space-y-3">
                                    {cancelledRegs.map(reg => (
                                        <RegistrationCard
                                            key={reg.id}
                                            reg={reg}
                                            onCancel={handleCancel}
                                            onQR={handleOpenQR}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── QR MODAL ─── */}
                {qrModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && setQrModal(null)}
                    >
                        <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative z-10 bg-white rounded-2xl shadow-[var(--shadow-xl)] max-w-sm w-full overflow-hidden"
                        >
                            {/* Accent */}
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-[rgba(0,53,143,0.08)] flex items-center justify-center">
                                        <QrCode className="w-4 h-4 text-[var(--color-brand-navy)]" />
                                    </div>
                                    <p className="text-sm font-bold text-[var(--text-primary)]">Mã QR Check-in</p>
                                </div>
                                <button
                                    onClick={() => setQrModal(null)}
                                    className="w-8 h-8 rounded-lg hover:bg-[var(--bg-muted)] flex items-center justify-center transition-colors"
                                >
                                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                                </button>
                            </div>

                            {/* QR content */}
                            <div className="p-6 text-center">
                                <div className="inline-block p-4 bg-white rounded-2xl border-2 border-[var(--border-default)] shadow-[var(--shadow-sm)]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={qrModal.qr_code}
                                        alt="QR Code"
                                        width={200}
                                        height={200}
                                        className="w-[200px] h-[200px]"
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            target.style.display = 'none';
                                            const fallback = target.nextElementSibling as HTMLElement | null;
                                            if (fallback) fallback.style.display = 'flex';
                                        }}
                                    />
                                    <div className="hidden w-[200px] h-[200px] items-center justify-center bg-[var(--bg-muted)] rounded-xl">
                                        <div className="text-center">
                                            <QrCode className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
                                            <p className="text-xs text-[var(--text-muted)]">QR không khả dụng</p>
                                        </div>
                                    </div>
                                </div>
                                <h3 className="text-base font-bold text-[var(--text-primary)] mt-4">{qrModal.reg.event?.title}</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-1">Đưa mã QR cho ban tổ chức để check-in</p>
                                {qrModal.reg.event?.start_time && (
                                    <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-[var(--text-muted)]">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDate(qrModal.reg.event.start_time)}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
