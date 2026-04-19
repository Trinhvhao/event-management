'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Calendar, MapPin, Users, Award, Search, Filter, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { eventService } from '@/services/eventService';
import { Event, Category, Department } from '@/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

interface EventQueryParams {
    status?: string;
    limit?: number;
    search?: string;
    category_id?: number;
    department_id?: number;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }
    return fallback;
};

export default function EventsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('upcoming');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        fetchData();
    }, [isAuthenticated, router, selectedCategory, selectedDepartment, selectedStatus, searchQuery]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch events with filters
            const params: EventQueryParams = {
                status: selectedStatus,
                limit: 50,
            };

            if (searchQuery) params.search = searchQuery;
            if (selectedCategory) params.category_id = selectedCategory;
            if (selectedDepartment) params.department_id = selectedDepartment;

            const eventsRes = await eventService.getAll(params);
            setEvents(eventsRes.data.items || []);

            // Fetch categories and departments if not loaded
            if (categories.length === 0) {
                const catRes = await eventService.getCategories();
                setCategories(catRes || []);
            }

            if (departments.length === 0) {
                const deptRes = await eventService.getDepartments();
                setDepartments(deptRes || []);
            }
        } catch (error: unknown) {
            console.error('Error fetching events:', error);
            toast.error(getErrorMessage(error, 'Không thể tải danh sách sự kiện'));
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory(null);
        setSelectedDepartment(null);
        setSelectedStatus('upcoming');
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Chờ duyệt' },
            approved: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Đã duyệt' },
            upcoming: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sắp diễn ra' },
            ongoing: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đang diễn ra' },
            completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Đã kết thúc' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Đã hủy' },
        };
        const badge = badges[status] || badges.upcoming;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    if (loading && events.length === 0) {
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Header with Search */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Calendar className="w-32 h-32 transform rotate-12" />
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-primary tracking-tight mb-1">Danh sách sự kiện</h2>
                            <p className="text-gray-500 font-medium">Khám phá và đăng ký các sự kiện thú vị</p>
                        </div>

                        {/* Search bar */}
                        <div className="flex gap-3">
                            <div className="relative flex-1 lg:w-80 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brandBlue transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm sự kiện..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue transition-all text-sm font-medium"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-5 py-3 rounded-xl border font-medium transition-all duration-200 flex items-center gap-2 ${showFilters
                                    ? 'bg-brandBlue text-white border-brandBlue shadow-md shadow-brandBlue/20'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                                    }`}
                            >
                                <Filter className="w-5 h-5" />
                                <span className="hidden sm:inline">Bộ lọc</span>
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Status filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brandBlue focus:border-transparent"
                                    >
                                        <option value="upcoming">Sắp diễn ra</option>
                                        <option value="approved">Đã duyệt</option>
                                        <option value="pending">Chờ duyệt</option>
                                        <option value="ongoing">Đang diễn ra</option>
                                        <option value="completed">Đã kết thúc</option>
                                        <option value="">Tất cả</option>
                                    </select>
                                </div>

                                {/* Category filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Danh mục
                                    </label>
                                    <select
                                        value={selectedCategory || ''}
                                        onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brandBlue focus:border-transparent"
                                    >
                                        <option value="">Tất cả danh mục</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Department filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Khoa
                                    </label>
                                    <select
                                        value={selectedDepartment || ''}
                                        onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brandBlue focus:border-transparent"
                                    >
                                        <option value="">Tất cả khoa</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Clear filters */}
                            {(searchQuery || selectedCategory || selectedDepartment || selectedStatus !== 'upcoming') && (
                                <button
                                    onClick={clearFilters}
                                    className="mt-4 text-sm text-brandBlue hover:text-secondary flex items-center gap-1"
                                >
                                    <X className="w-4 h-4" />
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Events Grid */}
                {events.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
                        <div className="w-20 h-20 bg-offWhite rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Calendar className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-primary mb-2">
                            Không tìm thấy sự kiện nào
                        </h3>
                        <p className="text-gray-500">
                            Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                onClick={() => router.push(`/dashboard/events/${event.id}`)}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 hover:border-brandBlue/30 transition-all duration-300 cursor-pointer group flex flex-col"
                            >
                                {/* Event image */}
                                <div className="relative h-56 bg-brandBlue overflow-hidden">
                                    {event.image_url ? (
                                        <>
                                            <img
                                                src={event.image_url}
                                                alt={event.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100"
                                            />
                                            <div className="absolute inset-0 bg-linear-to-t from-slate-900/80 via-transparent to-transparent opacity-80"></div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Calendar className="w-20 h-20 text-white/20 group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 z-10">
                                        {getStatusBadge(event.status)}
                                    </div>
                                    {event.is_featured && (
                                        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-orange-500/90 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm">
                                            Nổi bật
                                        </div>
                                    )}
                                    <div className="absolute bottom-4 left-4 right-4 z-10">
                                        <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur-md text-white border border-white/20 rounded-md font-medium">
                                            {event.category?.name}
                                        </span>
                                    </div>
                                </div>

                                {/* Event info */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold text-primary mb-3 line-clamp-2 leading-tight group-hover:text-brandBlue transition-colors">
                                        {event.title}
                                    </h3>

                                    <div className="space-y-2.5 text-sm text-gray-600 mb-6 flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-brandBlue">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium">{format(new Date(event.start_time), 'dd/MM/yyyy • HH:mm', { locale: vi })}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-orange-500">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <span className="line-clamp-1 font-medium">{event.location}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-5 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                <Award className="w-4 h-4" />
                                            </div>
                                            <span className="font-bold text-emerald-600">+{event.training_points} ĐRL</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
                                            <Users className="w-4 h-4" />
                                            <span>{event.current_registrations || 0}/{event.capacity}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Load more */}
                {events.length > 0 && events.length % 50 === 0 && (
                    <div className="text-center">
                        <button
                            onClick={fetchData}
                            className="px-6 py-3 bg-white text-brandBlue border border-brandBlue rounded-lg hover:bg-brandBlue hover:text-white transition-colors"
                        >
                            Xem thêm sự kiện
                        </button>
                    </div>
                )}
            </motion.div>
        </DashboardLayout>
    );
}
