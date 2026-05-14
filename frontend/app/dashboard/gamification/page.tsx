'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Trophy, Medal, Crown, Flame, Zap, Star, Heart, Coffee,
    Sparkles, Building2, Users, TrendingUp, Award, ChevronRight,
    ChevronDown, RefreshCw, Info, Trophy as TrophyIcon, Hash, ArrowUp,
    Calendar, Target, TrendingDown, Crown as CrownBadge,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gamificationService, Badge, LeaderboardEntry, DepartmentLeaderboardEntry } from '@/services/gamificationService';
import { trainingPointsService } from '@/services/trainingPointsService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

// ─── Badge Icon Mapper ────────────────────────────────────────────────────────
const BADGE_ICONS: Record<string, React.ElementType> = {
    Flame, Zap, Award, Star, Heart, Coffee, Sparkles, CrownBadge,
    Building2, Calendar, Target, TrophyIcon, Medal, Hash,
};

const getBadgeIcon = (iconName: string) => {
    return BADGE_ICONS[iconName] || TrophyIcon;
};

// ─── Avatar Color Palette ────────────────────────────────────────────────────
const AVATAR_PALETTE = [
    '#00358F', '#F26600', '#00A651', '#8b5cf6', '#dc2626',
    '#7c3aed', '#d97706', '#e11d48', '#0d9488', '#7c3aed',
];

const getAvatarColor = (id: number) => AVATAR_PALETTE[id % AVATAR_PALETTE.length];

// ─── Tier Colors ────────────────────────────────────────────────────────────
const TIER = {
    gold:   { hex: '#f59e0b', tint: 'rgba(245,158,11,0.10)',  glow: '#fde68a' },
    silver: { hex: '#94a3b8', tint: 'rgba(148,163,184,0.10)', glow: '#e2e8f0' },
    bronze: { hex: '#cd7f32', tint: 'rgba(205,127,50,0.10)',  glow: '#fdeee5' },
    normal: { hex: '#00358F', tint: 'rgba(0,53,143,0.06)',    glow: 'transparent' },
    navy:   { hex: '#00358F', tint: 'rgba(0,53,143,0.10)',    glow: 'transparent' },
    purple: { hex: '#8b5cf6', tint: 'rgba(139,92,246,0.08)',  glow: '#ede9fe' },
    red:    { hex: '#dc2626', tint: 'rgba(220,38,38,0.08)',   glow: '#fee2e2' },
    green:  { hex: '#00A651', tint: 'rgba(0,166,81,0.08)',    glow: '#dcfce7' },
    orange: { hex: '#F26600', tint: 'rgba(242,102,0,0.08)',   glow: '#fff7ed' },
};

const getTier = (rank: number) => {
    if (rank === 1) return TIER.gold;
    if (rank === 2) return TIER.silver;
    if (rank === 3) return TIER.bronze;
    return TIER.normal;
};

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function SkeletonRow({ count = 5, height = 64 }: { count?: number; height?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border-light)] last:border-0">
                    <div className="w-8 h-8 rounded-xl animate-pulse bg-[var(--bg-muted)]" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 rounded animate-pulse bg-[var(--bg-muted)]" style={{ width: `${60 + Math.random() * 30}%` }} />
                        <div className="h-2.5 rounded animate-pulse bg-[var(--bg-muted)]" style={{ width: `${30 + Math.random() * 20}%` }} />
                    </div>
                    <div className="w-12 h-5 rounded animate-pulse bg-[var(--bg-muted)]" />
                </div>
            ))}
        </>
    );
}

