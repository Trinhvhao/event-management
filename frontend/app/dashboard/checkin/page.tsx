'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Camera, CheckCircle, Award, Users, AlertCircle, BarChart3, Download, Search } from 'lucide-react';
import { checkinService, CheckinResult, AttendanceRecord, AttendanceStats } from '@/services/checkinService';
import { eventService } from '@/services/eventService';
import { Event } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }
    return fallback;
};

export default function CheckinPage() {
    const { user } = useAuthStore();
    const [mode, setMode] = useState<'manual' | 'camera'>('manual');
    const [qrInput, setQrInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<CheckinResult[]>([]);

    // Event selection & attendance tracking
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [stats, setStats] = useState<AttendanceStats | null>(null);
    const [loadingAttendances, setLoadingAttendances] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Load events for organizer
    useEffect(() => {
        const loadEvents = async () => {
            try {
                const response = await eventService.getAll({ limit: 100 });
                // Filter to ongoing/upcoming events for check-in
                const relevantEvents = (response.data.items || []).filter(
                    (e: Event) => e.status === 'ongoing' || e.status === 'upcoming' || e.status === 'approved'
                );
                setEvents(relevantEvents);
                if (relevantEvents.length > 0 && !selectedEventId) {
                    // Auto-select first ongoing event
                    const ongoing = relevantEvents.find((e: Event) => e.status === 'ongoing');
                    if (ongoing) setSelectedEventId(ongoing.id);
                }
            } catch (err) {
                console.error('Failed to load events:', err);
            }
        };
        loadEvents();
    }, []);

    // Load attendances when event selected
    useEffect(() => {
        if (selectedEventId) {
            loadAttendanceData();
        }
    }, [selectedEventId]);

    const loadAttendanceData = async () => {
        if (!selectedEventId) return;
        try {
            setLoadingAttendances(true);
            const [attendanceData, statsData] = await Promise.all([
                checkinService.getEventAttendances(selectedEventId),
                checkinService.getAttendanceStats(selectedEventId),
            ]);
            setAttendances(attendanceData);
            setStats(statsData);
        } catch (err) {
            console.error('Failed to load attendance data:', err);
        } finally {
            setLoadingAttendances(false);
        }
    };

    const handleCheckin = async (qrData: string) => {
        if (!qrData.trim()) {
            toast.error('Vui lòng nhập mã QR');
            return;
        }

        setProcessing(true);
        setError(null);
        setLastResult(null);

        try {
            const result = await checkinService.processCheckin(qrData.trim());
            setLastResult(result);
            setHistory(prev => [result, ...prev]);
            setQrInput('');
            toast.success(`Check-in thành công: ${result.student.full_name}`);
            // Refresh attendance data
            if (selectedEventId) loadAttendanceData();
        } catch (err: unknown) {
            const msg = getErrorMessage(err, 'Check-in thất bại');
            setError(msg);
            toast.error(msg);
        } finally {
            setProcessing(false);
        }
    };

    const exportAttendanceCsv = () => {
        if (attendances.length === 0) return;
        const headers = ['STT', 'Họ tên', 'MSSV', 'Email', 'Giờ check-in'];
        const rows = attendances.map((a, i) => [
            i + 1,
            a.registration.user.full_name,
            a.registration.user.student_id || '',
            a.registration.user.email,
            format(new Date(a.checked_in_at), 'dd/MM/yyyy HH:mm:ss'),
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance_${selectedEventId}_${format(new Date(), 'yyyyMMdd')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const filteredAttendances = attendances.filter(a => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            a.registration.user.full_name.toLowerCase().includes(term) ||
            a.registration.user.email.toLowerCase().includes(term) ||
            (a.registration.user.student_id || '').toLowerCase().includes(term)
        );
    });

    const selectedEvent = events.find(e => e.id === selectedEventId);

    return (
        <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Check-in QR Code</h1>
                    <p className="page-subtitle">Quét mã QR hoặc nhập mã để check-in sinh viên</p>
                </div>
            </div>

            {/* Event selector */}
            {events.length > 0 && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chọn sự kiện</label>
                    <select
                        value={selectedEventId || ''}
                        onChange={(e) => setSelectedEventId(Number(e.target.value) || null)}
                        className="w-full max-w-md px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-brandBlue focus:ring-1 focus:ring-brandBlue/20 outline-none"
                    >
                        <option value="">-- Chọn sự kiện --</option>
                        {events.map(ev => (
                            <option key={ev.id} value={ev.id}>
                                {ev.title} ({ev.status === 'ongoing' ? '🟢 Đang diễn ra' : ev.status === 'upcoming' ? '🔵 Sắp tới' : '🟡 Đã duyệt'})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Stats cards */}
            {stats && selectedEventId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Đã đăng ký</p>
                            <p className="text-xl font-bold text-primary">{stats.total_registrations}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Đã check-in</p>
                            <p className="text-xl font-bold text-green-600">{stats.total_attendances}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Tỷ lệ</p>
                            <p className="text-xl font-bold text-amber-600">{stats.attendance_rate}%</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scanner area */}
                <div className="space-y-4">
                    <Card variant="glass" padding="lg">
                        <div className="flex gap-2 mb-5">
                            <Button
                                variant={mode === 'manual' ? 'primary' : 'outline'}
                                size="sm"
                                icon={<QrCode size={14} />}
                                onClick={() => setMode('manual')}
                            >
                                Nhập mã
                            </Button>
                            <Button
                                variant={mode === 'camera' ? 'primary' : 'outline'}
                                size="sm"
                                icon={<Camera size={14} />}
                                onClick={() => setMode('camera')}
                            >
                                Quét camera
                            </Button>
                        </div>

                        {/* Nhập mã thủ công */}
                        {mode === 'manual' && (
                            <div>
                                <label className="block text-sm font-medium text-[var(--dash-text-primary)] mb-2">
                                    Dán mã QR (JWT token)
                                </label>
                                <textarea
                                    className="w-full p-3 rounded-xl bg-[var(--dash-bg)] border border-[var(--dash-border)] text-sm text-[var(--dash-text-primary)] resize-none focus:border-[var(--dash-accent)] focus:outline-none transition-colors"
                                    rows={4}
                                    placeholder="Paste nội dung mã QR vào đây..."
                                    value={qrInput}
                                    onChange={e => setQrInput(e.target.value)}
                                />
                                <Button
                                    variant="primary"
                                    className="w-full mt-3"
                                    isLoading={processing}
                                    onClick={() => handleCheckin(qrInput)}
                                    icon={<CheckCircle size={16} />}
                                >
                                    Check-in
                                </Button>
                            </div>
                        )}

                        {/* Camera mode - placeholder */}
                        {mode === 'camera' && (
                            <div className="aspect-square rounded-xl bg-[var(--dash-bg)] border-2 border-dashed border-[var(--dash-border)] flex flex-col items-center justify-center text-[var(--dash-text-muted)]">
                                <Camera size={48} className="mb-3 opacity-40" />
                                <p className="text-sm font-medium">Camera QR Scanner</p>
                                <p className="text-xs mt-1">Tính năng quét camera sẽ được tích hợp</p>
                                <p className="text-xs mt-1">Hiện tại hãy sử dụng chế độ &quot;Nhập mã&quot;</p>
                            </div>
                        )}
                    </Card>

                    {/* Kết quả check-in */}
                    {error && (
                        <Card variant="glass" padding="md">
                            <div className="flex items-center gap-3 text-red-500">
                                <AlertCircle size={22} />
                                <div>
                                    <p className="text-sm font-semibold">Check-in thất bại</p>
                                    <p className="text-xs mt-0.5">{error}</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {lastResult && (
                        <Card variant="glass" padding="lg">
                            <div className="text-center">
                                <div className="w-14 h-14 rounded-full bg-green-100 text-green-500 flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle size={28} />
                                </div>
                                <h3 className="text-lg font-bold text-[var(--dash-text-primary)]">{lastResult.student.full_name}</h3>
                                <p className="text-sm text-[var(--dash-text-muted)]">
                                    {lastResult.student.student_id || lastResult.student.email}
                                </p>
                                <p className="text-sm text-[var(--dash-text-muted)] mt-1">
                                    {lastResult.event.title}
                                </p>
                                {lastResult.event.training_points > 0 && (
                                    <Badge variant="warning" className="mt-2">
                                        <Award size={12} /> +{lastResult.event.training_points} điểm rèn luyện
                                    </Badge>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Attendance list for selected event / session history */}
                <Card variant="glass" padding="lg">
                    {selectedEventId && attendances.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-[var(--dash-text-primary)]">
                                        Danh sách điểm danh
                                    </h3>
                                    <p className="text-xs text-[var(--dash-text-muted)]">
                                        {attendances.length} sinh viên đã check-in
                                    </p>
                                </div>
                                <button
                                    onClick={exportAttendanceCsv}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brandBlue border border-brandBlue/30 hover:bg-brandBlue/5 transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Export CSV
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative mb-3">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm sinh viên..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-brandBlue focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {filteredAttendances.map((att, i) => (
                                    <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--dash-bg)]">
                                        <span className="text-xs text-gray-400 w-6 text-right">{i + 1}</span>
                                        <Avatar name={att.registration.user.full_name} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--dash-text-primary)] truncate">
                                                {att.registration.user.full_name}
                                            </p>
                                            <p className="text-xs text-[var(--dash-text-muted)]">
                                                {att.registration.user.student_id || att.registration.user.email}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {format(new Date(att.checked_in_at), 'HH:mm', { locale: vi })}
                                        </span>
                                        <Badge variant="success" dot>OK</Badge>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <CardHeader
                                title="Check-in gần đây"
                                subtitle={`${history.length} sinh viên đã check-in`}
                            />
                            {history.length === 0 ? (
                                <div className="text-center py-10 text-[var(--dash-text-muted)]">
                                    <Users size={32} className="mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">Chưa có check-in nào</p>
                                    <p className="text-xs mt-1">Quét mã QR để bắt đầu</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {history.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--dash-bg)]">
                                            <Avatar name={item.student.full_name} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[var(--dash-text-primary)] truncate">{item.student.full_name}</p>
                                                <p className="text-xs text-[var(--dash-text-muted)]">{item.student.student_id || item.student.email}</p>
                                            </div>
                                            <Badge variant="success" dot>OK</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>
        </motion.div>
        </DashboardLayout>
    );
}
