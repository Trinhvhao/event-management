'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import { ticketService, Ticket } from '@/services/ticketService';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { 
    Ticket as TicketIcon, 
    Download, 
    Mail, 
    QrCode, 
    MapPin, 
    Clock, 
    Calendar,
    User,
    X,
    Copy,
    CheckCircle,
    AlertCircle,
    ExternalLink
} from 'lucide-react';

const ACCENT = {
    navy:    { hex: '#00358F', tint: 'rgba(0,53,143,0.08)',   text: '#00358F' },
    orange:  { hex: '#F26600', tint: 'rgba(242,102,0,0.08)',   text: '#c45500' },
    green:   { hex: '#00A651', tint: 'rgba(0,166,81,0.08)',    text: '#007a3d' },
    gold:    { hex: '#FFB800', tint: 'rgba(255,184,0,0.1)',    text: '#cc9300' },
    red:     { hex: '#dc2626', tint: 'rgba(220,38,38,0.08)',   text: '#b91c1c' },
    gray:    { hex: '#6b7280', tint: 'rgba(107,114,128,0.08)', text: '#4b5563' },
};

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; text: string; label: string }> = {
        valid:     { bg: ACCENT.green.tint,   text: ACCENT.green.text,   label: 'Còn hiệu lực' },
        used:      { bg: ACCENT.navy.tint,    text: ACCENT.navy.text,    label: 'Đã sử dụng' },
        cancelled:  { bg: ACCENT.red.tint,     text: ACCENT.red.text,     label: 'Đã hủy' },
        expired:    { bg: ACCENT.gray.tint,    text: ACCENT.gray.text,    label: 'Hết hạn' },
    };
    const s = map[status] || map.valid;
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: s.bg, color: s.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.text }} />
            {s.label}
        </span>
    );
}

function EventTypeBadge({ ticket }: { ticket: Ticket }) {
    const bg = ticket.is_past ? ACCENT.gray.tint : ACCENT.navy.tint;
    const color = ticket.is_past ? ACCENT.gray.text : ACCENT.navy.text;
    const label = ticket.is_past ? 'Đã diễn ra' : ticket.is_upcoming ? 'Sắp diễn ra' : 'Đang diễn ra';
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: bg, color }}>
            {label}
        </span>
    );
}

