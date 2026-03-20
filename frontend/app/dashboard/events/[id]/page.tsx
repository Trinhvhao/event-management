'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import {
    Calendar,
    MapPin,
    Users,
    Award,
    Clock,
    ArrowLeft,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { eventService } from '@/services/eventService';
import { registrationService } from '@/services/registrationService';
import { Event } from '@/types';
import { format, isPast, isFuture, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

export default function EventDetailPage() {
    const router = useRouter();
    const params = useParams();
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const eventId = Number(rawId);
    const isValidEventId = Number.isInteger(eventId) && eventId > 0;
    const { user, isAuthenticated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [event, setEvent] = useState<Event | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [registrationId, setRegistrationId] = useState<number | null>(null);

    useEffect(() => {
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
    }, [isAuthenticated, router, isValidEventId, eventId]);

    const fetchEventDetail = async () => {
        try {
            setLoading(true);
            const eventData = await eventService.getById(eventId);
            setEvent(eventData);

            // Check if user is already registered
            try {
                const myEventsRes = await registrationService.getMyRegistrations();
                const registration = myEventsRes.find(
                    (reg: any) => reg.event_id === eventId && reg.status === 'registered'
                );
                if (registration) {
                    setIsRegistered(true);
                    setRegistrationId(registration.id);
                }
            } catch (error) {
                console.error('Error checking registration:', error);
            }
        } catch (error: any) {
            console.error('Error fetching event:', error);
            toast.error('Không thể tải thông tin sự kiện');
            router.push('/dashboard/events');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!event) return;

        try {
            setRegistering(true);
            await registrationService.register(event.id);
            toast.success('Đăng ký sự kiện thành công!');
            setIsRegistered(true);
            fetchEventDetail(); // Refresh to update registration count
        } catch (error: any) {
            const message = error.response?.data?.error?.message || 'Đăng ký thất bại';
            toast.error(message);
        } finally {
            setRegistering(false);
        }
    };

    const handleCancelRegistration = async () => {
        if (!registrationId) return;

        if (!confirm('Bạn có chắc chắn muốn hủy đăng ký sự kiện này?')) {
            return;
        }

        try {
            setRegistering(true);
            await registrationService.cancel(registrationId);
            toast.success('Hủy đăng ký thành công');
            setIsRegistered(false);
            setRegistrationId(null);
            fetchEventDetail();
        } catch (error: any) {
            const message = error.response?.data?.error?.message || 'Hủy đăng ký thất bại';
            toast.error(message);
        } finally {
            setRegistering(false);
        }
    };

    const canRegister = () => {
        if (!event) return false;
        if (isRegistered) return false;
        if (event.status !== 'upcoming') return false;
        if (event.current_registrations >= event.capacity) return false;
        if (event.registration_deadline && isPast(new Date(event.registration_deadline))) return false;
        return true;
    };

    const canCancelRegistration = () => {
        if (!event || !isRegistered) return false;
        // Can cancel if event is more than 24 hours away
        const hoursUntilEvent = differenceInHours(new Date(event.start_time), new Date());
        return hoursUntilEvent > 24;
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string; icon: any }> = {
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

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandBlue"></div>
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

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Back button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-brandBlue transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Quay lại</span>
                </button>

                {/* Event header */}
                <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                    {/* Event image */}
                    <div className="relative h-64 md:h-96 bg-gradient-to-br from-brandBlue to-secondary">
                        {event.image_url ? (
                            <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Calendar className="w-24 h-24 text-white/50" />
                            </div>
                        )}
                        <div className="absolute top-4 right-4">
                            {getStatusBadge(event.status)}
                        </div>
                        {event.is_featured && (
                            <div className="absolute top-4 left-4 px-3 py-1.5 bg-secondary text-white text-sm font-semibold rounded-lg">
                                Sự kiện nổi bật
                            </div>
                        )}
                    </div>

                    {/* Event info */}
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-primary mb-2">{event.title}</h1>
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <span className="px-3 py-1 bg-brandLightBlue/20 text-brandBlue rounded-full font-medium">
                                        {event.category?.name}
                                    </span>
                                    <span className="text-gray-600">{event.department?.name}</span>
                                </div>
                            </div>

                            {/* Registration button */}
                            <div className="flex flex-col gap-2">
                                {isRegistered ? (
                                    <>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                                            <CheckCircle className="w-5 h-5" />
                                            <span className="font-medium">Đã đăng ký</span>
                                        </div>
                                        {canCancelRegistration() && (
                                            <button
                                                onClick={handleCancelRegistration}
                                                disabled={registering}
                                                className="px-4 py-2 bg-white text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                            >
                                                {registering ? 'Đang hủy...' : 'Hủy đăng ký'}
                                            </button>
                                        )}
                                    </>
                                ) : canRegister() ? (
                                    <button
                                        onClick={handleRegister}
                                        disabled={registering}
                                        className="px-6 py-3 bg-gradient-to-r from-brandBlue to-secondary text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-medium"
                                    >
                                        {registering ? 'Đang đăng ký...' : 'Đăng ký ngay'}
                                    </button>
                                ) : (
                                    <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-center">
                                        {event.current_registrations >= event.capacity
                                            ? 'Đã hết chỗ'
                                            : event.status !== 'upcoming'
                                                ? 'Không thể đăng ký'
                                                : 'Hết hạn đăng ký'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Event details grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <Calendar className="w-5 h-5 text-brandBlue flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-600 mb-1">Thời gian</p>
                                    <p className="font-semibold text-primary">
                                        {format(new Date(event.start_time), 'dd/MM/yyyy', { locale: vi })}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {format(new Date(event.start_time), 'HH:mm', { locale: vi })} - {format(new Date(event.end_time), 'HH:mm', { locale: vi })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <MapPin className="w-5 h-5 text-brandBlue flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-600 mb-1">Địa điểm</p>
                                    <p className="font-semibold text-primary">{event.location}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <Users className="w-5 h-5 text-brandBlue flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-600 mb-1">Số lượng</p>
                                    <p className="font-semibold text-primary">
                                        {event.current_registrations || 0}/{event.capacity} người
                                    </p>
                                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                                        <div
                                            className="bg-brandBlue h-1.5 rounded-full transition-all"
                                            style={{ width: `${((event.current_registrations || 0) / event.capacity) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <Award className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-green-700 mb-1">Điểm rèn luyện</p>
                                    <p className="text-2xl font-bold text-green-600">{event.training_points}</p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {event.description && (
                            <div className="prose max-w-none">
                                <h3 className="text-lg font-semibold text-primary mb-3">Mô tả sự kiện</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                            </div>
                        )}

                        {/* Organizer info */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-600 mb-2">Thông tin tổ chức</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-brandBlue to-secondary rounded-full flex items-center justify-center text-white font-semibold">
                                    {event.organizer?.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-primary">{event.organizer?.full_name}</p>
                                    <p className="text-sm text-gray-600">{event.department?.name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
