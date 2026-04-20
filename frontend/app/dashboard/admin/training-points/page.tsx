'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Users, Calendar, Trophy, Download, FileJson, BarChart3, Search, ChevronDown, RefreshCw, Plus, ArrowUpRight } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import {
    trainingPointsService,
    AwardTrainingPointsPayload,
    ExportTrainingPointsQuery,
    ExportTrainingPointsResponse,
    TrainingPointsStatistics,
    UserTrainingPointsResponse,
} from '@/services/trainingPointsService';
import { toast } from 'sonner';

const ACCENT = {
    gold:   { hex: '#F26600', tint: 'rgba(242,102,0,0.10)',  text: '#c45500' },
    navy:   { hex: '#00358F', tint: 'rgba(0,53,143,0.10)',   text: '#00358F' },
    green:  { hex: '#00A651', tint: 'rgba(0,166,81,0.10)',    text: '#007a3d' },
    purple: { hex: '#8b5cf6', tint: 'rgba(139,92,246,0.10)', text: '#7c3aed' },
};

function SectionHeader({ label, title, subtitle, action }: {
    label?: string; title: string; subtitle?: string; action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                {label && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-orange)] mb-0.5">{label}</p>
                )}
                <h2 className="text-base font-extrabold text-[var(--text-primary)]">{title}</h2>
                {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
    label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-10 rounded-xl border-2 border-[var(--border-default)] bg-white px-3.5 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] shadow-[var(--shadow-xs)]"
            />
        </div>
    );
}

function PrimaryButton({ onClick, loading, children, icon, className = '' }: {
    onClick?: () => void; loading?: boolean; children: React.ReactNode; icon?: React.ReactNode; className?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-bold shadow-[var(--shadow-brand)] transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
        >
            {loading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : icon ? <span className="shrink-0">{icon}</span> : null}
            {children}
        </button>
    );
}

function SecondaryButton({ onClick, loading, children, icon, variant = 'outline', className = '' }: {
    onClick?: () => void; loading?: boolean; children: React.ReactNode; icon?: React.ReactNode; variant?: 'outline' | 'ghost'; className?: string;
}) {
    const base = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
    const styles = variant === 'outline'
        ? 'border-2 border-[var(--border-default)] bg-white text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] shadow-[var(--shadow-xs)]'
        : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--border-default)] hover:text-[var(--text-primary)]';
    return (
        <button onClick={onClick} disabled={loading} className={`${base} ${styles} ${className}`}>
            {loading ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : icon ? <span className="shrink-0">{icon}</span> : null}
            {children}
        </button>
    );
}

