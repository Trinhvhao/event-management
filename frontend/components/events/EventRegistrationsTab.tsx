'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Users, Download, Search, CheckCircle, XCircle, Hourglass, Clock3, Eye } from 'lucide-react';
import { registrationService, RegistrationWithRelations, WaitlistEntry } from '@/services/registrationService';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface EventRegistrationsTabProps {
    eventId: number;
}

export default function EventRegistrationsTab({ eventId }: EventRegistrationsTabProps) {
    const [registrations, setRegistrations] = useState<RegistrationWithRelations[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegistration, setSelectedRegistration] = useState<RegistrationWithRelations | null>(null);
    const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);

    const loadRegistrations = useCallback(async () => {
        try {
            setLoading(true);
            const [registrationData, waitlistData] = await Promise.all([
                registrationService.getEventRegistrations(eventId),
                registrationService.getEventWaitlist(eventId),
            ]);
            setRegistrations(registrationData as RegistrationWithRelations[]);
            setWaitlist(waitlistData);
        } catch (error) {
            console.error('Error loading registrations:', error);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        loadRegistrations();
    }, [loadRegistrations]);

    const openRegistrationDetail = async (registrationId: number) => {
        try {
            setDetailLoadingId(registrationId);
            const detail = await registrationService.getRegistrationById(registrationId);
            setSelectedRegistration(detail);
        } catch (error) {
            console.error('Error loading registration detail:', error);
        } finally {
            setDetailLoadingId(null);
        }
    };

    const exportCsv = () => {
        if (registrations.length === 0) return;
        const headers = ['STT', 'Họ tên', 'MSSV', 'Email', 'Trạng thái', 'Thời gian đăng ký'];
        const rows = registrations.map((r, i) => [
            i + 1,
            r.user?.full_name || '',
            r.user?.student_id || '',
            r.user?.email || '',
            r.status === 'registered' ? 'Đã đăng ký' : r.status === 'attended' ? 'Đã tham dự' : 'Đã hủy',
            format(new Date(r.registered_at), 'dd/MM/yyyy HH:mm'),
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `registrations_event_${eventId}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const filtered = registrations.filter(r => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const user = r.user;
        return (
            user?.full_name?.toLowerCase().includes(term) ||
            user?.email?.toLowerCase().includes(term) ||
            user?.student_id?.toLowerCase().includes(term)
        );
    });

    const filteredWaitlist = waitlist.filter((entry) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            entry.user?.full_name?.toLowerCase().includes(term) ||
            entry.user?.email?.toLowerCase().includes(term)
        );
    });

    const registeredCount = registrations.filter(r => r.status === 'registered').length;
    const attendedCount = registrations.filter(r => r.status === 'attended').length;
    const cancelledCount = registrations.filter(r => r.status === 'cancelled').length;

    if (loading) {
        return (
            <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-48" />
                    <div className="h-40 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                        <Users className="w-5 h-5 text-brandBlue" />
                        Quản lý đăng ký
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Theo dõi đăng ký, tham dự và danh sách chờ của sự kiện.
                    </p>
                </div>
                <button
                    onClick={exportCsv}
                    disabled={registrations.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brandBlue border border-brandBlue/30 hover:bg-brandBlue/5 transition-colors disabled:opacity-50"
                >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                </button>
            </div>

            <div className="grid gap-3 md:grid-cols-4 mb-5">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Đăng ký hợp lệ</p>
                    <p className="mt-1 text-2xl font-extrabold text-emerald-800">{registeredCount}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Đã tham dự</p>
                    <p className="mt-1 text-2xl font-extrabold text-blue-800">{attendedCount}</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Đã hủy</p>
                    <p className="mt-1 text-2xl font-extrabold text-rose-800">{cancelledCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Danh sách chờ</p>
                    <p className="mt-1 text-2xl font-extrabold text-amber-800">{waitlist.length}</p>
                </div>
            </div>

            {/* Search */}
            {(registrations.length > 5 || waitlist.length > 0) && (
                <div className="relative mb-4">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo họ tên, MSSV, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-sm pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-brandBlue focus:outline-none"
                    />
                </div>
            )}

            {registrations.length === 0 && waitlist.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Chưa có dữ liệu đăng ký hoặc danh sách chờ</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <h4 className="text-sm font-bold text-primary">
                                Danh sách đăng ký
                                <span className="ml-2 text-xs font-medium text-gray-500">
                                    ({filtered.length} mục hiển thị)
                                </span>
                            </h4>
                        </div>
                        {registrations.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                                Chưa có người đăng ký.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">STT</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">MSSV</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Chi tiết</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filtered.map((reg, i) => {
                                            const user = reg.user;
                                            return (
                                                <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                                                    <td className="px-4 py-3 font-medium text-primary">{user?.full_name || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-600">{user?.student_id || '—'}</td>
                                                    <td className="px-4 py-3 text-gray-600">{user?.email || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        {reg.status === 'registered' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                                                <CheckCircle className="w-3 h-3" /> Đã đăng ký
                                                            </span>
                                                        ) : reg.status === 'attended' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                                <Clock3 className="w-3 h-3" /> Đã tham dự
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                                                                <XCircle className="w-3 h-3" /> Đã hủy
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                                        {format(new Date(reg.registered_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => void openRegistrationDetail(reg.id)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-brandBlue hover:text-brandBlue"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            {detailLoadingId === reg.id ? 'Đang tải...' : 'Xem'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <Hourglass className="h-4 w-4 text-amber-600" />
                            <h4 className="text-sm font-bold text-primary">
                                Danh sách chờ
                                <span className="ml-2 text-xs font-medium text-gray-500">
                                    ({filteredWaitlist.length} mục hiển thị)
                                </span>
                            </h4>
                        </div>
                        {waitlist.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                                Chưa có ai trong danh sách chờ.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vị trí</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Thời gian vào chờ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredWaitlist.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-amber-700">#{entry.position}</td>
                                                <td className="px-4 py-3 font-medium text-primary">{entry.user?.full_name || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600">{entry.user?.email || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                                        <Hourglass className="w-3 h-3" /> Chờ suất trống
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedRegistration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <div>
                                <h4 className="text-lg font-bold text-primary">Chi tiết đăng ký</h4>
                                <p className="text-sm text-gray-500">Mã đăng ký #{selectedRegistration.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRegistration(null)}
                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4 px-6 py-5 text-sm">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Sinh viên</p>
                                    <p className="mt-1 font-semibold text-primary">{selectedRegistration.user?.full_name || '—'}</p>
                                    <p className="text-gray-500">{selectedRegistration.user?.student_id || 'Chưa có MSSV'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Liên hệ</p>
                                    <p className="mt-1 font-semibold text-primary">{selectedRegistration.user?.email || '—'}</p>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Sự kiện</p>
                                    <p className="mt-1 font-semibold text-primary">{selectedRegistration.event?.title || `#${selectedRegistration.event_id}`}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Trạng thái</p>
                                    <p className="mt-1 font-semibold text-primary">
                                        {selectedRegistration.status === 'registered'
                                            ? 'Đã đăng ký'
                                            : selectedRegistration.status === 'attended'
                                                ? 'Đã tham dự'
                                                : 'Đã hủy'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Thời gian đăng ký</p>
                                <p className="mt-1 font-semibold text-primary">
                                    {format(new Date(selectedRegistration.registered_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                                </p>
                            </div>
                            {selectedRegistration.cancelled_at && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Thời gian hủy</p>
                                    <p className="mt-1 font-semibold text-primary">
                                        {format(new Date(selectedRegistration.cancelled_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
