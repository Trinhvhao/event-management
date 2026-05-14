'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
    QrCode, Camera, CheckCircle, Award, Users, AlertCircle,
    Download, Search, X, RotateCcw, LogOut, ScanLine, RefreshCw,
    WifiOff, Wifi, Cloud, Eye, Clock3
} from 'lucide-react';
import { checkinService, CheckinResult, AttendanceRecord, AttendanceStats, AttendanceDetail } from '@/services/checkinService';
import { profileService } from '@/services/profileService';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraDeviceInfo { id: string; label: string; }
import { useOfflineCheckin } from '@/hooks/useOfflineCheckin';
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

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const data = (error as { response?: { data?: { error?: { message?: string }; message?: string } } }).response?.data;
        return data?.error?.message || data?.message || fallback;
    }
    return fallback;
};

const getCameraErrorMessage = (error: unknown): string => {
    if (!error || typeof error !== 'object') return 'Không thể mở camera. Vui lòng thử lại.';
    const err = error as { name?: string; message?: string; toString?: () => string };
    const msg = err.toString?.() || err.message || '';
    const lower = msg.toLowerCase();
    if (err.name === 'NotAllowedError' || lower.includes('permission') || lower.includes('denied')) {
        return 'Camera bị từ chối. Vui lòng cho phép truy cập camera trong cài đặt trình duyệt.';
    }
    if (err.name === 'NotFoundError' || lower.includes('not found') || lower.includes('no device')) {
        return 'Không tìm thấy camera. Vui lòng kiểm tra thiết bị hoặc dùng chế độ Nhập mã.';
    }
    if (lower.includes('insecure') || lower.includes('https') || err.name === 'NotSupportedError') {
        return 'Quét camera cần truy cập qua HTTPS. Vui lòng dùng chế độ Nhập mã.';
    }
    if (err.name === 'NotReadableError' || lower.includes('in use') || lower.includes('busy')) {
        return 'Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng khác và thử lại.';
    }
    return 'Không thể mở camera. Vui lòng dùng chế độ Nhập mã.';
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
                {label && <p className="text-xs font-bold uppercase tracking-[0.18em] text-(--color-brand-orange) mb-0.5">{label}</p>}
                <h2 className="text-base font-extrabold text-(--text-primary)">{title}</h2>
                {subtitle && <p className="text-xs text-(--text-muted) mt-0.5">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

export default function CheckinPage() {
    const { user } = useAuthStore();
    const router = useRouter();

    // ── Offline check-in hook ────────────────────────────────────────────
    const { isOnline, pendingItems, pendingCount, isSyncing, queueCheckIn, processQueue } =
        useOfflineCheckin();

    // ── Local UI state ────────────────────────────────────────────────────
    const [mode, setMode] = useState<ScanMode>('manual');
    const [qrInput, setQrInput] = useState('');
    const [manualStudentId, setManualStudentId] = useState('');
    const [manualRegistrationId, setManualRegistrationId] = useState('');
    const [processing, setProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
    const [lastResultQueued, setLastResultQueued] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastScan, setLastScan] = useState<{ value: string; ts: number } | null>(null);
    const [scanSuccess, setScanSuccess] = useState(false);

    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [stats, setStats] = useState<AttendanceStats | null>(null);
    const [loadingAttendances, setLoadingAttendances] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAttendance, setSelectedAttendance] = useState<AttendanceDetail | null>(null);
    const [loadingAttendanceId, setLoadingAttendanceId] = useState<number | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');
    const [loadingCameras, setLoadingCameras] = useState(false);

    const videoRef = useRef<HTMLDivElement>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scanCooldownRef = useRef<boolean>(false);
    const lastScanTimeRef = useRef<number>(0);

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
                    : (await eventService.getAll({ limit: 100 })).items || [];
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

        // Re-validate session before check-in to prevent stale token issues
        try {
            const freshUser = await profileService.getProfile();
            useAuthStore.getState().updateUser(freshUser);
        } catch {
            toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
            useAuthStore.getState().logout();
            router.push('/login');
            return;
        }

        setProcessing(true);
        setError(null);
        setLastResult(null);
        setLastResultQueued(false);
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
            // Offline or network error — queue for later sync
            if (!navigator.onLine) {
                await queueCheckIn('qr_checkin', { qr_code: qrData.trim() });
                setLastResultQueued(true);
                setLastScan({ value: qrData.trim(), ts: Date.now() });
                setScanSuccess(true);
                setQrInput('');
                playSound('success');
                toast.success('Đang offline — đã lưu để đồng bộ sau');
            } else {
                const msg = normalizeQrError(getErrorMessage(err, 'Check-in thất bại'), 'Check-in thất bại');
                setError(msg);
                playSound('error');
                toast.error(msg);
            }
        } finally {
            setProcessing(false);
        }
    }, [loadAttendanceData, playSound, queueCheckIn, router]);

    // ── Camera logic ──────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {});
            scannerRef.current = null;
        }
        setCameraReady(false);
    }, []);

    const enumerateCameras = useCallback(async () => {
        setLoadingCameras(true);
        try {
            const devices = await Html5Qrcode.getCameras();
            const cams: CameraDeviceInfo[] = devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id.slice(0, 8)}` }));
            setAvailableCameras(cams);
            if (cams.length > 0 && !selectedCameraId) {
                const backCamera = cams.find(c =>
                    c.label.toLowerCase().includes('back') ||
                    c.label.toLowerCase().includes('sau') ||
                    c.label.toLowerCase().includes('environment')
                );
                setSelectedCameraId(backCamera?.id ?? cams[0].id);
            }
        } catch (err) {
            console.warn('Không thể liệt kê camera:', err);
            setAvailableCameras([]);
        } finally {
            setLoadingCameras(false);
        }
    }, [selectedCameraId]);

    const startCamera = useCallback(async () => {
        if (typeof window === 'undefined') return;
        await stopCamera();
        setCameraError(null);

        try {
            const scanner = new Html5Qrcode('qr-reader-container');
            scannerRef.current = scanner;

            const cameraIdOrConfig = selectedCameraId
                ? { deviceId: { exact: selectedCameraId } }
                : { facingMode: 'environment' };

            await scanner.start(
                cameraIdOrConfig,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1,
                },
                async (decodedText) => {
                    const now = Date.now();
                    if (scanCooldownRef.current || now - lastScanTimeRef.current < 3000) return;
                    scanCooldownRef.current = true;
                    lastScanTimeRef.current = now;
                    try { await doCheckin(decodedText); }
                    finally { setTimeout(() => { scanCooldownRef.current = false; }, 3000); }
                },
                () => {}
            );

            setCameraReady(true);
        } catch (err) {
            setCameraError(getCameraErrorMessage(err));
            await stopCamera();
        }
    }, [stopCamera, doCheckin, selectedCameraId]);

    useEffect(() => {
        if (mode !== 'camera') { void stopCamera(); setCameraError(null); return; }
        void enumerateCameras();
        return () => { void stopCamera(); };
    }, [mode, stopCamera, enumerateCameras]);

    useEffect(() => {
        if (mode === 'camera' && selectedCameraId && cameraError === null) {
            void startCamera();
        }
    }, [mode, selectedCameraId, cameraError, startCamera]);

    // ── Manual check-in ───────────────────────────────────────────────
    const handleManualCheckin = async () => {
        if (!selectedEventId) { toast.error('Vui lòng chọn sự kiện'); return; }
        const sid = manualStudentId.trim();
        const rid = manualRegistrationId.trim();
        if (!sid && !rid) { toast.error('Nhập MSSV hoặc Registration ID'); return; }

        // Re-validate session before check-in to prevent stale token issues
        try {
            const freshUser = await profileService.getProfile();
            useAuthStore.getState().updateUser(freshUser);
        } catch {
            toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
            useAuthStore.getState().logout();
            router.push('/login');
            return;
        }

        let regId: number | undefined;
        if (rid) { regId = parseInt(rid, 10); if (!Number.isInteger(regId) || regId <= 0) { toast.error('Registration ID không hợp lệ'); return; } }

        setProcessing(true); setError(null); setLastResult(null); setLastResultQueued(false); setScanSuccess(false);
        try {
            const result = await checkinService.processManualCheckin({ event_id: selectedEventId, registration_id: regId, student_id: sid || undefined });
            setLastResult(result); setLastScan({ value: 'manual', ts: Date.now() }); setScanSuccess(true);
            setManualStudentId(''); setManualRegistrationId('');
            playSound('success');
            toast.success(`Check-in thành công: ${result.student.full_name}`);
            await loadAttendanceData();
        } catch (err: unknown) {
            if (!navigator.onLine) {
                await queueCheckIn('manual_checkin', { event_id: selectedEventId, registration_id: regId, student_id: sid || undefined });
                setLastResultQueued(true);
                setLastScan({ value: 'manual', ts: Date.now() });
                setScanSuccess(true);
                setManualStudentId(''); setManualRegistrationId('');
                playSound('success');
                toast.success('Đang offline — đã lưu để đồng bộ sau');
            } else {
                const msg = normalizeQrError(getErrorMessage(err, 'Check-in thất bại'), 'Check-in thất bại');
                setError(msg); playSound('error'); toast.error(msg);
            }
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

    const handleViewAttendance = async (attendanceId: number) => {
        try {
            setLoadingAttendanceId(attendanceId);
            const attendanceDetail = await checkinService.getAttendance(attendanceId);
            setSelectedAttendance(attendanceDetail);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Không thể tải chi tiết điểm danh'));
        } finally {
            setLoadingAttendanceId(null);
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

    // ── Sync pending queue ─────────────────────────────────────────────
    const handleSync = async () => {
        if (isSyncing) return;
        const results = await processQueue();
        const succeeded = results.filter(r => r.success);
        const skipped = results.filter(r => r.skipped);
        const failed = results.filter(r => !r.success && !r.skipped);

        if (succeeded.length > 0) {
            toast.success(`Đã đồng bộ ${succeeded.length} check-in thành công`);
            void loadAttendanceData();
        }
        skipped.forEach(() => {
            toast.info('Một số check-in đã tồn tại trên server, đã bỏ qua');
        });
        if (failed.length > 0) {
            toast.error(`${failed.length} check-in thất bại sau nhiều lần thử. Đã xóa khỏi hàng đợi.`);
        }
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

                {/* ─── OFFLINE BANNER ─── */}
                <AnimatePresence>
                    {!isOnline && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                            className="relative overflow-hidden rounded-2xl border-2 border-(--color-brand-orange)/40 bg-(--color-brand-orange)/5 px-5 py-3.5"
                        >
                            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: ACCENT.gold.hex }} />
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-(--color-brand-orange)/10">
                                    <WifiOff className="w-5 h-5" style={{ color: ACCENT.gold.hex }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-(--text-primary)">Bạn đang offline</p>
                                    <p className="text-xs text-(--text-secondary)">Check-in được lưu cục bộ và sẽ đồng bộ khi có mạng.</p>
                                </div>
                                {pendingCount > 0 && (
                                    <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: ACCENT.gold.tint, color: ACCENT.gold.text }}>
                                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: ACCENT.gold.hex }} />
                                        {pendingCount} đang chờ đồng bộ
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── PAGE HEADER ─── */}
                <div className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-white shadow-card">
                    <div className="absolute top-0 left-0 right-0 h-0.75 bg-linear-to-r from-(--color-brand-navy) via-(--color-brand-orange) to-brand-gold" />
                    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-(--color-brand-navy) opacity-[0.03] pointer-events-none" />
                    <div className="px-6 pt-6 pb-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-(--color-brand-navy) to-[#1a5fc8] flex items-center justify-center shadow-brand shrink-0">
                                    <QrCode className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--color-brand-orange)">Check-in</p>
                                    <h1 className="text-2xl font-extrabold text-(--text-primary) tracking-tight leading-tight">Điểm danh sự kiện</h1>
                                    <p className="text-sm text-(--text-muted)">Quét QR hoặc nhập MSSV để check-in / check-out sinh viên</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Online indicator */}
                                <span className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-semibold border border-(--border-default) ${
                                    isOnline ? 'text-[#00A651] bg-[rgba(0,166,81,0.06)]' : 'text-(--color-brand-orange) bg-[rgba(242,102,0,0.06)]'
                                }`}>
                                    {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                                {/* Sync button */}
                                {pendingCount > 0 && (
                                    <button
                                        onClick={() => void handleSync()}
                                        disabled={isSyncing || !isOnline}
                                        title="Đồng bộ check-in đang chờ"
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border-2 border-(--color-brand-navy) bg-(--color-brand-navy) text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                    >
                                        {isSyncing ? (
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                        ) : <Cloud className="w-4 h-4" />}
                                        Đồng bộ
                                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/20 text-xs font-bold">
                                            {pendingCount}
                                        </span>
                                    </button>
                                )}
                                <button onClick={() => void loadAttendanceData()} disabled={!selectedEventId || loadingAttendances}
                                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border-2 border-(--border-default) bg-white text-sm font-semibold text-(--text-secondary) hover:border-(--color-brand-navy) hover:text-(--color-brand-navy) transition-all disabled:opacity-50 active:scale-95">
                                    <RefreshCw className={`w-4 h-4 ${loadingAttendances ? 'animate-spin' : ''}`} />
                                    Làm mới
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── EVENT SELECTOR ─── */}
                <div className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-white shadow-card">
                    <div className="px-5 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1 min-w-0">
                                <label className="text-xs font-bold uppercase tracking-[0.12em] text-(--text-muted) block mb-1.5">Sự kiện đang điểm danh</label>
                                <select
                                    value={selectedEventId || ''}
                                    onChange={e => setSelectedEventId(Number(e.target.value) || null)}
                                    className="w-full sm:max-w-md h-11 rounded-xl border-2 border-(--border-default) bg-white px-4 text-sm font-semibold text-(--text-primary) focus:border-(--color-brand-navy) focus:outline-none transition-colors cursor-pointer shadow-xs"
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
                                        'bg-(--bg-muted) text-(--text-muted)'
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${
                                            selectedEvent.status === 'ongoing' ? 'bg-[#00A651] animate-pulse' :
                                            selectedEvent.status === 'upcoming' ? 'bg-[#00358F]' : 'bg-(--text-muted)'
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
                            <div key={label} className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-white p-4 shadow-card hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-300">
                                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `linear-gradient(135deg, ${accent.tint} 0%, transparent 60%)` }} />
                                <div className="relative flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-(--text-muted) mb-1.5">{label}</p>
                                        <p className="text-2xl font-extrabold text-(--text-primary) tracking-tight leading-none">{value}</p>
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
                        <div className="relative overflow-hidden rounded-2xl border border-(--border-default) bg-white shadow-card">
                            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: ACCENT.navy.hex }} />
                            <div className="px-5 pt-5 pb-4 border-b border-(--border-light)">
                                <SectionHeader label="Scanner" title="Quét mã QR" subtitle="Chọn sự kiện bên trên để bắt đầu" />
                            </div>
                            <div className="p-5 space-y-4">
                                {/* Mode toggle */}
                                <div className="flex gap-2">
                                    <button onClick={() => setMode('manual')}
                                        className={`flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                                            mode === 'manual'
                                                ? 'bg-(--color-brand-navy) text-white shadow-brand'
                                                : 'border-2 border-(--border-default) text-(--text-secondary) hover:border-(--color-brand-navy) hover:text-(--color-brand-navy) bg-white'
                                        }`}>
                                        <QrCode className="w-4 h-4" /> Nhập mã
                                    </button>
                                    <button onClick={() => setMode('camera')}
                                        className={`flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                                            mode === 'camera'
                                                ? 'bg-(--color-brand-navy) text-white shadow-brand'
                                                : 'border-2 border-(--border-default) text-(--text-secondary) hover:border-(--color-brand-navy) hover:text-(--color-brand-navy) bg-white'
                                        }`}>
                                        <Camera className="w-4 h-4" /> Quét camera
                                    </button>
                                </div>

                                {/* Camera selector */}
                                {mode === 'camera' && (
                                    <div className="relative">
                                        {loadingCameras ? (
                                            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-muted)">
                                                <div className="h-4 w-4 rounded-full border-2 border-(--text-muted)/30 border-t-(--text-muted) animate-spin shrink-0" />
                                                <span className="text-xs font-medium text-(--text-muted)">Đang tìm camera...</span>
                                            </div>
                                        ) : availableCameras.length > 1 ? (
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-bold uppercase tracking-widest text-(--text-muted) shrink-0">Camera:</label>
                                                <div className="relative flex-1">
                                                    <select
                                                        value={selectedCameraId}
                                                        onChange={(e) => {
                                                            setSelectedCameraId(e.target.value);
                                                        }}
                                                        className="w-full h-10 appearance-none rounded-xl border-2 border-(--border-default) bg-white pl-3 pr-8 text-sm font-semibold text-(--text-primary) focus:border-(--color-brand-navy) focus:outline-none transition-colors cursor-pointer"
                                                    >
                                                        {availableCameras.map(cam => (
                                                            <option key={cam.id} value={cam.id}>
                                                                {cam.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                        <svg className="h-4 w-4 text-(--text-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : availableCameras.length === 1 ? (
                                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-(--border-default) bg-(--bg-muted)">
                                                <Camera className="h-4 w-4 text-(--text-muted) shrink-0" />
                                                <span className="text-xs font-medium text-(--text-muted) truncate">
                                                    {availableCameras[0].label}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                {/* QR paste */}
                                {mode === 'manual' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-widest text-(--text-muted) block mb-1.5">Dán nội dung mã QR</label>
                                            <textarea
                                                value={qrInput}
                                                onChange={e => setQrInput(e.target.value)}
                                                rows={4}
                                                placeholder="Dán nội dung mã QR vào đây..."
                                                className="w-full p-3 rounded-xl border-2 border-(--border-default) bg-white text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--color-brand-navy) focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] transition-all resize-none shadow-xs"
                                            />
                                        </div>
                                        <button
                                            onClick={() => void doCheckin(qrInput)}
                                            disabled={!qrInput.trim() || processing || !selectedEventId}
                                            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-(--color-brand-navy) text-white text-sm font-bold shadow-brand hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing ? (
                                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            ) : <QrCode className="w-4 h-4" />}
                                            Check-in bằng QR
                                        </button>

                                        <div className="border-t border-(--border-light) pt-4 space-y-3">
                                            <p className="text-xs font-bold uppercase tracking-widest text-(--text-muted)">Hoặc check-in thủ công</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="text" value={manualStudentId}
                                                    onChange={e => setManualStudentId(e.target.value)}
                                                    placeholder="MSSV (VD: B22DCCN001)"
                                                    className="h-10 rounded-xl border-2 border-(--border-default) px-3 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--color-brand-navy) focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] transition-all" />
                                                <input type="text" value={manualRegistrationId}
                                                    onChange={e => setManualRegistrationId(e.target.value)}
                                                    placeholder="Registration ID"
                                                    className="h-10 rounded-xl border-2 border-(--border-default) px-3 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--color-brand-navy) focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] transition-all" />
                                            </div>
                                            <button
                                                onClick={() => void handleManualCheckin()}
                                                disabled={processing || !selectedEventId}
                                                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-(--border-default) text-sm font-semibold text-(--text-secondary) hover:border-(--color-brand-navy) hover:text-(--color-brand-navy) transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                            >
                                                <Users className="w-4 h-4" /> Check-in thủ công
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Camera view */}
                                {mode === 'camera' && (
                                    <div className="space-y-3">
                                        <div className="relative overflow-hidden rounded-2xl border-2 border-(--border-default) bg-black aspect-square">
                                            {/* html5-qrcode renders into this div */}
                                            <div id="qr-reader-container" ref={videoRef} className="h-full w-full [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover [&_img]:!hidden" />
                                            {/* Scan frame overlay */}
                                            {cameraReady && (
                                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                                                    <div className="relative h-48 w-48">
                                                        <div className="absolute inset-0 rounded-2xl border-2 border-white/80" />
                                                        <div className="absolute top-0 left-0 h-6 w-6 border-t-4 border-l-4 border-[#00A651] rounded-tl-xl" />
                                                        <div className="absolute top-0 right-0 h-6 w-6 border-t-4 border-r-4 border-[#00A651] rounded-tr-xl" />
                                                        <div className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-[#00A651] rounded-bl-xl" />
                                                        <div className="absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 border-[#00A651] rounded-br-xl" />
                                                    </div>
                                                </div>
                                            )}
                                            {cameraReady && (
                                                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.4)] rounded-2xl z-0" />
                                            )}
                                            {!cameraReady && !cameraError && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                                    <div className="h-10 w-10 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
                                                    <p className="text-sm font-medium text-white">Đang mở camera...</p>
                                                </div>
                                            )}
                                        </div>

                                        {cameraReady && (
                                            <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: ACCENT.green.hex }}>
                                                <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: ACCENT.green.hex }} />
                                                Camera đang hoạt động
                                            </div>
                                        )}
                                        {cameraError && (
                                            <div className="flex items-start gap-2 rounded-xl border border-(--color-brand-red)/20 bg-(--color-brand-red)/5 p-3">
                                                <AlertCircle className="h-4 w-4 text-(--color-brand-red) mt-0.5 shrink-0" />
                                                <p className="text-xs font-medium text-(--color-brand-red)">{cameraError}</p>
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
                                    <div className="relative overflow-hidden rounded-2xl border-2 border-(--color-brand-red)/30 bg-white shadow-card">
                                        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: ACCENT.red.hex }} />
                                        <div className="flex items-center gap-4 p-5">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: ACCENT.red.tint }}>
                                                <AlertCircle className="w-6 h-6" style={{ color: ACCENT.red.hex }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-(--text-primary)">Check-in thất bại</p>
                                                <p className="text-sm text-(--text-secondary) mt-0.5">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {lastResult && scanSuccess && !lastResultQueued && (
                                    <motion.div
                                        key={lastScan?.ts}
                                        initial={{ opacity: 0, scale: 0.6, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        className="relative overflow-hidden rounded-2xl border-2 bg-white shadow-card"
                                    >
                                        {/* Animated glow burst */}
                                        <div className="absolute inset-0 pointer-events-none">
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0.6 }}
                                                animate={{ scale: 3, opacity: 0 }}
                                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full"
                                                style={{ background: ACCENT.green.hex }}
                                            />
                                        </div>

                                        {/* Success accent line */}
                                        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT.green.hex}, transparent)` }} />

                                        <div className="relative p-5 text-center">
                                            {/* Animated avatar */}
                                            <div className="relative mx-auto mb-4 w-fit">
                                                <motion.div
                                                    initial={{ scale: 0, rotate: -180 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                                                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold text-white shadow-xl relative z-10"
                                                    style={{ background: `linear-gradient(135deg, ${ACCENT.green.hex}, #059669)` }}
                                                >
                                                    {lastResult.student.full_name.charAt(0).toUpperCase()}
                                                </motion.div>

                                                {/* Avatar ring */}
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 0.2, duration: 0.4 }}
                                                    className="absolute -inset-1 rounded-full border-2 -z-0"
                                                    style={{ borderColor: ACCENT.green.hex }}
                                                />

                                                {/* Check icon overlay */}
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 0.3, type: 'spring' }}
                                                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md z-20"
                                                    style={{ background: ACCENT.green.hex }}
                                                >
                                                    <CheckCircle className="w-4 h-4 text-white" />
                                                </motion.div>

                                                {/* Pulse ring */}
                                                <motion.div
                                                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                                                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                                                    className="absolute inset-0 rounded-full border-2 -z-0"
                                                    style={{ borderColor: ACCENT.green.hex }}
                                                />
                                            </div>

                                            {/* Name */}
                                            <motion.h3
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                                className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight"
                                            >
                                                {lastResult.student.full_name}
                                            </motion.h3>

                                            {/* Student ID / Email */}
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.3 }}
                                                className="text-sm text-[var(--text-muted)] mt-0.5 font-medium"
                                            >
                                                {lastResult.student.student_id || lastResult.student.email}
                                            </motion.p>

                                            {/* Event */}
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.35 }}
                                                className="text-sm text-[var(--text-secondary)] mt-2 font-semibold max-w-[200px] mx-auto truncate"
                                            >
                                                {lastResult.event.title}
                                            </motion.p>

                                            {/* Training Points + Badges */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4 }}
                                                className="flex flex-col items-center gap-2 mt-4"
                                            >
                                                {lastResult.event.training_points > 0 && (
                                                    <motion.span
                                                        initial={{ scale: 0.8 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ delay: 0.5, type: 'spring' }}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold shadow-md"
                                                        style={{ background: `linear-gradient(135deg, ${ACCENT.gold.hex}, ${ACCENT.gold.text})`, color: 'white' }}
                                                    >
                                                        <Award className="w-5 h-5" />
                                                        +{lastResult.event.training_points} điểm rèn luyện
                                                    </motion.span>
                                                )}

                                                {/* Success streak indicator */}
                                                <div className="flex items-center gap-1.5">
                                                    {Array.from({ length: 3 }).map((_, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            transition={{ delay: 0.5 + i * 0.08, type: 'spring' }}
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ background: ACCENT.green.hex, opacity: 0.3 + i * 0.3 }}
                                                        />
                                                    ))}
                                                    <span className="text-[10px] font-bold text-[var(--text-muted)] ml-1">CHECK-IN THÀNH CÔNG</span>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                )}
                                {lastResultQueued && (
                                    <div className="relative overflow-hidden rounded-2xl border-2 bg-white shadow-card">
                                        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: ACCENT.gold.hex }} />
                                        <div className="p-5 text-center">
                                            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: ACCENT.gold.tint }}>
                                                <Cloud className="w-8 h-8" style={{ color: ACCENT.gold.hex }} />
                                            </motion.div>
                                            <h3 className="text-lg font-extrabold text-(--text-primary)">Đã lưu offline</h3>
                                            <p className="text-sm text-(--text-secondary) mt-1">Mã QR đã được lưu cục bộ.</p>
                                            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl text-sm font-bold" style={{ background: ACCENT.gold.tint, color: ACCENT.gold.text }}>
                                                <WifiOff className="w-4 h-4" /> Sẽ đồng bộ khi có mạng
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* RIGHT: Attendance list */}
                    <div className="xl:col-span-3 relative overflow-hidden rounded-2xl border border-(--border-default) bg-white shadow-card">
                        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: ACCENT.navy.hex }} />
                        <div className="px-5 pt-5 pb-4 border-b border-(--border-light)">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <SectionHeader
                                    label="Live"
                                    title="Danh sách điểm danh"
                                    subtitle={attendances.length > 0 ? `${attendances.length} sinh viên` : 'Chưa có ai check-in'}
                                />
                                {attendances.length > 0 && (
                                    <button onClick={exportCsv}
                                        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border-2 border-(--border-default) text-xs font-semibold text-(--text-secondary) hover:border-(--color-brand-navy) hover:text-(--color-brand-navy) transition-all active:scale-95 shrink-0">
                                        <Download className="w-4 h-4" /> Xuất CSV
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Search */}
                        {attendances.length > 0 && (
                            <div className="px-5 py-3 border-b border-(--border-light)">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted) pointer-events-none z-10" />
                                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Tìm theo tên, MSSV, email..."
                                        className="w-full h-10 pl-10 pr-4 rounded-xl border-2 border-(--border-default) bg-white text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--color-brand-navy) focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] transition-all" />
                                </div>
                            </div>
                        )}

                        {/* List */}
                        <div className="max-h-150 overflow-y-auto">
                            {!selectedEventId ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-(--bg-muted) flex items-center justify-center">
                                        <QrCode className="w-7 h-7 text-(--text-muted)" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-(--text-secondary)">Chưa chọn sự kiện</p>
                                        <p className="text-xs text-(--text-muted) mt-1">Chọn sự kiện bên trên để xem danh sách điểm danh</p>
                                    </div>
                                </div>
                            ) : attendances.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-(--bg-muted) flex items-center justify-center">
                                        <Users className="w-7 h-7 text-(--text-muted)" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-(--text-secondary)">Chưa có sinh viên check-in</p>
                                        <p className="text-xs text-(--text-muted) mt-1">Quét mã QR hoặc nhập MSSV để bắt đầu</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {filtered.map((att, i) => {
                                        const isCheckedOut = att.status === 'checked_out';
                                        return (
                                            <div key={att.id}
                                                className={`flex items-center gap-3 px-5 py-3.5 hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors ${i > 0 ? 'border-t border-(--border-light)' : ''}`}>
                                                {/* Avatar placeholder */}
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: ACCENT.navy.hex }}>
                                                    {att.registration.user.full_name.charAt(0).toUpperCase()}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-(--text-primary) truncate">{att.registration.user.full_name}</p>
                                                    <p className="text-[11px] text-(--text-muted)">{att.registration.user.student_id || att.registration.user.email}</p>
                                                </div>

                                                {/* Time */}
                                                <div className="text-right shrink-0 hidden sm:block">
                                                    <p className="text-xs font-semibold text-(--text-secondary)">{format(new Date(att.checked_in_at), 'HH:mm')}</p>
                                                    <p className="text-xs text-(--text-muted)">{format(new Date(att.checked_in_at), 'dd/MM')}</p>
                                                </div>

                                                {/* Status badge */}
                                                <div className="shrink-0">
                                                    {isCheckedOut ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-(--bg-muted) text-(--text-muted)">
                                                            <LogOut className="w-3 h-3" /> Đã check-out
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: ACCENT.green.tint, color: ACCENT.green.hex }}>
                                                            <CheckCircle className="w-3 h-3" /> Đã check-in
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => void handleViewAttendance(att.id)}
                                                        title="Xem chi tiết"
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-(--text-muted) hover:bg-(--bg-muted) hover:text-(--text-secondary) transition-colors">
                                                        {loadingAttendanceId === att.id ? (
                                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    {!isCheckedOut ? (
                                                        <button
                                                            onClick={() => void handleCheckout(att.id, att.registration.user.full_name)}
                                                            title="Check-out"
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-(--text-muted) hover:bg-(--bg-muted) hover:text-(--text-secondary) transition-colors">
                                                            <LogOut className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => void handleUndo(att.id, att.registration.user.full_name)}
                                                            title="Hủy bản ghi"
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-(--text-muted) hover:bg-red-50 hover:text-(--color-brand-red) transition-colors">
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

                        {/* ─── PENDING QUEUE SECTION ─── */}
                        {pendingCount > 0 && (
                            <div className="border-t-2 border-dashed border-(--color-brand-orange)/30 px-5 py-4 bg-(--color-brand-orange)/3">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2">
                                        <Cloud className="w-4 h-4" style={{ color: ACCENT.gold.hex }} />
                                        <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: ACCENT.gold.text }}>Đang chờ đồng bộ</span>
                                        <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-xs font-bold bg-(--color-brand-orange) text-white">
                                            {pendingCount}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => void handleSync()}
                                        disabled={isSyncing || !isOnline}
                                        className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold border border-(--color-brand-orange)/40 text-(--color-brand-orange) hover:bg-(--color-brand-orange)/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {isSyncing ? (
                                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                        ) : <RefreshCw className="w-3 h-3" />}
                                        Đồng bộ ngay
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {pendingItems.map(item => (
                                        <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-(--color-brand-orange)/20">
                                            <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold text-white shrink-0 ${
                                                item.retries >= 3 ? 'bg-red-400' : 'bg-(--color-brand-orange)'
                                            }`}>
                                                {item.retries + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-(--text-primary) truncate">
                                                    {item.action === 'qr_checkin'
                                                        ? `QR: ${((item.payload as unknown as { qr_code: string }).qr_code).slice(0, 24)}...`
                                                        : `Thủ công: Event #${(item.payload as unknown as { event_id: number }).event_id}`
                                                    }
                                                </p>
                                                {item.lastError && (
                                                    <p className="text-xs text-red-500 truncate">{item.lastError}</p>
                                                )}
                                            </div>
                                            <span className="shrink-0 text-xs text-(--text-muted)">
                                                {format(new Date(item.timestamp), 'HH:mm:ss')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedAttendance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
                    <div className="w-full max-w-2xl rounded-3xl border border-(--border-default) bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-(--border-light) px-6 py-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-(--color-brand-orange)">Attendance</p>
                                <h3 className="text-xl font-extrabold text-(--text-primary)">Chi tiết điểm danh</h3>
                            </div>
                            <button
                                onClick={() => setSelectedAttendance(null)}
                                className="rounded-xl border border-(--border-default) p-2 text-(--text-muted) transition-colors hover:text-(--text-primary)"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5 px-6 py-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border border-(--border-default) bg-(--bg-muted)/30 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-(--text-muted)">Sinh viên</p>
                                    <p className="mt-2 text-lg font-bold text-(--text-primary)">{selectedAttendance.registration.user.full_name}</p>
                                    <p className="text-sm text-(--text-secondary)">{selectedAttendance.registration.user.student_id || selectedAttendance.registration.user.email}</p>
                                </div>
                                <div className="rounded-2xl border border-(--border-default) bg-(--bg-muted)/30 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-(--text-muted)">Sự kiện</p>
                                    <p className="mt-2 text-lg font-bold text-(--text-primary)">{selectedAttendance.registration.event?.title || 'Không xác định'}</p>
                                    <p className="text-sm text-(--text-secondary)">Mã bản ghi #{selectedAttendance.id}</p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border border-(--border-default) p-4">
                                    <div className="flex items-center gap-2">
                                        <Clock3 className="h-4 w-4 text-(--color-brand-navy)" />
                                        <p className="text-xs font-bold uppercase tracking-wide text-(--text-muted)">Check-in</p>
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-(--text-primary)">
                                        {format(new Date(selectedAttendance.checked_in_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-(--border-default) p-4">
                                    <div className="flex items-center gap-2">
                                        <LogOut className="h-4 w-4 text-(--color-brand-orange)" />
                                        <p className="text-xs font-bold uppercase tracking-wide text-(--text-muted)">Check-out</p>
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-(--text-primary)">
                                        {selectedAttendance.checked_out_at
                                            ? format(new Date(selectedAttendance.checked_out_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })
                                            : 'Chưa check-out'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border border-(--border-default) p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-(--text-muted)">Trạng thái</p>
                                    <div className="mt-2">
                                        {selectedAttendance.status === 'checked_out' ? (
                                            <span className="inline-flex items-center gap-2 rounded-xl bg-(--bg-muted) px-3 py-2 text-sm font-bold text-(--text-secondary)">
                                                <LogOut className="h-4 w-4" />
                                                Đã check-out
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold" style={{ background: ACCENT.green.tint, color: ACCENT.green.hex }}>
                                                <CheckCircle className="h-4 w-4" />
                                                Đang check-in
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-(--border-default) p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-(--text-muted)">Người thực hiện</p>
                                    <p className="mt-2 text-sm font-semibold text-(--text-primary)">
                                        {selectedAttendance.checker?.full_name || `#${selectedAttendance.checked_by}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
