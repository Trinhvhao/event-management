'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
    QrCode, Camera, CheckCircle, Award, Users, AlertCircle,
    BarChart3, Download, Search, X, RotateCcw, LogOut, ScanLine, RefreshCw
} from 'lucide-react';
import { checkinService, CheckinResult, AttendanceRecord, AttendanceStats } from '@/services/checkinService';
import { eventService } from '@/services/eventService';
import { Event } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const ACCENT = {
    gold:   { hex: '#F26600', tint: 'rgba(242,102,0,0.08)',  text: '#c45500' },
    navy:   { hex: '#00358F', tint: 'rgba(0,53,143,0.08)',   text: '#00358F' },
    green:  { hex: '#00A651', tint: 'rgba(0,166,81,0.08)',   text: '#007a3d' },
    red:    { hex: '#FF4000', tint: 'rgba(255,64,0,0.08)',   text: '#cc3300' },
    grey:   { hex: '#94a3b8', tint: 'rgba(148,163,184,0.08)', text: '#64748b' },
};

type ScanMode = 'manual' | 'camera';
type BarcodeDetectorLike = { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> };
type BarcodeDetectorConstructorLike = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const data = (error as { response?: { data?: { error?: { message?: string }; message?: string } } }).response?.data;
        return data?.error?.message || data?.message || fallback;
    }
    return fallback;
};

const normalizeQrError = (msg: string, fallback: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('đã check-in')) return 'Mã QR đã được sử dụng. Sinh viên đã check-in rồi.';
    if (lower.includes('đã quá giờ')) return 'Đã hết giờ check-in. Sự kiện đã kết thúc.';
    if (lower.includes('chưa đến giờ') || lower.includes('còn')) return 'Chưa đến giờ check-in. Vui lòng đợi.';
    if (lower.includes('chưa bắt đầu') || lower.includes('kết thúc')) return 'Sự kiện chưa bắt đầu hoặc đã kết thúc.';
    if (lower.includes('đăng ký đã bị hủy')) return 'Sinh viên đã hủy đăng ký. Không thể check-in.';
    if (lower.includes('chưa đăng ký')) return 'Sinh viên chưa đăng ký sự kiện này.';
    if (lower.includes('mã qr không hợp lệ')) return 'Mã QR không hợp lệ hoặc không tồn tại.';
    if (lower.includes('không tìm thấy')) return 'Không tìm thấy thông tin đăng ký.';
    if (lower.includes('check-out')) return msg;
    return fallback;
};

