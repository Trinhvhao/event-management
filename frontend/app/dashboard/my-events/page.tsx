'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { registrationService } from '@/services/registrationService';
import { eventService } from '@/services/eventService';
import { Event, Registration, UserRole } from '@/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    Calendar,
    MapPin,
    Award,
    QrCode as QrCodeIcon,
    X,
    Download,
    Search,
    Users,
    Edit,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }
    return fallback;
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    registered: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    cancelled: { bg: 'bg-rose-500/10', text: 'text-rose-600', dot: 'bg-rose-500' },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', dot: 'bg-amber-500' },
    approved: { bg: 'bg-blue-500/10', text: 'text-blue-600', dot: 'bg-blue-500' },
    upcoming: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', dot: 'bg-indigo-500' },
    ongoing: { bg: 'bg-green-500/10', text: 'text-green-600', dot: 'bg-green-500' },
    completed: { bg: 'bg-gray-500/10', text: 'text-gray-600', dot: 'bg-gray-500' },
    rejected: { bg: 'bg-red-500/10', text: 'text-red-600', dot: 'bg-red-500' },
};

const statusLabels: Record<string, string> = {
    registered: 'Đã đăng ký',
    cancelled: 'Đã hủy',
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    upcoming: 'Sắp diễn ra',
    ongoing: 'Đang diễn ra',
    completed: 'Đã kết thúc',
    rejected: 'Bị từ chối',
};

interface EventCardProps {
    event: Event;
    role: UserRole;
    onEdit?: (event: Event) => void;
    onCancelRegistration?: (registration: Registration) => void;
    onShowQR?: (registration: Registration) => void;
    registration?: Registration;
}

