'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Award, TrendingUp, Calendar, BookOpen, ChevronRight, Sparkles, Ticket, Target, Star, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import { trainingPointsService, TrainingPointRecord } from '@/services/trainingPointsService';
import { toast } from 'sonner';

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
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-1.5">{label}</p>
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
            <p className="text-[10px] text-[var(--text-muted)] font-medium">{pct}% hoàn thành</p>
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
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: ACCENT.navy.tint, color: ACCENT.navy.hex }}>
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
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }
        const init = async () => {
            try { await Promise.all([fetchSummary(), fetchHistory({ append: false, offset: 0, semester: '' })]); }
            catch { toast.error('Không thể tải điểm rèn luyện'); }
            finally { setLoading(false); }
        };
        void init();
    }, [fetchHistory, fetchSummary, router]);

    const applyFilter = async () => {
        try { await fetchHistory({ append: false, offset: 0, semester: semesterFilter }); }
        catch { toast.error('Không thể lọc lịch sử điểm'); }
    };

    const loadMore = async () => {
        try { await fetchHistory({ append: true, offset: historyOffset, semester: semesterFilter }); }
        catch { toast.error('Không thể tải thêm lịch sử điểm'); }
    };

    if (loading) {
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
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Training Points</p>
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
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Thành tựu</p>
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
                                    <span className="text-[10px] font-bold" style={{ color: ACCENT.gold.hex }}>{Math.min(progressPercent, 100)}%</span>
                                </div>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
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

                {/* ─── EVENT HISTORY ─── */}
                <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-[var(--text-primary)]">Lịch sử điểm rèn luyện</h2>
                                    {points.length > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-muted)] text-[var(--text-muted)]">
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
        </DashboardLayout>
    );
}
