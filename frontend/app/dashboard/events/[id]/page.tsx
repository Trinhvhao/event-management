'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import {
    Calendar, MapPin, Users, Award, Clock, ArrowLeft,
    CheckCircle, XCircle, AlertCircle, Edit2, Ban, Hourglass, Trash2,
    Star, ChevronRight, CalendarCheck, Timer,
    GraduationCap, Building2, Ticket, Info, Bell, Tag
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { eventService } from '@/services/eventService';
import { registrationService } from '@/services/registrationService';
import { Event, Registration } from '@/types';
import { format, isPast, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import EventFeedbackSection from '@/components/feedback/EventFeedbackSection';
import EventRegistrationsTab from '@/components/events/EventRegistrationsTab';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }
    return fallback;
};

interface WaitlistInfo {
    in_waitlist: boolean;
    position?: number;
    total_waitlist?: number;
}

function formatDuration(start: string, end: string) {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const hours = differenceInHours(endDate, startDate);
    const minutes = differenceInMinutes(endDate, startDate) % 60;

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        if (remainingHours > 0) {
            return `${days} ngày ${remainingHours} giờ`;
        }
        return `${days} ngày`;
    }
    if (hours > 0 && minutes > 0) return `${hours} giờ ${minutes} phút`;
    if (hours > 0) return `${hours} giờ`;
    return `${minutes} phút`;
}

function getTimeUntilEvent(start: string) {
    const now = new Date();
    const startDate = parseISO(start);
    const diffMs = startDate.getTime() - now.getTime();
    if (diffMs < 0) return null;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return { text: `${days} ngày ${hours}h`, urgent: days <= 1 };
    if (hours > 0) return { text: `${hours} giờ ${mins}p`, urgent: hours <= 2 };
    return { text: `${mins} phút`, urgent: true };
}

function getDayOfWeek(dateStr: string) {
    const date = parseISO(dateStr);
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[date.getDay()];
}