const EventCard: React.FC<EventCardProps> = ({
    event,
    role,
    onEdit,
    onCancelRegistration,
    onShowQR,
    registration,
}) => {
    const statusStyle = statusColors[event.status] || statusColors.pending;
    const regStatusStyle = registration ? statusColors[registration.status] : null;
    const isUpcoming = event.status === 'upcoming' || event.status === 'approved';
    const registrationPercent = event.capacity > 0 ? (event.current_registrations / event.capacity) * 100 : 0;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#00358F]/20 transition-all duration-300 group">
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-[#00358F] mb-3 group-hover:text-[#F26600] transition-colors leading-tight">
                                {event.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="px-3 py-1 bg-[#00358F]/10 text-[#00358F] rounded-lg text-xs font-bold uppercase tracking-wide">
                                    {event.category?.name || 'Không phân loại'}
                                </span>
                                <span className={`px-3 py-1 ${statusStyle.bg} ${statusStyle.text} rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                                    {statusLabels[event.status] || event.status}
                                </span>
                                {registration && (
                                    <span className={`px-3 py-1 ${regStatusStyle?.bg} ${regStatusStyle?.text} rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${regStatusStyle?.dot}`}></span>
                                        {statusLabels[registration.status] || registration.status}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 mb-5 bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#00358F]/10 flex items-center justify-center shrink-0">
                                <Calendar className="w-4 h-4 text-[#00358F]" />
                            </div>
                            <span className="font-medium">
                                {format(new Date(event.start_time), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#F26600]/10 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4 text-[#F26600]" />
                            </div>
                            <span className="font-medium line-clamp-1">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <Award className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="font-bold text-emerald-600">
                                +{event.training_points} ĐRL
                            </span>
                        </div>
                    </div>

                    <div className="mb-5">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-500 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Lượt đăng ký
                            </span>
                            <span className="font-semibold text-[#00358F]">
                                {event.current_registrations} / {event.capacity}
                            </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#00358F] to-[#F26600] rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(registrationPercent, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {event.department && (
                        <p className="text-sm text-gray-500 mb-4">
                            <span className="font-medium">Đơn vị:</span> {event.department.name}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => window.location.href = `/dashboard/events/${event.id}`}
                            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold text-sm"
                        >
                            Xem chi tiết
                        </button>

                        {role === 'student' && registration && registration.status === 'registered' && isUpcoming && (
                            <>
                                <button
                                    onClick={() => onShowQR?.(registration)}
                                    className="px-5 py-2.5 bg-[#00358F] text-white rounded-xl hover:bg-[#00358F]/90 transition-all font-semibold flex items-center gap-2 text-sm shadow-md shadow-[#00358F]/20 hover:scale-105"
                                >
                                    <QrCodeIcon className="w-4 h-4" />
                                    Lấy QR Code
                                </button>
                                <button
                                    onClick={() => onCancelRegistration?.(registration)}
                                    className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors font-semibold text-sm"
                                >
                                    Hủy tham gia
                                </button>
                            </>
                        )}

                        {role === 'organizer' && isUpcoming && (
                            <button
                                onClick={() => onEdit?.(event)}
                                className="px-5 py-2.5 bg-[#F26600] text-white rounded-xl hover:bg-[#F26600]/90 transition-all font-semibold flex items-center gap-2 text-sm shadow-md shadow-[#F26600]/20 hover:scale-105"
                            >
                                <Edit className="w-4 h-4" />
                                Chỉnh sửa
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EventSkeleton: React.FC = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
                <div className="h-7 w-3/4 bg-gray-200 rounded-lg mb-3"></div>
                <div className="flex gap-2 mb-4">
                    <div className="h-6 w-24 bg-gray-200 rounded-lg"></div>
                    <div className="h-6 w-20 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    <div className="h-14 bg-gray-100 rounded-xl"></div>
                    <div className="h-14 bg-gray-100 rounded-xl"></div>
                    <div className="h-14 bg-gray-100 rounded-xl"></div>
                </div>
                <div className="h-10 bg-gray-100 rounded-xl mb-5"></div>
                <div className="flex gap-3">
                    <div className="h-10 w-28 bg-gray-200 rounded-xl"></div>
                    <div className="h-10 w-28 bg-gray-200 rounded-xl"></div>
                </div>
            </div>
        </div>
    </div>
);

type OrganizerTab = 'all' | 'upcoming' | 'completed' | 'rejected';
type StudentTab = 'all' | 'upcoming' | 'completed';

export default function MyEventsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isHydrated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<OrganizerTab | StudentTab>('upcoming');
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const [selectedQR, setSelectedQR] = useState<Registration | null>(null);
    const [qrLoadingId, setQrLoadingId] = useState<number | null>(null);

    const isOrganizer = user?.role === 'organizer';
    const isStudent = user?.role === 'student';

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            if (isOrganizer) {
                const data = await eventService.getMyEvents();
                setEvents(data || []);
            } else if (isStudent) {
                const data = await registrationService.getMyRegistrations();
                setRegistrations(data || []);
            }
        } catch (error: unknown) {
            console.error('Error fetching data:', error);
            toast.error(getErrorMessage(error, 'Không thể tải dữ liệu'));
        } finally {
            setLoading(false);
        }
    }, [isOrganizer, isStudent]);

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.push('/login');
            return;
        }
        if (isHydrated && isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, isHydrated, router, fetchData]);

    const handleCancelRegistration = async (registration: Registration) => {
        if (!confirm('Bạn có chắc chắn muốn hủy đăng ký sự kiện này?')) {
            return;
        }

        try {
            await registrationService.cancel(registration.id);
            toast.success('Hủy đăng ký thành công');
            fetchData();
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

    const handleEditEvent = (event: Event) => {
        router.push(`/dashboard/events/${event.id}/edit`);
    };

    const downloadQRCode = (registration: Registration) => {
        if (!registration.qr_code) return;
        const link = document.createElement('a');
        link.download = `qr-code-${registration.event?.title || registration.id}.png`;
        link.href = registration.qr_code;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredEvents = events.filter((event) => {
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === 'all') return matchesSearch;
        if (activeTab === 'upcoming') {
            return matchesSearch && (event.status === 'upcoming' || event.status === 'approved' || event.status === 'ongoing');
        }
        if (activeTab === 'completed') {
            return matchesSearch && event.status === 'completed';
        }
        if (activeTab === 'rejected') {
            return matchesSearch && (event.status === 'pending' || event.status === 'rejected' || event.status === 'cancelled');
        }
        return matchesSearch;
    });

    const filteredRegistrations = registrations.filter((reg) => {
        const matchesSearch = reg.event?.title.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === 'all') return matchesSearch;
        if (activeTab === 'upcoming') {
            return matchesSearch && reg.status === 'registered' &&
                (reg.event?.status === 'upcoming' || reg.event?.status === 'approved' || reg.event?.status === 'ongoing');
        }
        if (activeTab === 'completed') {
            return matchesSearch && reg.event?.status === 'completed';
        }
        return matchesSearch;
    });

    const displayedEvents = filteredEvents.slice(0, visibleCount);
    const displayedRegistrations = filteredRegistrations.slice(0, visibleCount);
    const hasMoreEvents = filteredEvents.length > visibleCount;
    const hasMoreRegistrations = filteredRegistrations.length > visibleCount;

    const handleLoadMore = () => {
        setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
    };

    const organizerTabs: { key: OrganizerTab; label: string }[] = [
        { key: 'all', label: 'Tất cả' },
        { key: 'upcoming', label: 'Sắp tới' },
        { key: 'completed', label: 'Đã kết thúc' },
        { key: 'rejected', label: 'Bị từ chối' },
    ];

    const studentTabs: { key: StudentTab; label: string }[] = [
        { key: 'all', label: 'Tất cả' },
        { key: 'upcoming', label: 'Sắp tới' },
        { key: 'completed', label: 'Đã tham gia' },
    ];

    const tabs = isOrganizer ? organizerTabs : studentTabs;
    const totalCount = isOrganizer ? filteredEvents.length : filteredRegistrations.length;

    if (!isHydrated) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-10 h-10 text-[#00358F] animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00358F] to-[#002a6e] p-8 text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F26600]/20 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">
                                {isOrganizer ? 'Sự kiện của tôi' : 'Sự kiện đã đăng ký'}
                            </h2>
                            <p className="text-white/70 font-medium">
                                {isOrganizer
                                    ? 'Quản lý và theo dõi các sự kiện bạn đã tạo'
                                    : 'Theo dõi các sự kiện bạn đã đăng ký tham gia'}
                            </p>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm sự kiện..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setVisibleCount(ITEMS_PER_PAGE);
                                }}
                                className="w-full md:w-72 pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#F26600] focus:border-transparent transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 inline-flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setActiveTab(tab.key);
                                setVisibleCount(ITEMS_PER_PAGE);
                            }}
                            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                activeTab === tab.key
                                    ? 'bg-[#00358F] text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="text-sm text-gray-500 font-medium">
                    Hiển thị {isOrganizer ? displayedEvents.length : displayedRegistrations.length} / {totalCount} sự kiện
                </div>

                {loading ? (
                    <div className="space-y-5">
                        {[...Array(3)].map((_, i) => (
                            <EventSkeleton key={i} />
                        ))}
                    </div>
                ) : isOrganizer ? (
                    displayedEvents.length === 0 ? (
                        <div className="bg-gray-50 rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                            <div className="w-20 h-20 bg-[#00358F]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Calendar className="w-10 h-10 text-[#00358F]" />
                            </div>
                            <h3 className="text-xl font-bold text-[#00358F] mb-2">
                                Chưa có sự kiện nào
                            </h3>
                            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                                {searchQuery
                                    ? 'Không tìm thấy sự kiện phù hợp với từ khóa tìm kiếm'
                                    : activeTab === 'all'
                                        ? 'Bạn chưa tạo sự kiện nào. Hãy tạo sự kiện đầu tiên!'
                                        : activeTab === 'upcoming'
                                            ? 'Không có sự kiện sắp diễn ra'
                                            : activeTab === 'completed'
                                                ? 'Chưa có sự kiện nào đã kết thúc'
                                                : 'Không có sự kiện nào bị từ chối hoặc chờ duyệt'}
                            </p>
                            <button
                                onClick={() => router.push('/dashboard/events/create')}
                                className="px-8 py-3.5 bg-[#00358F] text-white font-semibold flex items-center gap-2 mx-auto rounded-xl shadow-lg shadow-[#00358F]/20 hover:scale-105 transition-all"
                            >
                                Tạo sự kiện mới
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {displayedEvents.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    role="organizer"
                                    onEdit={handleEditEvent}
                                />
                            ))}

                            {hasMoreEvents && (
                                <div className="text-center pt-4">
                                    <button
                                        onClick={handleLoadMore}
                                        className="px-8 py-3 bg-white border-2 border-[#00358F] text-[#00358F] rounded-xl font-semibold hover:bg-[#00358F] hover:text-white transition-all"
                                    >
                                        Xem thêm sự kiện
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                ) : displayedRegistrations.length === 0 ? (
                    <div className="bg-gray-50 rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-[#00358F]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Calendar className="w-10 h-10 text-[#00358F]" />
                        </div>
                        <h3 className="text-xl font-bold text-[#00358F] mb-2">
                            Chưa có sự kiện nào
                        </h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                            {searchQuery
                                ? 'Không tìm thấy sự kiện phù hợp với từ khóa tìm kiếm'
                                : activeTab === 'all'
                                    ? 'Bạn chưa đăng ký sự kiện nào. Hãy khám phá các sự kiện thú vị!'
                                    : activeTab === 'upcoming'
                                        ? 'Không có sự kiện sắp diễn ra'
                                        : 'Chưa có sự kiện nào đã tham gia'}
                        </p>
                        <button
                            onClick={() => router.push('/dashboard/events')}
                            className="px-8 py-3.5 bg-[#00358F] text-white font-semibold flex items-center gap-2 mx-auto rounded-xl shadow-lg shadow-[#00358F]/20 hover:scale-105 transition-all"
                        >
                            Khám phá sự kiện
                        </button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {displayedRegistrations.map((registration) => (
                            <EventCard
                                key={registration.id}
                                event={registration.event!}
                                role="student"
                                registration={registration}
                                onCancelRegistration={handleCancelRegistration}
                                onShowQR={handleOpenQrModal}
                            />
                        ))}

                        {hasMoreRegistrations && (
                            <div className="text-center pt-4">
                                <button
                                    onClick={handleLoadMore}
                                    className="px-8 py-3 bg-white border-2 border-[#00358F] text-[#00358F] rounded-xl font-semibold hover:bg-[#00358F] hover:text-white transition-all"
                                >
                                    Xem thêm sự kiện
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {selectedQR && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-[#00358F]">QR Code Check-in</h3>
                                <button
                                    onClick={() => setSelectedQR(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>

                            <div className="text-center">
                                <p className="text-gray-600 font-medium mb-4">{selectedQR.event?.title}</p>
                                <div className="bg-white p-6 rounded-xl border-2 border-gray-200 inline-block shadow-sm">
                                    {selectedQR.qr_code ? (
                                        <img
                                            src={selectedQR.qr_code}
                                            alt="QR Check-in"
                                            width={256}
                                            height={256}
                                            className="w-[256px] h-[256px]"
                                        />
                                    ) : (
                                        <div className="w-[256px] h-[256px] flex items-center justify-center bg-gray-100">
                                            <Loader2 className="w-8 h-8 text-[#00358F] animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mt-4">
                                    Xuất trình mã QR này khi check-in tại sự kiện
                                </p>
                                <button
                                    onClick={() => downloadQRCode(selectedQR)}
                                    disabled={!selectedQR.qr_code}
                                    className="mt-4 w-full px-4 py-3 bg-[#00358F] text-white rounded-xl hover:bg-[#00358F]/90 transition-colors flex items-center justify-center gap-2 font-semibold disabled:opacity-50"
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