// ─── Badge Detail Modal ───────────────────────────────────────────────────────
function BadgeModal({ badge, onClose }: { badge: Badge; onClose: () => void }) {
    const Icon = getBadgeIcon(badge.icon);
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-sm rounded-3xl border border-[var(--border-default)] bg-white shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative pt-16 pb-8 px-8 text-center" style={{ background: `linear-gradient(135deg, ${badge.color}18 0%, ${badge.color}06 100%)` }}>
                    <div className="absolute top-6 left-1/2 -translate-x-1/2">
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                            className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-xl"
                            style={{ background: badge.color }}
                        >
                            <Icon className="w-12 h-12 text-white" />
                        </motion.div>
                    </div>
                    <div className="mt-28">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2"
                            style={{ background: `${badge.color}20`, color: badge.color }}>
                            {badge.type === 'streak' ? '🔥 Streak' : badge.type === 'milestone' ? '⭐ Milestone' : badge.type === 'achievement' ? '🏆 Achievement' : '👑 Rank'}
                        </span>
                        <h3 className="text-xl font-extrabold text-[var(--text-primary)]">{badge.name}</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-2">{badge.description}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-3">
                            Nhận được: {new Date(badge.awarded_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="px-8 pb-6">
                    <button
                        onClick={onClose}
                        className="w-full h-11 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-bold hover:opacity-90 transition-all active:scale-95"
                    >
                        Đóng
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Badge Card ──────────────────────────────────────────────────────────────
function BadgeCard({ badge, size = 'md', onClick }: { badge: Badge; size?: 'sm' | 'md' | 'lg'; onClick?: () => void }) {
    const Icon = getBadgeIcon(badge.icon);
    const isLarge = size === 'lg';
    const isSmall = size === 'sm';

    return (
        <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="relative flex flex-col items-center gap-2 p-3 rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all text-center group cursor-pointer"
        >
            <div className="relative">
                <div
                    className={`${isLarge ? 'w-16 h-16' : isSmall ? 'w-9 h-9' : 'w-12 h-12'} rounded-xl flex items-center justify-center shadow-md`}
                    style={{ background: badge.color }}
                >
                    <Icon className={`${isLarge ? 'w-8 h-8' : isSmall ? 'w-4 h-4' : 'w-6 h-6'} text-white`} />
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl -z-10 blur-md opacity-20" style={{ background: badge.color }} />
            </div>
            {!isSmall && (
                <div className="space-y-0.5">
                    <p className={`font-bold text-[var(--text-primary)] ${isLarge ? 'text-sm' : 'text-xs'}`}>{badge.name}</p>
                    {isLarge && <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 px-1">{badge.description}</p>}
                </div>
            )}
        </motion.button>
    );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────
function LeaderboardRow({ entry, index, onClick, delay = 0 }: {
    entry: LeaderboardEntry; index: number; onClick?: () => void; delay?: number;
}) {
    const tier = getTier(entry.rank);
    const isTop3 = entry.rank <= 3;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay + index * 60);
        return () => clearTimeout(t);
    }, [delay, index]);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors cursor-pointer group"
            onClick={onClick}
        >
            {/* Rank */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 ${isTop3 ? 'text-white' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'}`}
                style={isTop3 ? { background: tier.hex } : {}}>
                {isTop3 ? (
                    entry.rank === 1 ? <CrownBadge className="w-4 h-4" /> :
                    entry.rank === 2 ? <Medal className="w-4 h-4" /> :
                    <TrophyIcon className="w-4 h-4" />
                ) : entry.rank}
            </div>

            {/* Avatar */}
            <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                style={{ background: entry.avatar_color || getAvatarColor(entry.user_id) }}
            >
                {entry.full_name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--color-brand-navy)] transition-colors">
                    {entry.full_name}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                    {entry.student_id || '—'} {entry.department_name ? `· ${entry.department_name}` : ''}
                </p>
            </div>

            {/* Points */}
            <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="text-base font-extrabold" style={{ color: tier.hex }}>{entry.total_points.toLocaleString('vi-VN')}</span>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)]">{entry.total_events} sự kiện</span>
                    {entry.badges_count > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: TIER.purple.tint, color: TIER.purple.hex }}>
                            <Award className="w-2.5 h-2.5" /> {entry.badges_count}
                        </span>
                    )}
                </div>
            </div>

            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </motion.div>
    );
}