function SectionHeader({ label, title, subtitle, action }: {
    label?: string; title: string; subtitle?: string; action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                {label && <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-orange)] mb-0.5">{label}</p>}
                <h2 className="text-base font-extrabold text-[var(--text-primary)]">{title}</h2>
                {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

export default function CheckinPage() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [mode, setMode] = useState<ScanMode>('manual');
    const [qrInput, setQrInput] = useState('');
    const [manualStudentId, setManualStudentId] = useState('');
    const [manualRegistrationId, setManualRegistrationId] = useState('');
    const [processing, setProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastScan, setLastScan] = useState<{ value: string; ts: number } | null>(null);
    const [scanSuccess, setScanSuccess] = useState(false);

    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [stats, setStats] = useState<AttendanceStats | null>(null);
    const [loadingAttendances, setLoadingAttendances] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraReady, setCameraReady] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<BarcodeDetectorLike | null>(null);
    const scanFrameRef = useRef<number | null>(null);
    const scanLockRef = useRef(false);
    const lastProcessedRef = useRef<string | null>(null);

    // ── Sound feedback ──────────────────────────────────────────────
    const playSound = useCallback((type: 'success' | 'error') => {
        if (typeof window === 'undefined') return;
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type === 'success' ? 'sine' : 'sawtooth';
        osc.frequency.value = type === 'success' ? 880 : 220;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (type === 'success' ? 0.2 : 0.3));
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + (type === 'success' ? 0.2 : 0.3));
    }, []);

    // ── Load events ────────────────────────────────────────────────────
    const loadEvents = useCallback(async () => {
        try {
            const rawEvents =
                user?.role === 'organizer'
                    ? await eventService.getMyEvents()
                    : (await eventService.getAll({ limit: 100 })).data.items || [];
            const relevant = (rawEvents as Event[]).filter(
                (e: Event) => e.status === 'ongoing' || e.status === 'upcoming' || e.status === 'approved'
            );
            setEvents(relevant);
        } catch {
            toast.error('Không thể tải danh sách sự kiện');
        }
    }, [user?.role]);

    // ── Load attendance data ──────────────────────────────────────────
    const loadAttendanceData = useCallback(async () => {
        if (!selectedEventId) return;
        try {
            setLoadingAttendances(true);
            const [attData, statsData] = await Promise.all([
                checkinService.getEventAttendances(selectedEventId),
                checkinService.getAttendanceStats(selectedEventId),
            ]);
            setAttendances(attData);
            setStats(statsData);
        } catch {
            toast.error('Không thể tải dữ liệu điểm danh');
        } finally {
            setLoadingAttendances(false);
        }
    }, [selectedEventId]);

    useEffect(() => { void loadEvents(); }, [loadEvents]);

    useEffect(() => {
        if (!selectedEventId && events.length > 0) {
            const ongoing = events.find(e => e.status === 'ongoing');
            setSelectedEventId(ongoing?.id ?? events[0].id);
        }
    }, [events, selectedEventId]);

    useEffect(() => {
        if (selectedEventId) void loadAttendanceData();
    }, [selectedEventId, loadAttendanceData]);

    // ── Core check-in handler ─────────────────────────────────────────
    const doCheckin = useCallback(async (qrData: string) => {
        if (!qrData.trim()) return;

        setProcessing(true);
        setError(null);
        setLastResult(null);
        setScanSuccess(false);

        try {
            const result = await checkinService.processCheckin(qrData.trim());
            setLastResult(result);
            setLastScan({ value: qrData.trim(), ts: Date.now() });
            setScanSuccess(true);
            setQrInput('');
            playSound('success');
            toast.success(`Check-in thành công: ${result.student.full_name}`);
            void loadAttendanceData();
        } catch (err: unknown) {
            const msg = normalizeQrError(getErrorMessage(err, 'Check-in thất bại'), 'Check-in thất bại');
            setError(msg);
            playSound('error');
            toast.error(msg);
        } finally {
            setProcessing(false);
        }
    }, [loadAttendanceData, playSound]);

    // ── Camera logic ──────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        if (scanFrameRef.current !== null) { cancelAnimationFrame(scanFrameRef.current); scanFrameRef.current = null; }
        if (cameraStreamRef.current) { cameraStreamRef.current.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null; }
        if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; }
        setCameraReady(false);
    }, []);

    const startCamera = useCallback(async () => {
        if (typeof window === 'undefined') return;
        stopCamera();
        setCameraError(null);

        const barcodeCtor = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructorLike }).BarcodeDetector;

        if (!barcodeCtor) {
            setCameraError('Trình duyệt không hỗ trợ quét camera. Vui lòng dùng Chrome/Edge hoặc chế độ Nhập mã.');
            return;
        }

        try {
            detectorRef.current = new barcodeCtor({ formats: ['qr_code'] });
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            cameraStreamRef.current = stream;
            if (!videoRef.current) return;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setCameraReady(true);

            const scanLoop = async () => {
                if (!videoRef.current || !detectorRef.current || mode !== 'camera') return;
                if (videoRef.current.readyState >= 2) {
                    try {
                        const results = await detectorRef.current.detect(videoRef.current);
                        const raw = results[0]?.rawValue?.trim();
                        if (raw && raw !== lastProcessedRef.current) {
                            const now = Date.now();
                            if (!lastScan || now - lastScan.ts > 3000) {
                                lastProcessedRef.current = raw;
                                scanLockRef.current = true;
                                try { await doCheckin(raw); }
                                finally { scanLockRef.current = false; }
                                setTimeout(() => { lastProcessedRef.current = null; }, 3000);
                            }
                        }
                    } catch { /* transient decode errors */ }
                }
                scanFrameRef.current = requestAnimationFrame(() => { void scanLoop(); });
            };
            scanFrameRef.current = requestAnimationFrame(() => { void scanLoop(); });
        } catch {
            setCameraError('Không thể mở camera. Kiểm tra quyền truy cập camera.');
            stopCamera();
        }
    }, [doCheckin, lastScan, mode, stopCamera]);

    useEffect(() => {
        if (mode !== 'camera') { stopCamera(); setCameraError(null); return; }
        void startCamera();
        return () => stopCamera();
    }, [mode, startCamera, stopCamera]);

    // ── Manual check-in ───────────────────────────────────────────────
    const handleManualCheckin = async () => {
        if (!selectedEventId) { toast.error('Vui lòng chọn sự kiện'); return; }
        const sid = manualStudentId.trim();
        const rid = manualRegistrationId.trim();
        if (!sid && !rid) { toast.error('Nhập MSSV hoặc Registration ID'); return; }

        let regId: number | undefined;
        if (rid) { regId = parseInt(rid, 10); if (!Number.isInteger(regId) || regId <= 0) { toast.error('Registration ID không hợp lệ'); return; } }

        setProcessing(true); setError(null); setLastResult(null); setScanSuccess(false);
        try {
            const result = await checkinService.processManualCheckin({ event_id: selectedEventId, registration_id: regId, student_id: sid || undefined });
            setLastResult(result); setLastScan({ value: 'manual', ts: Date.now() }); setScanSuccess(true);
            setManualStudentId(''); setManualRegistrationId('');
            playSound('success');
            toast.success(`Check-in thành công: ${result.student.full_name}`);
            await loadAttendanceData();
        } catch (err: unknown) {
            const msg = normalizeQrError(getErrorMessage(err, 'Check-in thất bại'), 'Check-in thất bại');
            setError(msg); playSound('error'); toast.error(msg);
        } finally { setProcessing(false); }
    };

    // ── Checkout ──────────────────────────────────────────────────────
    const handleCheckout = async (attendanceId: number, studentName: string) => {
        try {
            await checkinService.checkoutAttendance(attendanceId);
            toast.success(`Check-out thành công: ${studentName}`);
            await loadAttendanceData();
        } catch (err: unknown) {
            toast.error(normalizeQrError(getErrorMessage(err, 'Check-out thất bại'), 'Check-out thất bại'));
        }
    };

    // ── Undo ──────────────────────────────────────────────────────────
    const handleUndo = async (attendanceId: number, studentName: string) => {
        if (!confirm(`Hủy bản ghi điểm danh của "${studentName}"? Điểm rèn luyện sẽ bị thu hồi.`)) return;
        try {
            await checkinService.undoAttendance(attendanceId);
            toast.success(`Đã hủy bản ghi của ${studentName}`);
            await loadAttendanceData();
        } catch (err: unknown) {
            toast.error(normalizeQrError(getErrorMessage(err, 'Hủy bản ghi thất bại'), 'Hủy bản ghi thất bại'));
        }
    };

    // ── CSV Export ────────────────────────────────────────────────────
    const exportCsv = () => {
        if (!attendances.length) return;
        const headers = ['STT', 'Họ tên', 'MSSV', 'Email', 'Giờ check-in', 'Giờ check-out', 'Trạng thái'];
        const rows = attendances.map((a, i) => [
            i + 1, a.registration.user.full_name,
            a.registration.user.student_id || '',
            a.registration.user.email,
            format(new Date(a.checked_in_at), 'dd/MM/yyyy HH:mm:ss'),
            a.checked_out_at ? format(new Date(a.checked_out_at), 'dd/MM/yyyy HH:mm:ss') : '',
            a.status === 'checked_in' ? 'Đang check-in' : 'Đã check-out',
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `diem-danh-${selectedEventId}-${format(new Date(), 'yyyyMMdd')}.csv`; a.click();
        URL.revokeObjectURL(a.href);
    };

    const filtered = attendances.filter(a => {
        if (!searchTerm) return true;
        const t = searchTerm.toLowerCase();
        return (
            a.registration.user.full_name.toLowerCase().includes(t) ||
            (a.registration.user.student_id || '').toLowerCase().includes(t) ||
            a.registration.user.email.toLowerCase().includes(t)
        );
    });

    const selectedEvent = events.find(e => e.id === selectedEventId);

    return (
        <DashboardLayout>
            <div className="space-y-5 p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto">

                {/* ─── PAGE HEADER ─── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[var(--color-brand-navy)] opacity-[0.03] pointer-events-none" />
                    <div className="px-6 pt-6 pb-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                                    <QrCode className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Check-in</p>
                                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">Điểm danh sự kiện</h1>
                                    <p className="text-sm text-[var(--text-muted)]">Quét QR hoặc nhập MSSV để check-in / check-out sinh viên</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => void loadAttendanceData()} disabled={!selectedEventId || loadingAttendances}
                                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all disabled:opacity-50 active:scale-95">
                                    <RefreshCw className={`w-4 h-4 ${loadingAttendances ? 'animate-spin' : ''}`} />
                                    Làm mới
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── EVENT SELECTOR ─── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="px-5 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1 min-w-0">
                                <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] block mb-1.5">Sự kiện đang điểm danh</label>
                                <select
                                    value={selectedEventId || ''}
                                    onChange={e => setSelectedEventId(Number(e.target.value) || null)}
                                    className="w-full sm:max-w-md h-11 rounded-xl border-2 border-[var(--border-default)] bg-white px-4 text-sm font-semibold text-[var(--text-primary)] focus:border-[var(--color-brand-navy)] focus:outline-none transition-colors cursor-pointer shadow-[var(--shadow-xs)]"
                                >
                                    <option value="">-- Chọn sự kiện --</option>
                                    {events.map(ev => (
                                        <option key={ev.id} value={ev.id}>
                                            {ev.title}{' '}
                                            {ev.status === 'ongoing' ? '(Đang diễn ra)' : ev.status === 'upcoming' ? '(Sắp tới)' : '(Đã duyệt)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {selectedEvent && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                                        selectedEvent.status === 'ongoing' ? 'bg-[rgba(0,166,81,0.08)] text-[#007a3d]' :
                                        selectedEvent.status === 'upcoming' ? 'bg-[rgba(0,53,143,0.08)] text-[#00358F]' :
                                        'bg-[var(--bg-muted)] text-[var(--text-muted)]'
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${
                                            selectedEvent.status === 'ongoing' ? 'bg-[#00A651] animate-pulse' :
                                            selectedEvent.status === 'upcoming' ? 'bg-[#00358F]' : 'bg-[var(--text-muted)]'
                                        }`} />
                                        {selectedEvent.status === 'ongoing' ? 'Đang diễn ra' : selectedEvent.status === 'upcoming' ? 'Sắp tới' : selectedEvent.status}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── KPI STRIP ─── */}
                {stats && selectedEventId && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Đã đăng ký', value: stats.total_registrations, icon: <Users className="w-5 h-5" />, accent: ACCENT.navy },
                            { label: 'Đã check-in', value: stats.total_attendances, icon: <CheckCircle className="w-5 h-5" />, accent: ACCENT.green },
                            { label: 'Đang check-in', value: stats.active_checkins, icon: <ScanLine className="w-5 h-5" />, accent: ACCENT.gold },
                            { label: 'Đã check-out', value: stats.total_checkouts, icon: <LogOut className="w-5 h-5" />, accent: ACCENT.grey },
                        ].map(({ label, value, icon, accent }) => (
                            <div key={label} className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
                                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `linear-gradient(135deg, ${accent.tint} 0%, transparent 60%)` }} />
                                <div className="relative flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1.5">{label}</p>
                                        <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{value}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent.tint, color: accent.hex }}>
                                        {icon}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ─── MAIN CONTENT ─── */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

                    {/* LEFT: Scanner panel */}
                    <div className="xl:col-span-2 space-y-4">
                        {/* Mode tabs */}
                        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.navy.hex }} />
                            <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                                <SectionHeader label="Scanner" title="Quét mã QR" subtitle="Chọn sự kiện bên trên để bắt đầu" />
                            </div>
                            <div className="p-5 space-y-4">
                                {/* Mode toggle */}
                                <div className="flex gap-2">
                                    <button onClick={() => setMode('manual')}
                                        className={`flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                                            mode === 'manual'
                                                ? 'bg-[var(--color-brand-navy)] text-white shadow-[var(--shadow-brand)]'
                                                : 'border-2 border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] bg-white'
                                        }`}>
                                        <QrCode className="w-4 h-4" /> Nhập mã
                                    </button>
                                    <button onClick={() => setMode('camera')}
                                        className={`flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                                            mode === 'camera'
                                                ? 'bg-[var(--color-brand-navy)] text-white shadow-[var(--shadow-brand)]'
                                                : 'border-2 border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] bg-white'
                                        }`}>
                                        <Camera className="w-4 h-4" /> Quét camera
                                    </button>
                                </div>

                                {/* QR paste */}
                                {mode === 'manual' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] block mb-1.5">Dán nội dung mã QR</label>
                                            <textarea
                                                value={qrInput}
                                                onChange={e => setQrInput(e.target.value)}
                                                rows={4}
                                                placeholder="Dán nội dung mã QR vào đây..."
                                                className="w-full p-3 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-brand-navy)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] transition-all resize-none shadow-[var(--shadow-xs)]"
                                            />
                                        </div>
                                        <button
                                            onClick={() => void doCheckin(qrInput)}
                                            disabled={!qrInput.trim() || processing || !selectedEventId}
                                            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing ? (
                                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            ) : <QrCode className="w-4 h-4" />}
                                            Check-in bằng QR
                                        </button>

                                        <div className="border-t border-[var(--border-light)] pt-4 space-y-3">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Hoặc check-in thủ công</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="text" value={manualStudentId}
                                                    onChange={e => setManualStudentId(e.target.value)}
                                                    placeholder="MSSV (VD: B22DCCN001)"
                                                    className="h-10 rounded-xl border-2 border-[var(--border-default)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-brand-navy)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] transition-all" />
                                                <input type="text" value={manualRegistrationId}
                                                    onChange={e => setManualRegistrationId(e.target.value)}
                                                    placeholder="Registration ID"
                                                    className="h-10 rounded-xl border-2 border-[var(--border-default)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-brand-navy)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] transition-all" />
                                            </div>
                                            <button
                                                onClick={() => void handleManualCheckin()}
                                                disabled={processing || !selectedEventId}
                                                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-[var(--border-default)] text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                            >
                                                <Users className="w-4 h-4" /> Check-in thủ công
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Camera view */}
                                {mode === 'camera' && (
                                    <div className="space-y-3">
                                        <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--border-default)] bg-black aspect-square">
                                            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
                                            {/* Scan frame overlay */}
                                            {cameraReady && (
                                                <>
                                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                        <div className="relative w-48 h-48">
                                                            <div className="absolute inset-0 rounded-2xl border-2 border-white/80" />
                                                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#00A651] rounded-tl-xl" />
                                                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#00A651] rounded-tr-xl" />
                                                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#00A651] rounded-bl-xl" />
                                                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#00A651] rounded-br-xl" />
                                                        </div>
                                                    </div>
                                                    <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.4)] rounded-2xl" />
                                                </>
                                            )}
                                            {!cameraReady && !cameraError && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                                    <div className="w-10 h-10 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
                                                    <p className="text-white text-sm font-medium">Đang mở camera...</p>
                                                </div>
                                            )}
                                        </div>

                                        {cameraReady && (
                                            <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: ACCENT.green.hex }}>
                                                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: ACCENT.green.hex }} />
                                                Camera đang hoạt động
                                            </div>
                                        )}
                                        {cameraError && (
                                            <div className="flex items-start gap-2 rounded-xl border border-[var(--color-brand-red)]/20 bg-[var(--color-brand-red)]/5 p-3">
                                                <AlertCircle className="w-4 h-4 text-[var(--color-brand-red)] shrink-0 mt-0.5" />
                                                <p className="text-xs font-medium text-[var(--color-brand-red)]">{cameraError}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Result cards */}
                        {(error || lastResult) && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                {error && (
                                    <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--color-brand-red)]/30 bg-white shadow-[var(--shadow-card)]">
                                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.red.hex }} />
                                        <div className="flex items-center gap-4 p-5">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: ACCENT.red.tint }}>
                                                <AlertCircle className="w-6 h-6" style={{ color: ACCENT.red.hex }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-[var(--text-primary)]">Check-in thất bại</p>
                                                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {lastResult && scanSuccess && (
                                    <div className="relative overflow-hidden rounded-2xl border-2 bg-white shadow-[var(--shadow-card)]">
                                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.green.hex }} />
                                        <div className="p-5 text-center">
                                            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: ACCENT.green.tint }}>
                                                <CheckCircle className="w-8 h-8" style={{ color: ACCENT.green.hex }} />
                                            </motion.div>
                                            <h3 className="text-lg font-extrabold text-[var(--text-primary)]">{lastResult.student.full_name}</h3>
                                            <p className="text-sm text-[var(--text-muted)] mt-0.5">{lastResult.student.student_id || lastResult.student.email}</p>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1">{lastResult.event.title}</p>
                                            {lastResult.event.training_points > 0 && (
                                                <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl text-sm font-bold" style={{ background: ACCENT.gold.tint, color: ACCENT.gold.text }}>
                                                    <Award className="w-4 h-4" /> +{lastResult.event.training_points} điểm rèn luyện
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* RIGHT: Attendance list */}
                    <div className="xl:col-span-3 relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.navy.hex }} />
                        <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <SectionHeader
                                    label="Live"
                                    title="Danh sách điểm danh"
                                    subtitle={attendances.length > 0 ? `${attendances.length} sinh viên` : 'Chưa có ai check-in'}
                                />
                                {attendances.length > 0 && (
                                    <button onClick={exportCsv}
                                        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border-2 border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all active:scale-95 shrink-0">
                                        <Download className="w-4 h-4" /> Xuất CSV
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Search */}
                        {attendances.length > 0 && (
                            <div className="px-5 py-3 border-b border-[var(--border-light)]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none z-10" />
                                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Tìm theo tên, MSSV, email..."
                                        className="w-full h-10 pl-10 pr-4 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-brand-navy)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] transition-all" />
                                </div>
                            </div>
                        )}

                        {/* List */}
                        <div className="max-h-[600px] overflow-y-auto">
                            {!selectedEventId ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                        <QrCode className="w-7 h-7 text-[var(--text-muted)]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[var(--text-secondary)]">Chưa chọn sự kiện</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">Chọn sự kiện bên trên để xem danh sách điểm danh</p>
                                    </div>
                                </div>
                            ) : attendances.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                        <Users className="w-7 h-7 text-[var(--text-muted)]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[var(--text-secondary)]">Chưa có sinh viên check-in</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">Quét mã QR hoặc nhập MSSV để bắt đầu</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {filtered.map((att, i) => {
                                        const isCheckedOut = att.status === 'checked_out';
                                        return (
                                            <div key={att.id}
                                                className={`flex items-center gap-3 px-5 py-3.5 hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors ${i > 0 ? 'border-t border-[var(--border-light)]' : ''}`}>
                                                {/* Avatar placeholder */}
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: ACCENT.navy.hex }}>
                                                    {att.registration.user.full_name.charAt(0).toUpperCase()}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{att.registration.user.full_name}</p>
                                                    <p className="text-[11px] text-[var(--text-muted)]">{att.registration.user.student_id || att.registration.user.email}</p>
                                                </div>

                                                {/* Time */}
                                                <div className="text-right shrink-0 hidden sm:block">
                                                    <p className="text-xs font-semibold text-[var(--text-secondary)]">{format(new Date(att.checked_in_at), 'HH:mm')}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)]">{format(new Date(att.checked_in_at), 'dd/MM')}</p>
                                                </div>

                                                {/* Status badge */}
                                                <div className="shrink-0">
                                                    {isCheckedOut ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--bg-muted)] text-[var(--text-muted)]">
                                                            <LogOut className="w-3 h-3" /> Đã check-out
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: ACCENT.green.tint, color: ACCENT.green.hex }}>
                                                            <CheckCircle className="w-3 h-3" /> Đã check-in
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {!isCheckedOut ? (
                                                        <button
                                                            onClick={() => void handleCheckout(att.id, att.registration.user.full_name)}
                                                            title="Check-out"
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-secondary)] transition-colors">
                                                            <LogOut className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => void handleUndo(att.id, att.registration.user.full_name)}
                                                            title="Hủy bản ghi"
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-red-50 hover:text-[var(--color-brand-red)] transition-colors">
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