function TicketCard({ ticket, onView, onDownload, onResend }: {
    ticket: Ticket;
    onView: () => void;
    onDownload: () => void;
    onResend: () => void;
}) {
    const [resending, setResending] = useState(false);
    const event = ticket.registration.event;
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);

    const handleResend = async () => {
        setResending(true);
        try {
            await onResend();
            toast.success('Đã gửi lại email thành công!');
        } catch {
            toast.error('Không thể gửi lại email');
        } finally {
            setResending(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={`relative overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${
                ticket.is_past
                    ? 'border-[var(--border-default)] shadow-[var(--shadow-card)]'
                    : 'border-[var(--color-brand-navy)]/20 shadow-[var(--shadow-card)]'
            }`}
        >
            {/* Top gradient bar */}
            {!ticket.is_past && (
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{
                    background: `linear-gradient(90deg, ${ACCENT.navy.hex}, ${ACCENT.orange.hex})`
                }} />
            )}

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                            ticket.is_past ? 'bg-[var(--bg-muted)]' : 'bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8]'
                        }`}>
                            <TicketIcon className={`w-5 h-5 ${ticket.is_past ? 'text-[var(--text-muted)]' : 'text-white'}`} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-brand-orange)]">Mã Ticket</p>
                            <p className="font-bold text-[var(--text-primary)] tracking-tight">{ticket.ticket_code}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={ticket.status} />
                    </div>
                </div>

                {/* Event info */}
                <div className="mb-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 flex-1">
                            {event.title}
                        </h3>
                        <EventTypeBadge ticket={ticket} />
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            <span>{startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            <span>{startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – {endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] col-span-2">
                            <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            <span className="truncate">{event.location || 'Chưa xác định'}</span>
                        </div>
                    </div>
                </div>

                {/* Attendee info */}
                <div className="mb-4 p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-light)]">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1.5">
                        <User className="w-3 h-3" />
                        <span className="font-semibold uppercase tracking-wide">Người tham dự</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 text-sm">
                        <div>
                            <span className="text-[var(--text-muted)] text-xs">Họ tên: </span>
                            <span className="font-medium text-[var(--text-secondary)]">{ticket.registration.user.full_name}</span>
                        </div>
                        <div>
                            <span className="text-[var(--text-muted)] text-xs">MSSV: </span>
                            <span className="font-medium text-[var(--text-secondary)]">{ticket.registration.user.student_id || 'N/A'}</span>
                        </div>
                        {ticket.registration.user.department && (
                            <div className="col-span-2">
                                <span className="text-[var(--text-muted)] text-xs">Khoa: </span>
                                <span className="font-medium text-[var(--text-secondary)]">{ticket.registration.user.department.name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-light)]">
                    <button
                        onClick={onView}
                        className="flex-1 h-10 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <QrCode className="w-4 h-4" />
                        Xem chi tiết
                    </button>
                    <button
                        onClick={onDownload}
                        className="h-10 px-4 rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] text-sm font-semibold border border-[var(--border-default)] hover:bg-[var(--border-light)] transition-all active:scale-95 flex items-center justify-center gap-2"
                        title="Tải PDF"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    {ticket.is_upcoming && (
                        <button
                            onClick={handleResend}
                            disabled={resending}
                            className="h-10 px-4 rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] text-sm font-semibold border border-[var(--border-default)] hover:bg-[var(--border-light)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Gửi lại email"
                        >
                            <Mail className={`w-4 h-4 ${resending ? 'animate-pulse' : ''}`} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function TicketDetailModal({ ticket, onClose, onDownload, onResend }: {
    ticket: Ticket;
    onClose: () => void;
    onDownload: () => void;
    onResend: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const [resending, setResending] = useState(false);
    const event = ticket.registration.event;
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);

    const handleCopy = () => {
        navigator.clipboard.writeText(ticket.ticket_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await onResend();
            toast.success('Đã gửi lại email thành công!');
        } catch {
            toast.error('Không thể gửi lại email');
        } finally {
            setResending(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="relative bg-white rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top gradient */}
                <div className="h-1.5 bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />

                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                <TicketIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-brand-orange)]">Chi tiết Ticket</p>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-bold text-[var(--text-primary)]">{ticket.ticket_code}</h2>
                                    <button
                                        onClick={handleCopy}
                                        className="p-1 rounded hover:bg-[var(--bg-muted)] transition-colors"
                                        title="Sao chép mã"
                                    >
                                        {copied ? (
                                            <CheckCircle className="w-4 h-4 text-[var(--color-brand-green)]" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-[var(--bg-muted)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* QR + Info */}
                    <div className="bg-gradient-to-br from-[var(--color-brand-navy)]/[0.04] to-[var(--color-brand-orange)]/[0.04] rounded-2xl p-5 mb-5 border border-[var(--border-light)]">
                        <div className="flex items-start gap-5">
                            {/* QR Code */}
                            <div className="shrink-0">
                                {ticket.qr_image ? (
                                    <img
                                        src={ticket.qr_image}
                                        alt="QR Code"
                                        className="w-32 h-32 rounded-xl bg-white p-2 shadow-[var(--shadow-card)]"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center">
                                        <span className="text-xs text-[var(--text-muted)]">Đang tải...</span>
                                    </div>
                                )}
                            </div>

                            {/* Event info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-[var(--text-primary)] text-base leading-snug mb-3">
                                    {event.title}
                                </h3>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex items-start gap-2">
                                        <Calendar className="w-4 h-4 text-[var(--color-brand-navy)] mt-0.5 shrink-0" />
                                        <div>
                                            <p className="font-semibold text-[var(--text-secondary)]">
                                                {startDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – {endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-[var(--color-brand-navy)] mt-0.5 shrink-0" />
                                        <p className="text-xs text-[var(--text-muted)]">{event.location || 'Chưa xác định'}</p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <StatusBadge status={ticket.status} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attendee info */}
                    <div className="bg-[var(--bg-muted)] rounded-xl p-4 mb-5 border border-[var(--border-light)]">
                        <div className="flex items-center gap-2 mb-3">
                            <User className="w-4 h-4 text-[var(--color-brand-navy)]" />
                            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Người tham dự</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-[var(--text-muted)] mb-0.5">Họ tên</p>
                                <p className="font-semibold text-[var(--text-primary)]">{ticket.registration.user.full_name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--text-muted)] mb-0.5">MSSV</p>
                                <p className="font-semibold text-[var(--text-primary)]">{ticket.registration.user.student_id || 'N/A'}</p>
                            </div>
                            {ticket.registration.user.department && (
                                <div className="col-span-2">
                                    <p className="text-xs text-[var(--text-muted)] mb-0.5">Khoa</p>
                                    <p className="font-semibold text-[var(--text-primary)]">{ticket.registration.user.department.name}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Hướng dẫn</p>
                        </div>
                        <ul className="text-xs text-amber-700 space-y-1">
                            <li>• Đến trước giờ bắt đầu ít nhất <strong>15 phút</strong></li>
                            <li>• Xuất trình ticket này hoặc mã QR khi check-in tại cổng</li>
                            <li>• Không chia sẻ ticket với người khác</li>
                            <li>• Ticket có giá trị trong suốt thời gian diễn ra sự kiện</li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onDownload}
                            className="flex-1 h-11 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Tải PDF Ticket
                        </button>
                        {ticket.is_upcoming && (
                            <button
                                onClick={handleResend}
                                disabled={resending}
                                className="h-11 px-5 rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] text-sm font-semibold border border-[var(--border-default)] hover:bg-[var(--border-light)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Mail className={`w-4 h-4 ${resending ? 'animate-pulse' : ''}`} />
                                Gửi lại Email
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function TicketsPage() {
    const { isAuthenticated, isHydrated } = useAuthStore();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const data = await ticketService.getMyTickets();
                setTickets(data);
            } catch {
                toast.error('Không thể tải danh sách ticket');
            } finally {
                setLoading(false);
            }
        };
        void init();
    }, []);

    const filteredTickets = tickets.filter((ticket) => {
        if (filter === 'upcoming') return ticket.is_upcoming;
        if (filter === 'past') return ticket.is_past;
        return true;
    });

    const counts = {
        all: tickets.length,
        upcoming: tickets.filter((t) => t.is_upcoming).length,
        past: tickets.filter((t) => t.is_past).length,
    };

    const handleDownload = async (ticket: Ticket) => {
        try {
            const blob = await ticketService.downloadPDF(ticket.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${ticket.ticket_code}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch {
            toast.error('Không thể tải PDF. Vui lòng thử lại.');
        }
    };

    const handleResend = async (ticketId: number) => {
        await ticketService.resendEmail(ticketId);
    };

    if (!isHydrated || loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-5 p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto">

                {/* ─── PAGE HEADER ─── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[var(--color-brand-navy)] opacity-[0.03] pointer-events-none" />
                    <div className="px-6 pt-6 pb-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                                <TicketIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">My Tickets</p>
                                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">Vé tham dự sự kiện</h1>
                                <p className="text-sm text-[var(--text-muted)]">Quản lý và xem vé điện tử của bạn</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── FILTER TABS ─── */}
                <div className="flex items-center gap-2">
                    {([
                        { key: 'all',      label: 'Tất cả' },
                        { key: 'upcoming', label: 'Sắp tới' },
                        { key: 'past',     label: 'Đã diễn ra' },
                    ] as const).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`relative h-10 px-4 rounded-xl text-sm font-semibold transition-all ${
                                filter === tab.key
                                    ? 'bg-[var(--color-brand-navy)] text-white shadow-[var(--shadow-brand)]'
                                    : 'bg-white text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-muted)]'
                            }`}
                        >
                            {tab.label}
                            {counts[tab.key] > 0 && (
                                <span className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                                    filter === tab.key ? 'bg-white/20 text-white' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                                }`}>
                                    {counts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ─── CONTENT ─── */}
                {filteredTickets.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                        <div className="flex flex-col items-center justify-center gap-4 py-20 px-6">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                <TicketIcon className="w-8 h-8 text-[var(--text-muted)]" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-[var(--text-secondary)]">
                                    {filter === 'all' ? 'Chưa có ticket nào' : `Không có ticket ${filter === 'upcoming' ? 'sắp tới' : 'đã diễn ra'}`}
                                </p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">
                                    {filter === 'all' ? 'Đăng ký tham gia sự kiện để nhận vé' : 'Hãy đăng ký sự kiện để nhận vé tham dự'}
                                </p>
                            </div>
                            <Link
                                href="/dashboard/events"
                                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all active:scale-95"
                            >
                                <Calendar className="w-4 h-4" />
                                Khám phá sự kiện
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredTickets.map((ticket) => (
                            <TicketCard
                                key={ticket.id}
                                ticket={ticket}
                                onView={() => setSelectedTicket(ticket)}
                                onDownload={() => handleDownload(ticket)}
                                onResend={() => handleResend(ticket.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ─── DETAIL MODAL ─── */}
            <AnimatePresence>
                {selectedTicket && (
                    <TicketDetailModal
                        ticket={selectedTicket}
                        onClose={() => setSelectedTicket(null)}
                        onDownload={() => handleDownload(selectedTicket)}
                        onResend={() => handleResend(selectedTicket.id)}
                    />
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