export default function AdminTrainingPointsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const canManage = user?.role === 'admin' || user?.role === 'organizer';

    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingUser, setLoadingUser] = useState(false);
    const [stats, setStats] = useState<TrainingPointsStatistics | null>(null);
    const [selectedUserPoints, setSelectedUserPoints] = useState<UserTrainingPointsResponse | null>(null);
    const [userIdInput, setUserIdInput] = useState('');
    const [awarding, setAwarding] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [exportPreview, setExportPreview] = useState<ExportTrainingPointsResponse | null>(null);
    const [showJson, setShowJson] = useState(false);
    const [showSemesterTable, setShowSemesterTable] = useState(true);
    const [awardForm, setAwardForm] = useState({ user_id: '', event_id: '', points: '', semester: '' });
    const [exportFilter, setExportFilter] = useState({ semester: '', event_id: '', user_id: '' });

    const loadStats = useCallback(async () => {
        if (!isAdmin) { setLoadingStats(false); return; }
        try { setLoadingStats(true); const data = await trainingPointsService.getStatistics(); setStats(data); }
        catch { toast.error('Không thể tải thống kê điểm rèn luyện'); }
        finally { setLoadingStats(false); }
    }, [isAdmin]);

    useEffect(() => {
        if (user?.role && !canManage) { router.push('/dashboard'); return; }
        void loadStats();
    }, [canManage, loadStats, router, user?.role]);

    const fetchUserPoints = async (userId: number) => {
        if (!isAdmin) return;
        try { setLoadingUser(true); const data = await trainingPointsService.getUserPoints(userId); setSelectedUserPoints(data); setUserIdInput(String(userId)); }
        catch { toast.error('Không thể tải điểm của người dùng này'); }
        finally { setLoadingUser(false); }
    };

    const parseInt2 = (v: string) => { const n = parseInt(v, 10); return Number.isInteger(n) && n > 0 ? n : undefined; };

    const buildParams = (): ExportTrainingPointsQuery | null => {
        try {
            return {
                semester: exportFilter.semester || undefined,
                event_id: parseInt2(exportFilter.event_id),
                user_id: parseInt2(exportFilter.user_id),
            };
        } catch { toast.error('Bộ lọc export không hợp lệ'); return null; }
    };

    const handleAward = async () => {
        const uid = parseInt2(awardForm.user_id);
        const eid = parseInt2(awardForm.event_id);
        if (!uid) { toast.error('User ID phải là số nguyên dương'); return; }
        if (!eid) { toast.error('Event ID phải là số nguyên dương'); return; }
        const pts = awardForm.points ? parseInt2(awardForm.points) : undefined;
        const payload: AwardTrainingPointsPayload = { user_id: uid, event_id: eid, points: pts, semester: awardForm.semester || undefined };
        try { setAwarding(true); const r = await trainingPointsService.awardPoints(payload); toast.success(`Đã cộng ${r.points} điểm cho ${r.user.full_name}`); setAwardForm({ user_id: '', event_id: '', points: '', semester: '' }); if (isAdmin) { await loadStats(); await fetchUserPoints(r.user_id); } }
        catch { toast.error('Không thể cộng điểm rèn luyện'); }
        finally { setAwarding(false); }
    };

    const handleExportCsv = async () => {
        const p = buildParams(); if (!p) return;
        try { setExporting(true); const blob = await trainingPointsService.exportPointsCsv(p); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `training-points-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url); toast.success('Đã xuất báo cáo CSV'); }
        catch { toast.error('Không thể xuất báo cáo CSV'); }
        finally { setExporting(false); }
    };

    const handlePreviewJson = async () => {
        const p = buildParams(); if (!p) return;
        try { setPreviewing(true); const data = await trainingPointsService.exportPoints(p); setExportPreview(data); setShowJson(true); toast.success('Đã tải dữ liệu JSON'); }
        catch { toast.error('Không thể tải dữ liệu JSON export'); }
        finally { setPreviewing(false); }
    };

    const semesterRows = useMemo(() => stats?.semester_statistics || [], [stats]);

    return (
        <DashboardLayout>
            <div className="space-y-5 p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto">

                {/* ─── PAGE HEADER ─── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    {/* Decorative corner orb */}
                    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[var(--color-brand-navy)] opacity-[0.03] pointer-events-none" />

                    <div className="px-6 pt-6 pb-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            {/* Title block */}
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                                    <Award className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Training Points</p>
                                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                                        {isAdmin ? 'Quản trị điểm rèn luyện' : 'Quản lý điểm rèn luyện'}
                                    </h1>
                                    <p className="text-sm text-[var(--text-muted)]">
                                        {isAdmin
                                            ? 'Theo dõi tổng điểm, tra cứu theo từng người dùng và xuất báo cáo theo bộ lọc.'
                                            : 'Cộng điểm và xuất báo cáo cho các sự kiện được phân quyền.'}
                                    </p>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                                <SecondaryButton onClick={() => void loadStats()} loading={loadingStats} icon={<RefreshCw className="w-4 h-4" />}>
                                    Làm mới
                                </SecondaryButton>
                                <SecondaryButton onClick={handlePreviewJson} loading={previewing} icon={<FileJson className="w-4 h-4" />} variant="ghost">
                                    Xem JSON
                                </SecondaryButton>
                                <PrimaryButton onClick={handleExportCsv} loading={exporting} icon={<Download className="w-4 h-4" />}>
                                    Xuất CSV
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── KPI STRIP ─── */}
                {isAdmin && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'Tổng điểm đã cấp', value: (stats?.total_points_awarded || 0).toLocaleString('vi-VN'), icon: <Award className="w-5 h-5" />, accent: ACCENT.gold },
                            { label: 'Người dùng có điểm', value: (stats?.total_users_with_points || 0).toLocaleString('vi-VN'), icon: <Users className="w-5 h-5" />, accent: ACCENT.navy },
                            { label: 'Học kỳ có dữ liệu', value: semesterRows.length, icon: <Calendar className="w-5 h-5" />, accent: ACCENT.green },
                        ].map(({ label, value, icon, accent }) => (
                            <div key={label} className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-0.5 group">
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `linear-gradient(135deg, ${accent.tint} 0%, transparent 60%)` }} />
                                <div className="relative flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-2">{label}</p>
                                        <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{loadingStats ? '—' : value}</p>
                                    </div>
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent.tint, color: accent.hex }}>
                                        {icon}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ─── MAIN CONTENT GRID ─── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                    {/* Award Form */}
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.gold.hex }} />
                        <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                            <SectionHeader
                                label="Actions"
                                title="Cộng điểm thủ công"
                                subtitle="Yêu cầu user đã check-in sự kiện"
                                action={<div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT.gold.tint, color: ACCENT.gold.hex }}><Plus className="w-4 h-4" /></div>}
                            />
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="User ID" value={awardForm.user_id} onChange={(v) => setAwardForm((p) => ({ ...p, user_id: v }))} placeholder="VD: 12" />
                                <Field label="Event ID" value={awardForm.event_id} onChange={(v) => setAwardForm((p) => ({ ...p, event_id: v }))} placeholder="VD: 5" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Điểm (tùy chọn)" value={awardForm.points} onChange={(v) => setAwardForm((p) => ({ ...p, points: v }))} placeholder="VD: 10" />
                                <Field label="Học kỳ (tùy chọn)" value={awardForm.semester} onChange={(v) => setAwardForm((p) => ({ ...p, semester: v }))} placeholder="VD: 2024-1" />
                            </div>
                            <PrimaryButton onClick={handleAward} loading={awarding} icon={<Plus className="w-4 h-4" />} className="w-full">
                                Cộng điểm
                            </PrimaryButton>
                        </div>
                    </div>

                    {/* Export Filter */}
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.navy.hex }} />
                        <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                            <SectionHeader
                                label="Export"
                                title="Bộ lọc xuất dữ liệu"
                                subtitle="Lọc theo học kỳ, sự kiện hoặc user"
                                action={<div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT.navy.tint, color: ACCENT.navy.hex }}><Download className="w-4 h-4" /></div>}
                            />
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <Field label="Học kỳ" value={exportFilter.semester} onChange={(v) => setExportFilter((p) => ({ ...p, semester: v }))} placeholder="VD: 2024-1" />
                                <Field label="Event ID" value={exportFilter.event_id} onChange={(v) => setExportFilter((p) => ({ ...p, event_id: v }))} placeholder="VD: 5" />
                                <Field label="User ID" value={exportFilter.user_id} onChange={(v) => setExportFilter((p) => ({ ...p, user_id: v }))} placeholder="VD: 12" />
                            </div>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed px-1">
                                {isAdmin
                                    ? 'Admin có thể xuất theo mọi bộ lọc. Organizer chỉ xem được dữ liệu thuộc sự kiện của mình.'
                                    : 'Dữ liệu export được backend giới hạn theo các sự kiện bạn được quản lý.'}
                            </p>
                            <div className="flex gap-2 pt-1">
                                <SecondaryButton onClick={handleExportCsv} loading={exporting} icon={<Download className="w-4 h-4" />} className="flex-1">Xuất CSV</SecondaryButton>
                                <SecondaryButton onClick={handlePreviewJson} loading={previewing} icon={<FileJson className="w-4 h-4" />} variant="ghost">JSON</SecondaryButton>
                            </div>
                        </div>
                    </div>

                    {/* Top Students — full width */}
                    {isAdmin && (
                        <div className="xl:col-span-2 relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.purple.hex }} />
                            <div className="px-5 pt-5 pb-0 border-b border-[var(--border-light)]">
                                <SectionHeader
                                    label="Leaderboard"
                                    title="Top sinh viên theo điểm"
                                    subtitle={loadingStats ? 'Đang tải...' : `${(stats?.top_users || []).length} sinh viên`}
                                    action={<Trophy className="w-5 h-5" style={{ color: ACCENT.gold.hex }} />}
                                />
                            </div>
                            <div className="p-5">
                                {(stats?.top_users || []).length === 0 && !loadingStats ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                            <Trophy className="w-7 h-7 text-[var(--text-muted)]" />
                                        </div>
                                        <p className="text-sm font-semibold text-[var(--text-secondary)]">Chưa có dữ liệu sinh viên</p>
                                        <p className="text-xs text-[var(--text-muted)]">Cộng điểm cho sinh viên để xem bảng xếp hạng</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {(stats?.top_users || []).map((row, i) => {
                                            const info = row.user;
                                            const rankColors = [ACCENT.gold.hex, '#94a3b8', '#cd7f32'];
                                            return (
                                                <button
                                                    key={`${info?.id || i}`}
                                                    onClick={() => info?.id && void fetchUserPoints(info.id)}
                                                    disabled={!info?.id}
                                                    className="relative flex items-center gap-3 rounded-xl border border-[var(--border-default)] p-3.5 hover:border-[color-mix(in_srgb,var(--color-brand-navy)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left group cursor-pointer active:scale-[0.98]"
                                                >
                                                    {/* Rank */}
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0 ${i < 3 ? '' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'}`} style={i < 3 ? { background: rankColors[i] } : {}}>
                                                        {i + 1}
                                                    </div>
                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--color-brand-navy)] transition-colors">{info?.full_name || '—'}</p>
                                                        <p className="text-[11px] text-[var(--text-muted)] truncate">{info?.student_id || info?.email || '—'}</p>
                                                    </div>
                                                    {/* Score */}
                                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                        <span className="text-base font-extrabold" style={{ color: ACCENT.gold.hex }}>{row.total_points}</span>
                                                        <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)]">điểm</span>
                                                    </div>
                                                    <ArrowUpRight className="absolute top-2 right-2 w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* User Lookup — full width */}
                    {isAdmin && (
                        <div className="xl:col-span-2 relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.green.hex }} />
                            <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                                <SectionHeader
                                    label="Lookup"
                                    title="Tra cứu theo User ID"
                                    subtitle="Nhập user id hoặc click từ danh sách top bên trên"
                                    action={<Search className="w-5 h-5" style={{ color: ACCENT.green.hex }} />}
                                />
                            </div>
                            <div className="p-5">
                                {/* Search bar */}
                                <div className="flex gap-2 mb-5">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none z-10" />
                                        <input
                                            value={userIdInput}
                                            onChange={(e) => setUserIdInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { const n = parseInt2(userIdInput); if (n) void fetchUserPoints(n); else toast.error('User ID không hợp lệ'); } }}
                                            placeholder="Nhập User ID, ví dụ: 12"
                                            className="w-full h-10 pl-10 pr-4 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] shadow-[var(--shadow-xs)]"
                                        />
                                    </div>
                                    <PrimaryButton onClick={() => { const n = parseInt2(userIdInput); if (n) void fetchUserPoints(n); else toast.error('User ID không hợp lệ'); }} loading={loadingUser} icon={<Search className="w-4 h-4" />}>
                                        Tra cứu
                                    </PrimaryButton>
                                </div>

                                {/* User detail */}
                                <div>
                                    {!selectedUserPoints ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed border-[var(--border-default)] rounded-xl">
                                            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                                <Users className="w-6 h-6 text-[var(--text-muted)]" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-semibold text-[var(--text-secondary)]">Chưa chọn người dùng</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">Nhập User ID hoặc chọn từ danh sách top sinh viên</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border border-[var(--border-default)] rounded-xl overflow-hidden">
                                            {/* User header */}
                                            <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-default)] bg-[var(--bg-muted)]/30">
                                                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: ACCENT.navy.tint }}>
                                                    <Users className="w-6 h-6" style={{ color: ACCENT.navy.hex }} />
                                                </div>
                                                <div>
                                                    <p className="text-base font-bold text-[var(--text-primary)]">{selectedUserPoints.user.full_name}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">{selectedUserPoints.user.student_id || selectedUserPoints.user.email}</p>
                                                </div>
                                            </div>

                                            {/* KPI row */}
                                            <div className="grid grid-cols-2 divide-x divide-[var(--border-default)]">
                                                <div className="px-5 py-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">Tổng điểm</p>
                                                    <p className="text-3xl font-extrabold" style={{ color: ACCENT.gold.hex }}>{selectedUserPoints.grand_total.toLocaleString('vi-VN')}</p>
                                                </div>
                                                <div className="px-5 py-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">Sự kiện đã tham gia</p>
                                                    <p className="text-3xl font-extrabold text-[var(--text-primary)]">{selectedUserPoints.total_events}</p>
                                                </div>
                                            </div>

                                            {/* Semester breakdown */}
                                            {selectedUserPoints.semesters.length > 0 && (
                                                <div className="px-5 py-4 border-t border-[var(--border-default)] bg-[var(--bg-muted)]/20">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-3">Điểm theo học kỳ</p>
                                                    <div className="space-y-2">
                                                        {selectedUserPoints.semesters.map((s) => (
                                                            <div key={s.semester} className="flex items-center justify-between py-2 border-b border-[var(--border-light)] last:border-0">
                                                                <span className="text-sm font-semibold text-[var(--text-secondary)]">{s.semester}</span>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-24 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                                                        <div className="h-full rounded-full" style={{
                                                                            width: `${selectedUserPoints.grand_total > 0 ? Math.round((s.total_points / selectedUserPoints.grand_total) * 100) : 0}%`,
                                                                            background: ACCENT.green.hex
                                                                        }} />
                                                                    </div>
                                                                    <span className="text-sm font-bold" style={{ color: ACCENT.green.hex }}>{s.total_points}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── JSON PREVIEW — ACCORDION ─── */}
                {isAdmin && (
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                        <button
                            onClick={() => setShowJson(!showJson)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-muted)]/40 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ACCENT.navy.tint, color: ACCENT.navy.hex }}>
                                    <FileJson className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-[var(--text-primary)]">Xem nhanh dữ liệu JSON</p>
                                    <p className="text-xs text-[var(--text-muted)]">Kiểm tra dữ liệu theo bộ lọc trước khi tải CSV</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-200 ${showJson ? 'rotate-180' : ''}`} />
                        </button>

                        {showJson && (
                            <div className="border-t border-[var(--border-default)]">
                                {!exportPreview ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-14">
                                        <FileJson className="w-10 h-10 text-[var(--text-muted)]" />
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-[var(--text-secondary)]">Chưa có dữ liệu preview</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">Điền bộ lọc bên trên và bấm "Xuất CSV" hoặc "JSON" để xem trước</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-5 space-y-4">
                                        {/* Summary row */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {[
                                                { label: 'Tổng bản ghi', value: exportPreview.total_records.toLocaleString('vi-VN'), accent: ACCENT.navy },
                                                { label: 'Tổng điểm', value: exportPreview.total_points.toLocaleString('vi-VN'), accent: ACCENT.gold },
                                                { label: 'Phạm vi dữ liệu', value: exportPreview.filters.scope, accent: ACCENT.green },
                                            ].map(({ label, value, accent }) => (
                                                <div key={label} className="rounded-xl border border-[var(--border-default)] p-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">{label}</p>
                                                    <p className="text-xl font-extrabold" style={{ color: accent.hex }}>{value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Records table */}
                                        <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-[var(--bg-muted)]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Người dùng</th>
                                                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Sự kiện</th>
                                                            <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Điểm</th>
                                                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Học kỳ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[var(--border-light)]">
                                                        {exportPreview.records.slice(0, 10).map((row) => (
                                                            <tr key={row.id} className="hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors">
                                                                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{row.full_name}</td>
                                                                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{row.event_title}</td>
                                                                <td className="px-4 py-3 text-right font-bold" style={{ color: ACCENT.gold.hex }}>{row.points}</td>
                                                                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{row.semester}</td>
                                                            </tr>
                                                        ))}
                                                        {exportPreview.records.length === 0 && (
                                                            <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Không có bản ghi nào.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── SEMESTER TABLE ─── */}
                {isAdmin && (
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.green.hex }} />
                        <button
                            onClick={() => setShowSemesterTable(!showSemesterTable)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-muted)]/40 transition-colors cursor-pointer"
                        >
                            <SectionHeader
                                label="Statistics"
                                title="Điểm theo học kỳ"
                                subtitle={`${semesterRows.length} học kỳ có dữ liệu`}
                            />
                            <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-200 ${showSemesterTable ? 'rotate-180' : ''}`} />
                        </button>

                        {showSemesterTable && (
                            <div className="border-t border-[var(--border-default)]">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[var(--bg-muted)]">
                                            <tr>
                                                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Học kỳ</th>
                                                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Tổng điểm</th>
                                                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Số sự kiện</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-light)]">
                                            {semesterRows.map((row) => (
                                                <tr key={row.semester} className="hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: ACCENT.navy.tint, color: ACCENT.navy.hex }}>{row.semester}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <span className="text-base font-extrabold" style={{ color: ACCENT.gold.hex }}>{row.total_points.toLocaleString('vi-VN')}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right text-sm text-[var(--text-secondary)]">{row.events_count}</td>
                                                </tr>
                                            ))}
                                            {!loadingStats && semesterRows.length === 0 && (
                                                <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">Không có dữ liệu học kỳ.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
}
