'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Award, TrendingUp, Calendar, BookOpen, ChevronRight, Sparkles, Ticket, Target, Star, ArrowUpRight, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import { trainingPointsService, TrainingPointRecord } from '@/services/trainingPointsService';
import { gamificationService, Badge } from '@/services/gamificationService';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

const HISTORY_PAGE_SIZE = 12;
const POINTS_GOAL = 100;

const ACCENT = {
    gold:   { hex: '#F26600', tint: 'rgba(242,102,0,0.08)',  text: '#c45500' },
    navy:   { hex: '#00358F', tint: 'rgba(0,53,143,0.08)',   text: '#00358F' },
    green:  { hex: '#00A651', tint: 'rgba(0,166,81,0.08)',    text: '#007a3d' },
    purple: { hex: '#8b5cf6', tint: 'rgba(139,92,246,0.08)', text: '#7c3aed' },
};

function StatCard({ label, value, icon: Icon, accent }: {
    label: string; value: string; icon: React.ElementType; accent: { hex: string; tint: string };
}) {
    return (
        <div className="bg-white rounded-2xl border border-[var(--border-default)] p-4 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1.5">{label}</p>
                    <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent.tint, color: accent.hex }}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}

function ProgressBar({ current, total, label }: { current: number; total: number; label: string }) {
    const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-secondary)]">{label}</span>
                <span className="font-bold" style={{ color: ACCENT.gold.hex }}>{current} / {total} điểm</span>
            </div>
            <div className="h-2.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${ACCENT.navy.hex}, ${ACCENT.gold.hex})` }}
                />
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium">{pct}% hoàn thành</p>
        </div>
    );
}

function EventHistoryRow({ point, onClick }: { point: TrainingPointRecord; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors cursor-pointer text-left group"
        >
            {/* Event icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: ACCENT.navy.tint }}>
                <Calendar className="w-5 h-5" style={{ color: ACCENT.navy.hex }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-brand-navy)] transition-colors truncate">{point.event.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        {new Date(point.event.start_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-[var(--border-default)]" />
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-bold" style={{ background: ACCENT.navy.tint, color: ACCENT.navy.hex }}>
                        {point.semester}
                    </span>
                </div>
            </div>

            {/* Points + chevron */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                    <p className="text-xl font-extrabold" style={{ color: ACCENT.gold.hex }}>+{point.points}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)]">điểm</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--color-brand-navy)] transition-colors" />
            </div>
        </button>
    );
}