// ─── Department Bar ──────────────────────────────────────────────────────────
function DepartmentBar({ entry, maxPoints, delay = 0 }: {
    entry: DepartmentLeaderboardEntry; maxPoints: number; delay?: number;
}) {
    const pct = maxPoints > 0 ? (entry.total_points / maxPoints) * 100 : 0;
    const tier = getTier(entry.rank);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
    }, [delay]);

    const deptColors: Record<string, string> = {
        'CNTT': '#00358F', 'QTKD': '#F26600', 'KT': '#00A651',
        'NN': '#8b5cf6', 'TCNH': '#dc2626', 'LUẬT': '#7c3aed',
        'SP': '#d97706', 'NNT': '#0d9488', 'Y': '#dc2626',
    };
    const deptColor = deptColors[entry.department_code] || tier.hex;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_2%,transparent)] transition-colors"
        >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                style={{ background: deptColor }}>
                {entry.rank}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate">{entry.department_name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-extrabold" style={{ color: deptColor }}>{entry.total_points.toLocaleString('vi-VN')}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">({entry.unique_participants} SV)</span>
                    </div>
                </div>
                <div className="h-2.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: visible ? `${pct}%` : 0 }}
                        transition={{ duration: 0.8, delay: delay / 1000, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${deptColor}, ${deptColor}88)` }}
                    />
                </div>
            </div>
        </motion.div>
    );
}

// ─── Section Card ────────────────────────────────────────────────────────────
function SectionCard({ label, title, subtitle, icon, children, action, accent = TIER.navy }: {
    label?: string; title: string; subtitle?: string; icon?: React.ReactNode;
    children: React.ReactNode; action?: React.ReactNode; accent?: typeof TIER.navy;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent.hex}, ${accent.hex}40)` }} />
            <div className="px-5 pt-5 pb-0 border-b border-[var(--border-light)]">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent.tint, color: accent.hex }}>
                                {icon}
                            </div>
                        )}
                        <div>
                            {label && <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: accent.hex }}>{label}</p>}
                            <h2 className="text-base font-extrabold text-[var(--text-primary)]">{title}</h2>
                            {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
                        </div>
                    </div>
                    {action && <div>{action}</div>}
                </div>
            </div>
            <div>{children}</div>
        </div>
    );
}

