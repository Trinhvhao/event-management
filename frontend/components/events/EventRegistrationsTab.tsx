'use client';

import React, { useEffect, useState } from 'react';
import { Users, Download, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { registrationService } from '@/services/registrationService';
import { Registration } from '@/types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface RegistrationUser {
    full_name?: string;
    student_id?: string;
    email?: string;
}

interface RegistrationWithUser extends Registration {
    user?: RegistrationUser;
}

interface EventRegistrationsTabProps {
    eventId: number;
}

export default function EventRegistrationsTab({ eventId }: EventRegistrationsTabProps) {
    const [registrations, setRegistrations] = useState<RegistrationWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadRegistrations();
    }, [eventId]);

    const loadRegistrations = async () => {
        try {
            setLoading(true);
            const data = await registrationService.getEventRegistrations(eventId);
            setRegistrations(data as RegistrationWithUser[]);
        } catch (error) {
            console.error('Error loading registrations:', error);
        } finally {
            setLoading(false);
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
            r.status === 'registered' ? 'Đã đăng ký' : 'Đã hủy',
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

    const registeredCount = registrations.filter(r => r.status === 'registered').length;
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
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                    <Users className="w-5 h-5 text-brandBlue" />
                    Danh sách đăng ký
                    <span className="text-sm font-normal text-gray-500 ml-1">
                        ({registeredCount} đăng ký{cancelledCount > 0 ? `, ${cancelledCount} đã hủy` : ''})
                    </span>
                </h3>
                <button
                    onClick={exportCsv}
                    disabled={registrations.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brandBlue border border-brandBlue/30 hover:bg-brandBlue/5 transition-colors disabled:opacity-50"
                >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                </button>
            </div>

            {/* Search */}
            {registrations.length > 5 && (
                <div className="relative mb-4">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm sinh viên..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-sm pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-brandBlue focus:outline-none"
                    />
                </div>
            )}

            {registrations.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Chưa có người đăng ký</p>
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
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                                                    <XCircle className="w-3 h-3" /> Đã hủy
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {format(new Date(reg.registered_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