export default function EventDetailPage() {
    const router = useRouter();
    const params = useParams();
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const eventId = Number(rawId);
    const isValidEventId = Number.isInteger(eventId) && eventId > 0;
    const { user, isAuthenticated, isHydrated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [processingEventAction, setProcessingEventAction] = useState(false);
    const [event, setEvent] = useState<Event | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [registrationId, setRegistrationId] = useState<number | null>(null);
    const [waitlistInfo, setWaitlistInfo] = useState<WaitlistInfo | null>(null);

    const fetchEventDetail = useCallback(async () => {
        try {
            setLoading(true);
            setIsRegistered(false);
            setRegistrationId(null);
            setWaitlistInfo(null);

            const eventData = await eventService.getById(eventId);
            setEvent(eventData);

            if (user?.role === 'student') {
                try {
                    const myEventsRes = await registrationService.getMyRegistrations();
                    const registration = myEventsRes.find(
                        (reg: Registration) => reg.event_id === eventId && reg.status === 'registered'
                    );
                    if (registration) {
                        setIsRegistered(true);
                        setRegistrationId(registration.id);
                    }
                } catch (error) {
                    console.error('Error checking registration:', error);
                }

                try {
                    const waitlist = await registrationService.getWaitlistPosition(eventId);
                    setWaitlistInfo(waitlist);
                } catch (error) {
                    console.error('Error checking waitlist:', error);
                    setWaitlistInfo({ in_waitlist: false });
                }
            }
        } catch (error: unknown) {
            console.error('Error fetching event:', error);
            toast.error(getErrorMessage(error, 'Không thể tải thông tin sự kiện'));
            router.push('/dashboard/events');
        } finally {
            setLoading(false);
        }
    }, [eventId, router, user?.role]);

    useEffect(() => {
        if (!isHydrated) return;
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (!isValidEventId) {
            toast.error('ID sự kiện không hợp lệ');
            router.push('/dashboard/events');
            return;
        }
        fetchEventDetail();
    }, [isAuthenticated, isHydrated, router, isValidEventId, fetchEventDetail]);

    const handleRegister = async () => {
        if (!event) return;
        try {
            setRegistering(true);
            await registrationService.register(event.id);
            toast.success('Đăng ký sự kiện thành công!');
            setIsRegistered(true);
            setWaitlistInfo({ in_waitlist: false });
            fetchEventDetail();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Đăng ký thất bại'));
        } finally {
            setRegistering(false);
        }
    };

    const handleJoinWaitlist = async () => {
        if (!event) return;
        try {
            setRegistering(true);
            await registrationService.joinWaitlist(event.id);
            toast.success('Đã thêm vào danh sách chờ!');
            fetchEventDetail();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Không thể tham gia danh sách chờ'));
        } finally {
            setRegistering(false);
        }
    };

    const handleLeaveWaitlist = async () => {
        if (!event) return;
        if (!confirm('Bạn có chắc chắn muốn rời danh sách chờ?')) return;
        try {
            setRegistering(true);
            await registrationService.leaveWaitlist(event.id);
            toast.success('Đã rời danh sách chờ');
            setWaitlistInfo({ in_waitlist: false });
            fetchEventDetail();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Không thể rời danh sách chờ'));
        } finally {
            setRegistering(false);
        }
    };

    const handleCancelRegistration = async () => {
        if (!registrationId) return;
        if (!confirm('Bạn có chắc chắn muốn hủy đăng ký sự kiện này?')) return;
        try {
            setRegistering(true);
            await registrationService.cancel(registrationId);
            toast.success('Hủy đăng ký thành công');
            setIsRegistered(false);
            setRegistrationId(null);
            fetchEventDetail();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Hủy đăng ký thất bại'));
        } finally {
            setRegistering(false);
        }
    };

    const handleCancelEvent = async () => {
        if (!event) return;
        if (!confirm('Bạn có chắc chắn muốn hủy sự kiện này? Tất cả đăng ký sẽ bị hủy.')) return;
        try {
            setProcessingEventAction(true);
            await eventService.cancelEvent(event.id);
            toast.success('Đã hủy sự kiện');
            fetchEventDetail();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Hủy sự kiện thất bại'));
        } finally {
            setProcessingEventAction(false);
        }
    };

    const handleApproveEvent = async () => {
        if (!event) return;
        try {
            setProcessingEventAction(true);
            await eventService.approveEvent(event.id);
            toast.success('Đã duyệt sự kiện');
            fetchEventDetail();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Duyệt sự kiện thất bại'));
        } finally {
            setProcessingEventAction(false);
        }
    };

    const handleRejectEvent = async () => {
        if (!event) return;
        const reasonInput = prompt('Nhập lý do từ chối (có thể để trống):');
        if (reasonInput === null) return;
        try {
            setProcessingEventAction(true);
            await eventService.rejectEvent(event.id, reasonInput.trim() || undefined);
            toast.success('Đã từ chối sự kiện');
            fetchEventDetail();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Từ chối sự kiện thất bại'));
        } finally {
            setProcessingEventAction(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!event) return;
        if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn sự kiện này? Hành động này không thể hoàn tác.')) return;
        try {
            setProcessingEventAction(true);
            await eventService.delete(event.id);
            toast.success('Đã xóa sự kiện');
            router.push(isOrganizerOwner ? '/dashboard/my-events' : '/dashboard/events');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Xóa sự kiện thất bại'));
        } finally {
            setProcessingEventAction(false);
        }
    };

    const isAdmin = user?.role === 'admin';
    const isStudent = user?.role === 'student';
    const isOrganizerOwner = user?.role === 'organizer' && user?.id === event?.organizer_id;
    const isOrganizerOrAdmin = isAdmin || isOrganizerOwner;
    const canReviewPendingEvent = isAdmin && event?.status === 'pending';
    const canManageEvent = isOrganizerOrAdmin && event?.status !== 'pending';
    const canDeleteEvent = isOrganizerOrAdmin;
    const canViewRegistrations = isOrganizerOrAdmin && event?.status !== 'pending';

    const isEventFull = event ? (event.current_registrations || 0) >= event.capacity : false;
    const isUpcoming = event?.status === 'upcoming' || event?.status === 'approved';
    const isPastDeadline = event?.registration_deadline ? isPast(new Date(event.registration_deadline)) : false;
    const spotsLeft = event ? event.capacity - (event.current_registrations || 0) : 0;

    const canRegister = () => {
        if (!event) return false;
        if (isRegistered) return false;
        if (!isUpcoming) return false;
        if (isEventFull) return false;
        if (isPastDeadline) return false;
        return true;
    };

    const canJoinWaitlist = () => {
        if (!event) return false;
        if (isRegistered) return false;
        if (!isUpcoming) return false;
        if (isPastDeadline) return false;
        if (waitlistInfo?.in_waitlist) return false;
        return isEventFull;
    };

    const canCancelRegistration = () => {
        if (!event || !isRegistered) return false;
        const hoursUntilEvent = differenceInHours(new Date(event.start_time), new Date());
        return hoursUntilEvent > 24;
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string; icon: LucideIcon }> = {
            upcoming: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sắp diễn ra', icon: Clock },
            ongoing: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đang diễn ra', icon: CheckCircle },
            completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Đã kết thúc', icon: XCircle },
            cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Đã hủy', icon: AlertCircle },
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Chờ duyệt', icon: Clock },
            approved: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Đã duyệt', icon: CheckCircle },
        };
        const badge = badges[status] || badges.upcoming;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                <Icon className="w-4 h-4" />
                {badge.label}
            </span>
        );
    };

    const countdown = event ? getTimeUntilEvent(event.start_time) : null;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="w-12 h-12 rounded-full border-[3px] border-(--color-brand-light) border-t-(--color-brand-navy) animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    if (!event) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-gray-600">Không tìm thấy sự kiện</p>
                </div>
            </DashboardLayout>
        );
    }

    const regPercent = event.capacity > 0
        ? Math.round(((event.current_registrations || 0) / event.capacity) * 100)
        : 0;

    return (
        <DashboardLayout>
            <div className="space-y-5 max-w-7xl mx-auto">

                {/* Back button */}
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-(--text-secondary) hover:text-(--color-brand-navy) transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-semibold">Quay lại</span>
                </button>

                {/* ── EVENT HERO ── */}
                <div className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-white shadow-card">
                    {/* Banner image */}
                    <div className="relative h-56 md:h-72 lg:h-80 bg-linear-to-br from-(--color-brand-navy) via-[#1a3a7a] to-(--color-brand-navy) overflow-hidden">
                        {event.image_url ? (
                            <>
                                <Image src={event.image_url} alt={event.title} fill sizes="100vw" className="object-cover" priority />
                                <div className="absolute inset-0 bg-linear-to-t from-slate-900/70 via-transparent to-transparent" />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Calendar className="w-24 h-24 text-white/10" />
                            </div>
                        )}

                        {/* Top badges overlay */}
                        <div className="absolute top-4 right-4 z-10 flex flex-wrap gap-2">
                            {getStatusBadge(event.status)}
                        </div>
                        {event.is_featured && (
                            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-(--color-brand-orange) text-white text-sm font-bold rounded-lg shadow-md">
                                <Star className="w-4 h-4 fill-current" />
                                Sự kiện nổi bật
                            </div>
                        )}
                        {Number(event.event_cost) > 0 && (
                            <div className="absolute bottom-4 left-4 z-10">
                                <span className="px-4 py-2 bg-(--color-brand-orange) text-white text-lg font-extrabold rounded-xl shadow-lg flex items-center gap-1.5">
                                    <Ticket className="w-5 h-5" />
                                    {new Intl.NumberFormat('vi-VN').format(Number(event.event_cost))}đ
                                </span>
                            </div>
                        )}

                        {/* Countdown banner */}
                        {countdown && isUpcoming && (
                            <div className={`absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg ${
                                countdown.urgent
                                    ? 'bg-red-500 text-white animate-pulse'
                                    : 'bg-white/90 backdrop-blur-sm text-(--color-brand-navy)'
                            }`}>
                                <Timer className="w-4 h-4 inline mr-1" />
                                {countdown.text}
                            </div>
                        )}
                    </div>

                    {/* Event header info */}
                    <div className="px-6 md:px-8 pb-6 md:pb-8">
                        {/* Category + Department tags */}
                        <div className="flex flex-wrap items-center gap-2 mb-4 mt-5">
                            {event.category && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                                    <Tag className="w-3 h-3" />
                                    {event.category.name}
                                </span>
                            )}
                            {event.department && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                                    <Building2 className="w-3 h-3" />
                                    {event.department.name}
                                </span>
                            )}
                        </div>

                        {/* Title + Description */}
                        <h1 className="text-2xl md:text-3xl font-extrabold text-(--text-primary) mb-3 leading-tight">
                            {event.title}
                        </h1>

                        {event.description && (
                            <p className="text-(--text-secondary) leading-relaxed mb-6">
                                {event.description}
                            </p>
                        )}

                        {/* ── ACTION BUTTONS ── */}
                        <div className="flex flex-wrap gap-3">
                            {/* Student registration */}
                            {isStudent && (
                                <>
                                    {isRegistered ? (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 font-semibold">
                                                <CheckCircle className="w-5 h-5" />
                                                Bạn đã đăng ký thành công
                                            </div>
                                            {canCancelRegistration() && (
                                                <button
                                                    onClick={handleCancelRegistration}
                                                    disabled={registering}
                                                    className="px-5 py-2.5 bg-white text-red-600 border border-red-300 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 text-sm font-semibold"
                                                >
                                                    {registering ? 'Đang hủy...' : 'Hủy đăng ký'}
                                                </button>
                                            )}
                                        </div>
                                    ) : waitlistInfo?.in_waitlist ? (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 font-semibold">
                                                <Hourglass className="w-5 h-5" />
                                                Vị trí #{waitlistInfo.position} trong danh sách chờ
                                            </div>
                                            <button onClick={handleLeaveWaitlist} disabled={registering}
                                                className="px-5 py-2.5 bg-white text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm font-semibold">
                                                {registering ? 'Đang rời...' : 'Rời danh sách chờ'}
                                            </button>
                                        </div>
                                    ) : canJoinWaitlist() ? (
                                        <button onClick={handleJoinWaitlist} disabled={registering}
                                            className="px-6 py-3 bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 font-semibold flex items-center gap-2 shadow-md">
                                            <Hourglass className="w-5 h-5" />
                                            {registering ? 'Đang xử lý...' : 'Vào danh sách chờ'}
                                        </button>
                                    ) : canRegister() ? (
                                        <button onClick={handleRegister} disabled={registering}
                                            className="px-8 py-3 bg-linear-to-r from-(--color-brand-navy) to-[#1a5fc8] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 font-semibold shadow-brand">
                                            {registering ? 'Đang đăng ký...' : 'Đăng ký ngay'}
                                        </button>
                                    ) : (
                                        <div className="px-5 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold text-center">
                                            {isEventFull
                                                ? 'Đã hết chỗ'
                                                : !isUpcoming
                                                    ? 'Không thể đăng ký'
                                                    : isPastDeadline
                                                        ? 'Hết hạn đăng ký'
                                                        : 'Không khả dụng'}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Admin review */}
                            {canReviewPendingEvent && (
                                <>
                                    <button onClick={handleApproveEvent} disabled={processingEventAction}
                                        className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 font-semibold shadow-md">
                                        {processingEventAction ? 'Đang duyệt...' : 'Duyệt sự kiện'}
                                    </button>
                                    <button onClick={handleRejectEvent} disabled={processingEventAction}
                                        className="px-5 py-2.5 bg-white border border-red-400 text-red-600 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 font-semibold">
                                        Từ chối
                                    </button>
                                </>
                            )}

                            {/* Organizer/Admin management */}
                            {canManageEvent && (
                                <>
                                    {(event.status === 'pending' || event.status === 'approved' || event.status === 'upcoming') && (
                                        <button onClick={() => router.push(`/dashboard/events/${event.id}/edit`)}
                                            className="px-5 py-2.5 bg-white border border-(--color-brand-navy) text-(--color-brand-navy) rounded-xl hover:bg-(--color-brand-navy)/5 transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm">
                                            <Edit2 className="w-4 h-4" />
                                            Chỉnh sửa
                                        </button>
                                    )}
                                    {event.status !== 'cancelled' && event.status !== 'completed' && (
                                        <button onClick={handleCancelEvent} disabled={processingEventAction}
                                            className="px-5 py-2.5 bg-white border border-red-400 text-red-600 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2 text-sm font-semibold">
                                            <Ban className="w-4 h-4" />
                                            {processingEventAction ? 'Đang xử lý...' : 'Hủy sự kiện'}
                                        </button>
                                    )}
                                    {canDeleteEvent && (
                                        <button onClick={handleDeleteEvent} disabled={processingEventAction}
                                            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-semibold">
                                            <Trash2 className="w-4 h-4" />
                                            {processingEventAction ? 'Đang xóa...' : 'Xóa sự kiện'}
                                        </button>
                                    )}
                                </>
                            )}

                            {canDeleteEvent && event.status === 'pending' && (
                                <button onClick={handleDeleteEvent} disabled={processingEventAction}
                                    className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-semibold">
                                    <Trash2 className="w-4 h-4" />
                                    {processingEventAction ? 'Đang xóa...' : 'Xóa sự kiện'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── MAIN CONTENT: INFO CARDS + SIDEBAR ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* LEFT: Info cards */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* ── Time & Location Grid ── */}
                        <div className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-white shadow-card">
                            <div className="absolute top-0 left-0 right-0 h-0.75 bg-linear-to-r from-(--color-brand-navy) to-(--color-brand-orange)" />
                            <div className="px-6 py-5">
                                <h2 className="text-base font-extrabold text-(--text-primary) mb-4 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-(--color-brand-navy)" />
                                    Thông tin sự kiện
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Date */}
                                    <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                            <Calendar className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Ngày diễn ra</p>
                                            <p className="font-bold text-(--text-primary)">
                                                {getDayOfWeek(event.start_time)}, {format(new Date(event.start_time), 'dd/MM/yyyy', { locale: vi })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <div className="flex items-start gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                            <Clock className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Giờ bắt đầu - Kết thúc</p>
                                            <p className="font-bold text-(--text-primary)">
                                                {format(new Date(event.start_time), 'HH:mm')} — {format(new Date(event.end_time), 'HH:mm')}
                                            </p>
                                            <p className="text-xs text-(--text-muted) mt-0.5">
                                                Thời lượng: <span className="font-semibold text-amber-700">{formatDuration(event.start_time, event.end_time)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="flex items-start gap-3 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                                            <MapPin className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">Địa điểm</p>
                                            <p className="font-bold text-(--text-primary)">{event.location}</p>
                                        </div>
                                    </div>

                                    {/* Organizer */}
                                    <div className="flex items-start gap-3 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                                            <GraduationCap className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">Người tổ chức</p>
                                            <p className="font-bold text-(--text-primary)">{event.organizer?.full_name}</p>
                                            {event.department && (
                                                <p className="text-xs text-(--text-muted)">{event.department.name}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Additional info row */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-(--border-light)">
                                    {/* Category */}
                                    {event.category && (
                                        <div className="text-center p-3 bg-(--bg-muted) rounded-xl">
                                            <p className="text-xs text-(--text-muted) mb-1">Danh mục</p>
                                            <p className="text-sm font-bold text-(--text-primary) truncate">{event.category.name}</p>
                                        </div>
                                    )}

                                    {/* Department */}
                                    {event.department && (
                                        <div className="text-center p-3 bg-(--bg-muted) rounded-xl">
                                            <p className="text-xs text-(--text-muted) mb-1">Khoa</p>
                                            <p className="text-sm font-bold text-(--text-primary) truncate">{event.department.code}</p>
                                        </div>
                                    )}

                                    {/* Duration */}
                                    <div className="text-center p-3 bg-(--bg-muted) rounded-xl">
                                        <p className="text-xs text-(--text-muted) mb-1">Thời lượng</p>
                                        <p className="text-sm font-bold text-(--text-primary)">
                                            {formatDuration(event.start_time, event.end_time)}
                                        </p>
                                    </div>

                                    {/* Capacity */}
                                    <div className="text-center p-3 bg-(--bg-muted) rounded-xl">
                                        <p className="text-xs text-(--text-muted) mb-1">Sức chứa</p>
                                        <p className="text-sm font-bold text-(--text-primary)">{event.capacity} người</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Capacity & Registration Stats ── */}
                        <div className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-white shadow-card">
                            <div className="px-6 py-5">
                                <h2 className="text-base font-extrabold text-(--text-primary) mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-(--color-brand-navy)" />
                                    Lượt đăng ký
                                </h2>

                                <div className="space-y-4">
                                    {/* Main capacity bar */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-extrabold text-(--text-primary)">{event.current_registrations || 0}</span>
                                                <span className="text-sm text-(--text-muted) font-medium">/ {event.capacity} đã đăng ký</span>
                                            </div>
                                            <span className={`text-sm font-bold ${regPercent >= 90 ? 'text-red-600' : 'text-(--color-brand-navy)'}`}>
                                                {regPercent}% đầy
                                            </span>
                                        </div>
                                        <div className="h-3 bg-(--bg-muted) rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    regPercent >= 90 ? 'bg-linear-to-r from-red-500 to-red-400'
                                                    : regPercent >= 70 ? 'bg-linear-to-r from-(--color-brand-orange) to-amber-400'
                                                    : 'bg-linear-to-r from-(--color-brand-navy) to-blue-400'
                                                }`}
                                                style={{ width: `${regPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <p className="text-xs text-emerald-600 font-medium mb-1">Đã đăng ký</p>
                                            <p className="text-lg font-extrabold text-emerald-700">{event.current_registrations || 0}</p>
                                        </div>
                                        <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <p className="text-xs text-blue-600 font-medium mb-1">Còn trống</p>
                                            <p className="text-lg font-extrabold text-blue-700">{spotsLeft > 0 ? spotsLeft : 0}</p>
                                        </div>
                                        <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-100">
                                            <p className="text-xs text-amber-600 font-medium mb-1">Đang chờ</p>
                                            <p className="text-lg font-extrabold text-amber-700">{waitlistInfo?.total_waitlist || 0}</p>
                                        </div>
                                    </div>

                                    {/* Spots warning */}
                                    {isEventFull && (
                                        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-red-700">Sự kiện đã đầy!</p>
                                                <p className="text-xs text-red-600">{waitlistInfo?.total_waitlist || 0} người đang trong danh sách chờ</p>
                                            </div>
                                        </div>
                                    )}
                                    {!isEventFull && spotsLeft <= 10 && spotsLeft > 0 && (
                                        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                                            <Bell className="w-5 h-5 text-amber-600 shrink-0" />
                                            <p className="text-sm font-semibold text-amber-700">Chỉ còn {spotsLeft} chỗ trống!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Description ── */}
                        {event.description && (
                            <div className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-white shadow-card">
                                <div className="absolute top-0 left-0 right-0 h-0.75 bg-linear-to-r from-(--color-brand-orange) to-brand-gold" />
                                <div className="px-6 py-5">
                                    <h2 className="text-base font-extrabold text-(--text-primary) mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-(--color-brand-navy)" />
                                        Mô tả sự kiện
                                    </h2>
                                    <div className="prose max-w-none text-(--text-secondary) leading-relaxed">
                                        <p className="whitespace-pre-wrap">{event.description}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Sidebar */}
                    <div className="space-y-4">

                        {/* ── Quick Stats Card ── */}
                        <div className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-white shadow-card">
                            <div className="absolute top-0 left-0 right-0 h-0.75 bg-linear-to-r from-(--color-brand-navy) to-(--color-brand-orange)" />
                            <div className="px-5 py-5 space-y-4">
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-(--text-muted)">Tóm tắt</h3>

                                {/* Training Points */}
                                <div className="flex items-center gap-3 p-4 bg-linear-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
                                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-md">
                                        <Award className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-amber-600 font-medium">Điểm rèn luyện</p>
                                        <p className="text-2xl font-extrabold text-amber-700">+{event.training_points} ĐRL</p>
                                    </div>
                                </div>

                                {/* Fee */}
                                {Number(event.event_cost) > 0 ? (
                                    <div className="flex items-center gap-3 p-4 bg-linear-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                        <div className="w-11 h-11 rounded-xl bg-linear-to-br from-(--color-brand-orange) to-red-500 flex items-center justify-center shadow-md">
                                            <Ticket className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-orange-600 font-medium">Phí tham gia</p>
                                            <p className="text-xl font-extrabold text-orange-700">
                                                {new Intl.NumberFormat('vi-VN').format(Number(event.event_cost))}đ
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-linear-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                                        <div className="w-11 h-11 rounded-xl bg-linear-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-md">
                                            <Ticket className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-emerald-600 font-medium">Phí tham gia</p>
                                            <p className="text-xl font-extrabold text-emerald-700">Miễn phí</p>
                                        </div>
                                    </div>
                                )}

                                {/* Registration deadline */}
                                {event.registration_deadline && (
                                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="w-11 h-11 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                                            <CalendarCheck className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-600 font-medium">Hạn đăng ký</p>
                                            <p className="text-sm font-bold text-(--text-primary)">
                                                {format(new Date(event.registration_deadline), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                            </p>
                                            {isPastDeadline ? (
                                                <p className="text-xs text-red-600 font-semibold">Đã hết hạn</p>
                                            ) : (
                                                <p className="text-xs text-emerald-600 font-semibold">Còn nhận đăng ký</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Waitlist Info Card ── */}
                        {waitlistInfo?.in_waitlist && (
                            <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-linear-to-br from-amber-50 to-orange-50 shadow-card p-5">
                                <div className="absolute top-0 left-0 right-0 h-0.75 bg-linear-to-r from-amber-400 to-orange-400" />
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                        <Hourglass className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-amber-900">Danh sách chờ</p>
                                        <p className="text-xs text-amber-700">Vị trí #{waitlistInfo.position}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-amber-800">
                                    Có {waitlistInfo.total_waitlist || 0} người đang chờ • Bạn sẽ được thông báo khi có chỗ trống
                                </p>
                            </div>
                        )}

                        {/* ── Organizer Card ── */}
                        <div className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-white shadow-card">
                            <div className="px-5 py-5">
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-(--text-muted) mb-4">Người tổ chức</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-(--color-brand-navy) to-[#1a5fc8] flex items-center justify-center text-white font-extrabold text-lg shadow-md shrink-0">
                                        {event.organizer?.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-(--text-primary) truncate">{event.organizer?.full_name}</p>
                                        {event.organizer?.email && (
                                            <p className="text-xs text-(--text-muted) truncate">{event.organizer.email}</p>
                                        )}
                                        {event.department && (
                                            <p className="text-xs text-purple-600 font-medium flex items-center gap-1 mt-0.5">
                                                <Building2 className="w-3 h-3" />
                                                {event.department.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── My Registration Info ── */}
                        {isRegistered && (
                            <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-green-50 shadow-card p-5">
                                <div className="absolute top-0 left-0 right-0 h-0.75 bg-linear-to-r from-emerald-400 to-green-400" />
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <p className="font-bold text-emerald-900">Đã đăng ký</p>
                                </div>
                                <p className="text-sm text-emerald-800 mb-3">
                                    Bạn đã đăng ký thành công sự kiện này. Hãy mang mã QR khi đến tham dự.
                                </p>
                                <button
                                    onClick={() => router.push('/dashboard/my-events')}
                                    className="text-sm font-semibold text-emerald-700 flex items-center gap-1 hover:text-emerald-900 transition-colors"
                                >
                                    Xem mã QR
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── REGISTRATIONS TAB (organizer/admin only) ── */}
                {canViewRegistrations && (
                    <EventRegistrationsTab eventId={event.id} />
                )}

                {/* ── FEEDBACK SECTION ── */}
                <EventFeedbackSection eventId={event.id} eventStatus={event.status} />
            </div>
        </DashboardLayout>
    );
}