export default function TrainingPointsPage() {
    const router = useRouter();
    const { isAuthenticated, isHydrated } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [points, setPoints] = useState<TrainingPointRecord[]>([]);
    const [totalEvents, setTotalEvents] = useState(0);
    const [totalPoints, setTotalPoints] = useState(0);
    const [currentSemesterPoints, setCurrentSemesterPoints] = useState(0);
    const [currentSemester, setCurrentSemester] = useState('');
    const [semesterFilter, setSemesterFilter] = useState('');
    const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
    const [historyOffset, setHistoryOffset] = useState(0);
    const [historyHasMore, setHistoryHasMore] = useState(false);
    const [myBadges, setMyBadges] = useState<Badge[]>([]);
    const [badgesLoading, setBadgesLoading] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

    const fetchSummary = useCallback(async () => {
        const [data, semesterData] = await Promise.all([
            trainingPointsService.getMyPoints(),
            trainingPointsService.getCurrentSemester(),
        ]);
        setTotalPoints(data.grand_total);
        setTotalEvents(data.total_events);
        setCurrentSemester(semesterData.semester);
        setAvailableSemesters(data.semesters.map((s) => s.semester));
        const currentRow = data.semesters.find((s) => s.semester === semesterData.semester) || data.semesters[0];
        setCurrentSemesterPoints(currentRow?.total_points || 0);
    }, []);

    const fetchHistory = useCallback(async (opts?: { append?: boolean; offset?: number; semester?: string }) => {
        const append = opts?.append || false;
        const offset = opts?.offset || 0;
        const semester = opts?.semester ?? '';
        if (append) setLoadingMore(true); else setHistoryLoading(true);
        try {
            const data = await trainingPointsService.getMyPointsHistory({ semester: semester || undefined, limit: HISTORY_PAGE_SIZE, offset });
            setPoints((prev) => (append ? [...prev, ...data.points] : data.points));
            setHistoryOffset(offset + data.points.length);
            setHistoryHasMore(data.has_more);
        } finally { setHistoryLoading(false); setLoadingMore(false); }
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        if (!isAuthenticated) { router.push('/login'); return; }
        const init = async () => {
            try {
                await Promise.all([
                    fetchSummary(),
                    fetchHistory({ append: false, offset: 0, semester: '' }),
                ]);
                // Load badges
                try {
                    setBadgesLoading(true);
                    const badgesData = await gamificationService.getMyBadges();
                    setMyBadges(badgesData.badges);
                } catch {
                    // badges are optional, don't show error
                } finally {
                    setBadgesLoading(false);
                }
            }
            catch { toast.error('Không thể tải điểm rèn luyện'); }
            finally { setLoading(false); }
        };
        void init();
    }, [fetchHistory, fetchSummary, router, isAuthenticated, isHydrated]);

    const applyFilter = async () => {
        try { await fetchHistory({ append: false, offset: 0, semester: semesterFilter }); }
        catch { toast.error('Không thể lọc lịch sử điểm'); }
    };

    const loadMore = async () => {
        try { await fetchHistory({ append: true, offset: historyOffset, semester: semesterFilter }); }
        catch { toast.error('Không thể tải thêm lịch sử điểm'); }
    };

    if (!isHydrated || loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    const progressPercent = POINTS_GOAL > 0 ? Math.min(Math.round((totalPoints / POINTS_GOAL) * 100), 100) : 0;
    const earnedThisSemester = currentSemesterPoints > 0;

    return (
        <DashboardLayout>
            <div className="space-y-5 p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto">

                {/* ─── PAGE HEADER ─── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[var(--color-brand-navy)] opacity-[0.03] pointer-events-none" />
                    <div className="px-6 pt-6 pb-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                                <Award className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Training Points</p>
                                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">Điểm rèn luyện</h1>
                                <p className="text-sm text-[var(--text-muted)]">Theo dõi và quản lý điểm rèn luyện của bạn</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── MAIN KPI + PROGRESS ROW ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Hero card */}
                    <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-brand-navy)] via-[#0041a8] to-[var(--color-brand-orange)] p-6 text-white shadow-[var(--shadow-xl)]">
                        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-white/70 text-sm font-medium">Tổng điểm rèn luyện</p>
                                    <p className="text-4xl font-extrabold tracking-tight leading-none">{totalPoints}</p>
                                </div>
                                <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-xs font-semibold text-white/80">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Học kỳ {currentSemester || 'N/A'}
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="pt-4 border-t border-white/20">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Điểm học kỳ này</p>
                                        <p className="text-2xl font-extrabold">{currentSemesterPoints}</p>
                                    </div>
                                    <div>
                                        <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Sự kiện đã tham gia</p>
                                        <p className="text-2xl font-extrabold">{totalEvents}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress panel */}
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.gold.hex }} />
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="w-4 h-4" style={{ color: ACCENT.gold.hex }} />
                                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Mục tiêu</p>
                            </div>

                            <div className="flex items-end gap-2 mb-4">
                                <p className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{totalPoints}</p>
                                <p className="text-sm font-semibold text-[var(--text-muted)] pb-0.5">/ {POINTS_GOAL} điểm</p>
                            </div>

                            <ProgressBar current={totalPoints} total={POINTS_GOAL} label="Mục tiêu năm học" />

                            {/* Achievements preview */}
                            <div className="mt-5 pt-4 border-t border-[var(--border-light)]">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Thành tựu</p>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3].map(i => (
                                            <Star key={i} className={`w-4 h-4 ${i <= Math.floor(progressPercent / 33) ? 'fill-[#FFB800] text-[#FFB800]' : 'text-[var(--border-default)]'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden flex">
                                        {totalPoints >= 25 && <div className="h-full rounded-l-full" style={{ width: '33.3%', background: ACCENT.gold.hex }} />}
                                        {totalPoints >= 50 && <div className="h-full" style={{ width: '33.3%', background: ACCENT.gold.hex }} />}
                                        {totalPoints >= 75 && <div className="h-full rounded-r-full" style={{ width: '33.4%', background: ACCENT.gold.hex }} />}
                                        <div className={`h-full transition-all duration-500 ${totalPoints < 25 ? 'rounded-l-full' : totalPoints < 50 ? '' : totalPoints < 75 ? '' : ''}`} style={{
                                            width: `${totalPoints >= 100 ? 0 : Math.min(Math.max(((totalPoints % 25) / 25) * 33.3, 0), 33.3)}%`,
                                            background: `${totalPoints < 25 ? ACCENT.gold.hex : totalPoints < 50 ? ACCENT.gold.hex : ACCENT.gold.hex}`,
                                            opacity: totalPoints >= 100 ? 0 : 0.3,
                                        }} />
                                    </div>
                                    <span className="text-xs font-bold" style={{ color: ACCENT.gold.hex }}>{Math.min(progressPercent, 100)}%</span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1.5">
                                    {totalPoints >= 100 ? (
                                        <span className="font-semibold" style={{ color: ACCENT.green.hex }}>Chúc mừng! Đã hoàn thành mục tiêu</span>
                                    ) : (
                                        <>Còn <strong>{POINTS_GOAL - totalPoints} điểm</strong> để đạt mục tiêu</>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── STATS ROW ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <StatCard label="Sự kiện đã tham gia" value={totalEvents.toLocaleString('vi-VN')} icon={Calendar} accent={ACCENT.navy} />
                    <StatCard label="Số học kỳ đã có điểm" value={availableSemesters.length.toString()} icon={BookOpen} accent={ACCENT.purple} />
                </div>

                {/* ─── BADGES SHOWCASE ─── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, #f59e0b, #8b5cf6, #00A651)` }} />
                    <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.10)', color: '#8b5cf6' }}>
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-[var(--text-primary)]">Huy hiệu & Thành tựu</h2>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(139,92,246,0.10)', color: '#8b5cf6' }}>
                                            {myBadges.length} huy hiệu
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Những huy hiệu bạn đã đạt được</p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push('/dashboard/gamification')}
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border-2 border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all active:scale-95"
                            >
                                <Trophy className="w-4 h-4" />
                                Xem bảng xếp hạng
                            </button>
                        </div>
                    </div>
                    <div className="p-5">
                        {badgesLoading ? (
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-muted)]" />
                                        <div className="w-16 h-3 rounded bg-[var(--bg-muted)]" />
                                    </div>
                                ))}
                            </div>
                        ) : myBadges.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                    <Trophy className="w-7 h-7 text-[var(--text-muted)]" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-[var(--text-secondary)]">Chưa có huy hiệu nào</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Tham gia sự kiện để nhận huy hiệu đầu tiên</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Badge grid */}
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                    {myBadges.slice(0, 16).map((badge) => {
                                        const BadgeIcon = {
                                            Flame: () => <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M12 2C12 2 8 6 8 10C8 12 9 14 10 15C9 14 8 13 8 11C8 9 10 7 12 6C14 7 16 9 16 11C16 13 15 14 14 15C15 14 16 12 16 10C16 6 12 2 12 2Z" fill="currentColor" /><path d="M12 22C15.3137 22 18 19.3137 18 16C18 13 15 10 12 8C9 10 6 13 6 16C6 19.3137 8.68629 22 12 22Z" fill="currentColor" opacity="0.7" /></svg>,
                                            Zap: () => <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" /></svg>,
                                            Star: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
                                            Heart: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
                                            Coffee: () => <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8zM6 2v3M10 2v3M14 2v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                                            Sparkles: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3zM5 19l1 3 1-3M18 19l1 3 1-3M5 14l1 3 1-3M18 14l1 3 1-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
                                            Crown: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M2 17l2-9 5 4 3-6 3 6 5-4 2 9H2zM2 20h20v2H2v-2z" /></svg>,
                                            Building2: () => <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><rect x="4" y="10" width="16" height="11" rx="1" stroke="currentColor" strokeWidth="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2"/><line x1="4" y1="15" x2="20" y2="15" stroke="currentColor" strokeWidth="2"/></svg>,
                                            Calendar: () => <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/></svg>,
                                            Rocket: () => <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke="currentColor" strokeWidth="2"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke="currentColor" strokeWidth="2"/></svg>,
                                            Sunrise: () => <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M17 18a5 5 0 0 0-10 0" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="2" x2="12" y2="9" stroke="currentColor" strokeWidth="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" stroke="currentColor" strokeWidth="2"/><line x1="2" y1="18" x2="4" y2="18" stroke="currentColor" strokeWidth="2"/><line x1="20" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="2"/><line x1="19.78" y1="11.64" x2="21.19" y2="10.22" stroke="currentColor" strokeWidth="2"/><line x1="2" y1="22" x2="22" y2="22" stroke="currentColor" strokeWidth="2"/></svg>,
                                            MessageSquare: () => <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2"/></svg>,
                                            Medal: () => <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6"><circle cx="12" cy="14" r="6" stroke="currentColor" strokeWidth="2"/><path d="M8 2l1.5 4.5L4 8l4.5 1.5L8 14M16 2l-1.5 4.5L20 8l-4.5 1.5L16 14" stroke="currentColor" strokeWidth="2"/></svg>,
                                        }[badge.icon];
                                        const IconComponent = BadgeIcon || Trophy;

                                        return (
                                            <motion.button
                                                key={badge.id}
                                                whileHover={{ scale: 1.1, y: -3 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setSelectedBadge(badge)}
                                                title={badge.name}
                                                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-[var(--bg-muted)] transition-colors cursor-pointer group"
                                            >
                                                <div className="relative">
                                                    <div
                                                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md transition-shadow group-hover:shadow-lg"
                                                        style={{ background: badge.color }}
                                                    >
                                                        <IconComponent />
                                                    </div>
                                                    <motion.div
                                                        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                                                        transition={{ repeat: Infinity, duration: 2.5 }}
                                                        className="absolute inset-0 rounded-xl"
                                                        style={{ background: badge.color, filter: 'blur(8px)' }}
                                                    />
                                                </div>
                                                <p className="text-[10px] font-bold text-[var(--text-muted)] text-center leading-tight group-hover:text-[var(--text-secondary)] transition-colors">
                                                    {badge.name.length > 10 ? badge.name.slice(0, 9) + '…' : badge.name}
                                                </p>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                                {myBadges.length > 16 && (
                                    <button
                                        onClick={() => router.push('/dashboard/gamification')}
                                        className="w-full h-9 rounded-xl border-2 border-dashed border-[var(--border-default)] text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all"
                                    >
                                        +{myBadges.length - 16} huy hiệu khác — Xem tất cả
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── EVENT HISTORY ─── */}
                <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-[var(--text-primary)]">Lịch sử điểm rèn luyện</h2>
                                    {points.length > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--bg-muted)] text-[var(--text-muted)]">
                                            {points.length} sự kiện
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">Chi tiết điểm từ các sự kiện đã tham gia</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={semesterFilter}
                                    onChange={(e) => setSemesterFilter(e.target.value)}
                                    className="h-9 rounded-xl border-2 border-[var(--border-default)] bg-white px-3 text-sm font-medium text-[var(--text-secondary)] focus:border-[var(--color-brand-navy)] focus:outline-none transition-colors cursor-pointer"
                                >
                                    <option value="">Tất cả học kỳ</option>
                                    {availableSemesters.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <Button onClick={applyFilter} isLoading={historyLoading} size="sm">Lọc</Button>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div>
                        {historyLoading ? (
                            <div className="flex items-center justify-center gap-3 py-14">
                                <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                <span className="text-sm text-[var(--text-muted)] font-medium">Đang tải lịch sử điểm...</span>
                            </div>
                        ) : points.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
                                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                    <Ticket className="w-7 h-7 text-[var(--text-muted)]" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-[var(--text-secondary)]">Chưa có điểm rèn luyện</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Tham gia sự kiện để tích lũy điểm rèn luyện</p>
                                </div>
                                <button
                                    onClick={() => router.push('/dashboard/events')}
                                    className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-bold shadow-[var(--shadow-brand)] hover:opacity-90 transition-all active:scale-95"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Khám phá sự kiện
                                </button>
                            </div>
                        ) : (
                            <>
                                {points.map((point, i) => (
                                    <div key={point.id} className={i > 0 ? 'border-t border-[var(--border-light)]' : ''}>
                                        <EventHistoryRow
                                            point={point}
                                            onClick={() => router.push(`/dashboard/events/${point.event.id}`)}
                                        />
                                    </div>
                                ))}

                                {/* Load more */}
                                {!historyLoading && historyHasMore && (
                                    <div className="border-t border-[var(--border-default)] p-4 text-center">
                                        <Button onClick={loadMore} isLoading={loadingMore} variant="outline" size="sm">
                                            Tải thêm
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── BADGE MODAL ─── */}
            {selectedBadge && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
                    onClick={() => setSelectedBadge(null)}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full max-w-sm rounded-3xl border border-[var(--border-default)] bg-white shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="relative pt-16 pb-8 px-8 text-center" style={{ background: `linear-gradient(135deg, ${selectedBadge.color}18 0%, ${selectedBadge.color}06 100%)` }}>
                            <div className="absolute top-6 left-1/2 -translate-x-1/2">
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                    className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl"
                                    style={{ background: selectedBadge.color }}
                                >
                                    <Trophy className="w-12 h-12 text-white" />
                                </motion.div>
                            </div>
                            <div className="mt-28">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2"
                                    style={{ background: `${selectedBadge.color}20`, color: selectedBadge.color }}>
                                    {selectedBadge.type === 'streak' ? '🔥 Streak' : selectedBadge.type === 'milestone' ? '⭐ Milestone' : selectedBadge.type === 'achievement' ? '🏆 Achievement' : '👑 Rank'}
                                </span>
                                <h3 className="text-xl font-extrabold text-[var(--text-primary)]">{selectedBadge.name}</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-2">{selectedBadge.description}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-3">
                                    Nhận được: {new Date(selectedBadge.awarded_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        <div className="px-8 pb-6">
                            <button
                                onClick={() => setSelectedBadge(null)}
                                className="w-full h-11 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-bold hover:opacity-90 transition-all active:scale-95"
                            >
                                Đóng
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
}