// ─── My Rank Card ───────────────────────────────────────────────────────────
function MyRankCard({ myRank, myPoints, totalUsers }: {
    myRank?: number; myPoints?: number; totalUsers?: number;
}) {
    const tier = myRank ? getTier(myRank) : TIER.normal;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-brand-navy)] via-[#0041a8] to-[var(--color-brand-orange)] p-6 text-white shadow-[var(--shadow-xl)]">
            <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-white/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Xếp hạng của bạn</p>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-extrabold">#{myRank ?? '—'}</span>
                            <span className="text-sm text-white/60 font-medium pb-1">/ {totalUsers ?? 0} người</span>
                        </div>
                    </div>
                </div>
                <div className="pt-4 border-t border-white/20 flex items-center justify-between">
                    <div>
                        <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Điểm rèn luyện</p>
                        <p className="text-2xl font-extrabold">{myPoints?.toLocaleString('vi-VN') ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-xs font-semibold text-white/80">
                        <Star className="w-3.5 h-3.5" /> Học kỳ hiện tại
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function GamificationDashboardPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'global' | 'department'>('global');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState<number | undefined>(undefined);

    // Data
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [deptLeaderboard, setDeptLeaderboard] = useState<DepartmentLeaderboardEntry[]>([]);
    const [myBadges, setMyBadges] = useState<Badge[]>([]);
    const [myStats, setMyStats] = useState<{ rank?: number; points?: number; totalUsers?: number }>({});
    const [currentSemester, setCurrentSemester] = useState('');

    // Modal
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [lb, dlb, badges, semesterData] = await Promise.all([
                gamificationService.getLeaderboard({ limit: 20, semester: selectedSemester || undefined, department_id: selectedDepartment }),
                isAdmin ? gamificationService.getDepartmentLeaderboard({ semester: selectedSemester || undefined }) : Promise.resolve([]),
                gamificationService.getMyBadges(),
                trainingPointsService.getCurrentSemester(),
            ]);
            setLeaderboard(lb);
            setDeptLeaderboard(dlb);
            setMyBadges(badges.badges);
            setCurrentSemester(semesterData.semester);

            // Find my rank
            const myEntry = lb.find(e => e.user_id === user?.id);
            if (myEntry) {
                setMyStats({ rank: myEntry.rank, points: myEntry.total_points, totalUsers: lb.length });
            } else {
                const myPointsData = await trainingPointsService.getMyPoints().catch(() => null);
                if (myPointsData) {
                    setMyStats({ rank: undefined, points: myPointsData.grand_total, totalUsers: lb.length });
                }
            }
        } catch {
            toast.error('Không thể tải dữ liệu gamification');
        } finally {
            setLoading(false);
        }
    }, [isAdmin, selectedSemester, selectedDepartment, user?.id]);

    useEffect(() => { void loadAll(); }, [loadAll]);

    const maxDeptPoints = useMemo(() =>
        deptLeaderboard.length > 0 ? Math.max(...deptLeaderboard.map(d => d.total_points)) : 0,
    [deptLeaderboard]);

    const badgeTypeGroups = useMemo(() => {
        const groups: Record<string, Badge[]> = { streak: [], milestone: [], achievement: [], rank: [] };
        for (const b of myBadges) {
            if (groups[b.type]) groups[b.type].push(b);
        }
        return groups;
    }, [myBadges]);

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
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[var(--color-brand-orange)] flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                                    <Trophy className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Gamification</p>
                                    <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">Bảng xếp hạng</h1>
                                    <p className="text-sm text-[var(--text-muted)]">Xem thứ hạng và thành tựu của bạn</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => void loadAll()}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    Làm mới
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── MY RANK + BADGES ROW ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* My Rank Hero */}
                    <MyRankCard
                        myRank={myStats.rank}
                        myPoints={myStats.points}
                        totalUsers={myStats.totalUsers}
                    />

                    {/* My Badges Showcase */}
                    <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${TIER.purple.hex}, ${TIER.orange.hex})` }} />
                        <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: TIER.purple.tint, color: TIER.purple.hex }}>
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: TIER.purple.hex }}>Achievements</p>
                                        <h2 className="text-base font-extrabold text-[var(--text-primary)]">Huy hiệu của tôi</h2>
                                    </div>
                                </div>
                                <span className="text-2xl font-extrabold" style={{ color: TIER.purple.hex }}>{myBadges.length}</span>
                            </div>
                        </div>
                        <div className="p-4">
                            {loading ? (
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className="w-12 h-12 rounded-xl animate-pulse bg-[var(--bg-muted)]" />
                                    ))}
                                </div>
                            ) : myBadges.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                        <Award className="w-7 h-7 text-[var(--text-muted)]" />
                                    </div>
                                    <p className="text-sm font-semibold text-[var(--text-secondary)]">Chưa có huy hiệu nào</p>
                                    <p className="text-xs text-[var(--text-muted)]">Tham gia sự kiện để nhận huy hiệu</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Show all badges in grid */}
                                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                        {myBadges.slice(0, 16).map((badge) => (
                                            <BadgeCard
                                                key={badge.id}
                                                badge={badge}
                                                size="sm"
                                                onClick={() => setSelectedBadge(badge)}
                                            />
                                        ))}
                                    </div>
                                    {myBadges.length > 16 && (
                                        <button
                                            onClick={() => router.push('/dashboard/training-points')}
                                            className="w-full h-9 rounded-xl border-2 border-dashed border-[var(--border-default)] text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all"
                                        >
                                            +{myBadges.length - 16} huy hiệu khác
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── TABS + SEMESTER FILTER ─── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 bg-[var(--bg-muted)] rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('global')}
                            className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === 'global'
                                    ? 'bg-white text-[var(--color-brand-navy)] shadow-[var(--shadow-xs)]'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }`}
                        >
                            <Users className="w-4 h-4" /> Toàn trường
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab('department')}
                                className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold transition-all ${
                                    activeTab === 'department'
                                        ? 'bg-white text-[var(--color-brand-navy)] shadow-[var(--shadow-xs)]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                }`}
                            >
                                <Building2 className="w-4 h-4" /> Theo khoa
                            </button>
                        )}
                    </div>

                    {/* Semester filter */}
                    {selectedSemester && (
                        <button
                            onClick={() => setSelectedSemester('')}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-all"
                        >
                            <span>HK: {selectedSemester}</span>
                            <span className="w-4 h-4 rounded-full bg-[var(--text-muted)]/20 flex items-center justify-center text-[8px] text-[var(--text-muted)]">×</span>
                        </button>
                    )}
                </div>

                {/* ─── GLOBAL LEADERBOARD ─── */}
                <AnimatePresence mode="wait">
                    {activeTab === 'global' && (
                        <motion.div
                            key="global"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                            className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]"
                        >
                            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${TIER.gold.hex}, ${TIER.silver.hex}, ${TIER.bronze.hex})` }} />
                            <div className="px-5 pt-5 pb-0 border-b border-[var(--border-light)]">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: TIER.gold.tint, color: TIER.gold.hex }}>
                                            <Trophy className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: TIER.gold.hex }}>Leaderboard</p>
                                            <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                                                Top {leaderboard.length} sinh viên {selectedSemester ? `(HK ${selectedSemester})` : `học kỳ ${currentSemester}`}
                                            </h2>
                                        </div>
                                    </div>
                                    {loading && <RefreshCw className="w-4 h-4 text-[var(--text-muted)] animate-spin" />}
                                </div>
                            </div>

                            {/* Top 3 Podium */}
                            {leaderboard.length >= 3 && (
                                <div className="px-5 py-6 flex items-end justify-center gap-3 border-b border-[var(--border-light)]">
                                    {/* 2nd */}
                                    <motion.div
                                        initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                                        className="flex flex-col items-center gap-2"
                                    >
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold text-white border-2 border-white shadow-lg" style={{ background: TIER.silver.hex }}>
                                            {leaderboard[1].full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <p className="text-xs font-bold text-[var(--text-secondary)] truncate max-w-20 text-center">{leaderboard[1].full_name.split(' ').pop()}</p>
                                        <div className="w-16 h-20 rounded-t-2xl flex flex-col items-center justify-end pb-2 gap-0.5" style={{ background: TIER.silver.tint, borderTop: `3px solid ${TIER.silver.hex}` }}>
                                            <span className="text-lg font-extrabold" style={{ color: TIER.silver.hex }}>{leaderboard[1].total_points}</span>
                                            <span className="text-[9px] font-bold text-[var(--text-muted)]">điểm</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white" style={{ background: TIER.silver.hex }}>
                                            <Medal className="w-4 h-4" />
                                        </div>
                                    </motion.div>

                                    {/* 1st */}
                                    <motion.div
                                        initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                                        className="flex flex-col items-center gap-2"
                                    >
                                        <motion.div
                                            animate={{ y: [0, -4, 0] }}
                                            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                                        >
                                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-extrabold text-white border-3 border-white shadow-xl" style={{ background: TIER.gold.hex }}>
                                                <CrownBadge className="w-8 h-8" />
                                            </div>
                                        </motion.div>
                                        <p className="text-sm font-bold text-[var(--text-secondary)] truncate max-w-24 text-center">{leaderboard[0].full_name.split(' ').pop()}</p>
                                        <div className="w-20 h-24 rounded-t-2xl flex flex-col items-center justify-end pb-2 gap-0.5" style={{ background: TIER.gold.tint, borderTop: `4px solid ${TIER.gold.hex}` }}>
                                            <span className="text-xl font-extrabold" style={{ color: TIER.gold.hex }}>{leaderboard[0].total_points}</span>
                                            <span className="text-[9px] font-bold text-[var(--text-muted)]">điểm</span>
                                        </div>
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-extrabold text-white shadow-lg" style={{ background: TIER.gold.hex }}>
                                            <CrownBadge className="w-5 h-5" />
                                        </div>
                                    </motion.div>

                                    {/* 3rd */}
                                    <motion.div
                                        initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                                        className="flex flex-col items-center gap-2"
                                    >
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold text-white border-2 border-white shadow-lg" style={{ background: TIER.bronze.hex }}>
                                            {leaderboard[2].full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <p className="text-xs font-bold text-[var(--text-secondary)] truncate max-w-20 text-center">{leaderboard[2].full_name.split(' ').pop()}</p>
                                        <div className="w-16 h-16 rounded-t-2xl flex flex-col items-center justify-end pb-2 gap-0.5" style={{ background: TIER.bronze.tint, borderTop: `3px solid ${TIER.bronze.hex}` }}>
                                            <span className="text-lg font-extrabold" style={{ color: TIER.bronze.hex }}>{leaderboard[2].total_points}</span>
                                            <span className="text-[9px] font-bold text-[var(--text-muted)]">điểm</span>
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white" style={{ background: TIER.bronze.hex }}>
                                            <TrophyIcon className="w-4 h-4" />
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {/* List */}
                            <div>
                                {loading ? (
                                    <SkeletonRow count={10} />
                                ) : leaderboard.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                            <Trophy className="w-7 h-7 text-[var(--text-muted)]" />
                                        </div>
                                        <p className="text-sm font-semibold text-[var(--text-secondary)]">Chưa có dữ liệu xếp hạng</p>
                                        <p className="text-xs text-[var(--text-muted)]">Tham gia sự kiện để tích lũy điểm và lên bảng xếp hạng</p>
                                    </div>
                                ) : (
                                    leaderboard.map((entry, i) => (
                                        <div key={entry.user_id} className={i > 0 ? 'border-t border-[var(--border-light)]' : ''}>
                                            <LeaderboardRow
                                                entry={entry}
                                                index={i}
                                                delay={200}
                                                onClick={() => router.push(`/dashboard/training-points`)}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ─── DEPARTMENT LEADERBOARD ─── */}
                    {activeTab === 'department' && isAdmin && (
                        <motion.div
                            key="department"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                            className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]"
                        >
                            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${TIER.green.hex}, ${TIER.navy.hex})` }} />
                            <div className="px-5 pt-5 pb-0 border-b border-[var(--border-light)]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: TIER.green.tint, color: TIER.green.hex }}>
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: TIER.green.hex }}>Department Ranking</p>
                                        <h2 className="text-base font-extrabold text-[var(--text-primary)]">Bảng xếp hạng theo khoa</h2>
                                        <p className="text-xs text-[var(--text-muted)]">Tổng hợp điểm rèn luyện theo từng khoa {selectedSemester ? `(HK ${selectedSemester})` : ''}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats row */}
                            {deptLeaderboard.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 py-4 border-b border-[var(--border-light)]">
                                    <div className="text-center">
                                        <p className="text-2xl font-extrabold text-[var(--text-primary)]">{deptLeaderboard.length}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Khoa</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-extrabold" style={{ color: TIER.green.hex }}>
                                            {deptLeaderboard.reduce((s, d) => s + d.total_points, 0).toLocaleString('vi-VN')}
                                        </p>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Tổng điểm</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-extrabold" style={{ color: TIER.navy.hex }}>
                                            {deptLeaderboard.reduce((s, d) => s + d.unique_participants, 0).toLocaleString('vi-VN')}
                                        </p>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Sinh viên</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-extrabold" style={{ color: TIER.gold.hex }}>
                                            {deptLeaderboard[0]?.department_code || '—'}
                                        </p>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Dẫn đầu</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                {loading ? (
                                    <SkeletonRow count={8} />
                                ) : deptLeaderboard.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                            <Building2 className="w-7 h-7 text-[var(--text-muted)]" />
                                        </div>
                                        <p className="text-sm font-semibold text-[var(--text-secondary)]">Chưa có dữ liệu theo khoa</p>
                                    </div>
                                ) : (
                                    <>
                                        {deptLeaderboard.map((entry, i) => (
                                            <div key={entry.department_id} className={i > 0 ? 'border-t border-[var(--border-light)]' : ''}>
                                                <DepartmentBar entry={entry} maxPoints={maxDeptPoints} delay={i * 80} />
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── BADGE SHOWCASE (All Types) ─── */}
                {myBadges.length > 0 && (
                    <SectionCard
                        label="Collections"
                        title="Bộ sưu tập huy hiệu"
                        subtitle="Tất cả huy hiệu bạn đã đạt được"
                        icon={<Award className="w-5 h-5" />}
                        accent={TIER.purple}
                    >
                        <div className="p-5 space-y-5">
                            {(['streak', 'milestone', 'achievement', 'rank'] as const).map((type) => {
                                const badges = badgeTypeGroups[type];
                                if (badges.length === 0) return null;
                                const typeLabels = { streak: '🔥 Streak', milestone: '⭐ Milestone', achievement: '🏆 Achievement', rank: '👑 Rank' };
                                const typeAccents = { streak: TIER.orange, milestone: TIER.gold, achievement: TIER.green, rank: TIER.purple };
                                return (
                                    <div key={type}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: typeAccents[type].hex }}>
                                                {typeLabels[type]}
                                            </span>
                                            <div className="flex-1 h-px bg-[var(--border-light)]" />
                                            <span className="text-xs font-semibold text-[var(--text-muted)]">{badges.length}</span>
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                            {badges.map((badge) => (
                                                <BadgeCard
                                                    key={badge.id}
                                                    badge={badge}
                                                    size="md"
                                                    onClick={() => setSelectedBadge(badge)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>
                )}

                {/* ─── ADMIN: Info Banner ─── */}
                {!isAdmin && (
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-brand-navy)]/20 bg-[var(--color-brand-navy)]/5 px-5 py-4">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-[var(--color-brand-navy)] mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-[var(--color-brand-navy)]">Xem thêm với tài khoản Admin</p>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">Đăng nhập bằng tài khoản quản trị để xem bảng xếp hạng theo khoa và seed badge mặc định.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── BADGE MODAL ─── */}
            <AnimatePresence>
                {selectedBadge && (
                    <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
