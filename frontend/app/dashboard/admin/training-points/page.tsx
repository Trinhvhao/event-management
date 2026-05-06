'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Award, Users, Calendar, Trophy, Download, FileJson, BarChart3,
    Search, ChevronDown, RefreshCw, Plus, ArrowUpRight, X,
    ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Loader2,
    RotateCcw,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';
import {
    trainingPointsService,
    AwardTrainingPointsPayload,
    ExportTrainingPointsQuery,
    ExportTrainingPointsResponse,
    TrainingPointsStatistics,
    UserTrainingPointsResponse,
    PointsHistoryRecord,
} from '@/services/trainingPointsService';
import { eventService } from '@/services/eventService';
import { adminService } from '@/services/adminService';
import { Event } from '@/types';
import { toast } from 'sonner';

const ACCENT = {
    gold:   { hex: '#F26600', tint: 'rgba(242,102,0,0.10)',  text: '#c45500' },
    navy:   { hex: '#00358F', tint: 'rgba(0,53,143,0.10)',   text: '#00358F' },
    green:  { hex: '#00A651', tint: 'rgba(0,166,81,0.10)',    text: '#007a3d' },
    purple: { hex: '#8b5cf6', tint: 'rgba(139,92,246,0.10)', text: '#7c3aed' },
    red:    { hex: '#dc2626', tint: 'rgba(220,38,38,0.10)',  text: '#b91c1c' },
};

function SectionHeader({ label, title, subtitle, action }: {
    label?: string; title: string; subtitle?: string; action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                {label && (
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-orange)] mb-0.5">{label}</p>
                )}
                <h2 className="text-base font-extrabold text-[var(--text-primary)]">{title}</h2>
                {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
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

// ─── Searchable Dropdown ───────────────────────────────────────────────────────

interface SearchableDropdownProps<T> {
    label: string;
    placeholder: string;
    value: T | null;
    onChange: (item: T | null) => void;
    getItems: (query: string) => Promise<T[]>;
    getLabel: (item: T) => string;
    getSubLabel?: (item: T) => string;
    renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
    loading?: boolean;
    error?: string;
}

function SearchableDropdown<T>({
    label, placeholder, value, onChange, getItems, getLabel, getSubLabel, renderItem, loading, error,
}: SearchableDropdownProps<T>) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<T[]>([]);
    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const loadItems = useCallback(async (q: string) => {
        setFetching(true);
        setFetchError('');
        try {
            const result = await getItems(q);
            setItems(result);
        } catch {
            setFetchError('Không thể tải dữ liệu');
        } finally {
            setFetching(false);
        }
    }, [getItems]);

    const handleOpen = useCallback(async () => {
        if (!open) {
            setOpen(true);
            setQuery('');
            await loadItems('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open, loadItems]);

    const handleClose = useCallback(() => {
        setOpen(false);
        setQuery('');
        setItems([]);
        setFetchError('');
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                handleClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [handleClose]);

    const displayLabel = value ? getLabel(value) : '';
    const displaySub = value && getSubLabel ? getSubLabel(value) : '';

    return (
        <div ref={ref} className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</label>
            <button
                type="button"
                onClick={handleOpen}
                className="h-10 rounded-xl border-2 border-[var(--border-default)] bg-white px-3.5 text-sm font-medium transition-all focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] shadow-[var(--shadow-xs)] flex items-center justify-between gap-2 hover:border-[color-mix(in_srgb,var(--color-brand-navy)_40%,transparent)] text-left"
            >
                {value ? (
                    <div className="flex-1 min-w-0">
                        <p className="truncate text-[var(--text-primary)]">{displayLabel}</p>
                        {displaySub && <p className="text-xs text-[var(--text-muted)] truncate">{displaySub}</p>}
                    </div>
                ) : (
                    <span className="text-[var(--text-muted)]">{placeholder}</span>
                )}
                <ChevronDown className={`w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {(error || fetchError) && (
                <p className="text-xs text-[var(--color-brand-red)]">{error || fetchError}</p>
            )}

            {open && (
                <div className="absolute z-50 mt-1 w-full max-w-xs rounded-xl border-2 border-[var(--border-default)] bg-white shadow-[var(--shadow-xl)] overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-muted)]/50">
                        <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                void loadItems(e.target.value);
                            }}
                            placeholder="Tìm kiếm..."
                            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                        />
                        {fetching && <Loader2 className="w-3.5 h-3.5 text-[var(--text-muted)] animate-spin shrink-0" />}
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                        {items.length === 0 && !fetching && (
                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                <Users className="w-6 h-6 text-[var(--text-muted)]" />
                                <p className="text-xs text-[var(--text-muted)]">Không tìm thấy kết quả</p>
                            </div>
                        )}
                        {items.map((item, i) => {
                            const isSelected = value !== null && getLabel(item) === getLabel(value);
                            return (
                                <button
                                    key={item && typeof item === 'object' && 'id' in item ? (item as { id: number }).id : i}
                                    type="button"
                                    onClick={() => { onChange(item); handleClose(); }}
                                    className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_5%,transparent)] ${isSelected ? 'bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)]' : ''}`}
                                >
                                    {renderItem ? renderItem(item, isSelected) : (
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{getLabel(item)}</p>
                                            {getSubLabel && <p className="text-[11px] text-[var(--text-muted)] truncate">{getSubLabel(item)}</p>}
                                        </div>
                                    )}
                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--color-brand-navy)] shrink-0 mt-0.5" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ currentPage, totalPages, onPageChange }: {
    currentPage: number; totalPages: number; onPageChange: (page: number) => void;
}) {
    const [jumpValue, setJumpValue] = useState('');
    const [showJump, setShowJump] = useState(false);

    if (totalPages <= 1) return null;

    const getPages = (): (number | '...')[] => {
        const pages: (number | '...')[] = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const handleJump = () => {
        const n = parseInt(jumpValue, 10);
        if (Number.isInteger(n) && n >= 1 && n <= totalPages) {
            onPageChange(n);
        }
        setJumpValue('');
        setShowJump(false);
    };

    return (
        <div className="flex items-center gap-1.5">
            <button
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                <ChevronLeft size={14} />
            </button>
            {getPages().map((page, idx) =>
                page === '...' ? (
                    <span key={`dot-${idx}`} className="px-1 text-[var(--text-muted)] text-sm">…</span>
                ) : (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${currentPage === page
                            ? 'bg-[var(--color-brand-navy)] text-white shadow-[var(--shadow-brand)]'
                            : 'border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)]'
                        }`}
                    >
                        {page}
                    </button>
                )
            )}
            <button
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                <ChevronRight size={14} />
            </button>
            {totalPages > 7 && (
                showJump ? (
                    <div className="flex items-center gap-1 ml-1">
                        <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={jumpValue}
                            onChange={(e) => setJumpValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleJump(); if (e.key === 'Escape') { setShowJump(false); setJumpValue(''); } }}
                            autoFocus
                            placeholder={`1–${totalPages}`}
                            className="w-14 h-8 pl-2 pr-1 rounded-lg border-2 border-[var(--color-brand-navy)] bg-white text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                        />
                        <button
                            onClick={handleJump}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--color-brand-navy)] text-white hover:opacity-90 transition-all text-xs font-bold"
                        >
                            <ChevronRight size={12} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowJump(true)}
                        className="ml-1 px-2 h-8 rounded-lg border border-[var(--border-default)] text-[11px] font-semibold text-[var(--text-muted)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all"
                    >
                        → trang
                    </button>
                )
            )}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

// Extend the service response type to match what the backend returns
interface PointsHistoryRecord {
    id: number;
    user_id: number;
    event_id: number;
    points: number;
    semester: string;
    earned_at: string;
    full_name: string;
    student_id: string | null;
    event_title: string;
}

interface PointsHistoryApiResponse {
    records: PointsHistoryRecord[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
}

export default function AdminTrainingPointsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const canManage = user?.role === 'admin' || user?.role === 'organizer';

    // ── Stats ──
    const [loadingStats, setLoadingStats] = useState(true);
    const [stats, setStats] = useState<TrainingPointsStatistics | null>(null);

    // ── Award form ──
    const [selectedUser, setSelectedUser] = useState<{ id: number; full_name: string; student_id: string | null } | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<{ id: number; title: string } | null>(null);
    const [awardPoints, setAwardPoints] = useState('');
    const [awardSemester, setAwardSemester] = useState('');
    const [awarding, setAwarding] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [awardValidation, setAwardValidation] = useState<string | null>(null);

    // ── User lookup ──
    const [selectedUserPoints, setSelectedUserPoints] = useState<UserTrainingPointsResponse | null>(null);
    const [loadingUser, setLoadingUser] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Array<{ user: { id: number; full_name: string; student_id: string | null; email: string }; total_points: number }>>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searchingUser, setSearchingUser] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // ── Export ──
    const [exporting, setExporting] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [exportPreview, setExportPreview] = useState<ExportTrainingPointsResponse | null>(null);
    const [showJson, setShowJson] = useState(false);
    const [showSemesterTable, setShowSemesterTable] = useState(true);

    // ── History table ──
    const [historyFilterSemester, setHistoryFilterSemester] = useState('');
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLimit] = useState(10);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyRecords, setHistoryRecords] = useState<PointsHistoryRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showHistoryExport, setShowHistoryExport] = useState(false);

    const totalHistoryPages = Math.ceil(historyTotal / historyLimit);
    const semesterRows = useMemo(() => stats?.semester_statistics || [], [stats]);

    // Collect all unique semesters from semester_statistics
    const availableSemesters = useMemo(() => {
        return semesterRows.map(r => r.semester).sort((a, b) => b.localeCompare(a));
    }, [semesterRows]);

    const loadStats = useCallback(async () => {
        if (!isAdmin) { setLoadingStats(false); return; }
        try {
            setLoadingStats(true);
            const data = await trainingPointsService.getStatistics();
            setStats(data);
        } catch {
            toast.error('Không thể tải thống kê điểm rèn luyện');
        } finally {
            setLoadingStats(false);
        }
    }, [isAdmin]);

    const loadHistory = useCallback(async (page: number, semester: string) => {
        if (!isAdmin) return;
        try {
            setLoadingHistory(true);
            const params: { semester?: string; limit: number; offset: number } = {
                limit: historyLimit,
                offset: (page - 1) * historyLimit,
            };
            if (semester) params.semester = semester;

            // The endpoint for admin history - use the export endpoint with format=json
            const data = await trainingPointsService.exportPoints(params as unknown as ExportTrainingPointsQuery);
            setHistoryRecords(data.records as unknown as PointsHistoryRecord[]);
            setHistoryTotal(data.total_records);
        } catch {
            toast.error('Không thể tải lịch sử điểm');
        } finally {
            setLoadingHistory(false);
        }
    }, [isAdmin, historyLimit]);

    useEffect(() => {
        if (user?.role && !canManage) { router.push('/dashboard'); return; }
        void loadStats();
        void loadHistory(1, '');
    }, [canManage, loadStats, loadHistory, router, user?.role]);

    useEffect(() => {
        void loadHistory(historyPage, historyFilterSemester);
    }, [historyPage, historyFilterSemester, loadHistory]);

    const fetchUserPoints = async (userId: number) => {
        if (!isAdmin) return;
        try {
            setLoadingUser(true);
            const data = await trainingPointsService.getUserPoints(userId);
            setSelectedUserPoints(data);
        } catch {
            toast.error('Không thể tải điểm của người dùng này');
        } finally {
            setLoadingUser(false);
        }
    };

    const debouncedSearch = useCallback(async (query: string) => {
        if (!isAdmin || query.length < 2) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }
        try {
            setSearchingUser(true);
            const data = await trainingPointsService.getStatistics();
            const users = (data.top_users || []).filter(u =>
                u.user.full_name.toLowerCase().includes(query.toLowerCase()) ||
                (u.user.student_id || '').toLowerCase().includes(query.toLowerCase())
            );
            setSearchResults(users);
            setShowSearchDropdown(true);
        } catch {
            setSearchResults([]);
        } finally {
            setSearchingUser(false);
        }
    }, [isAdmin]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const parseInt2 = (v: string) => {
        const n = parseInt(v, 10);
        return Number.isInteger(n) && n > 0 ? n : undefined;
    };

    // ── Award validation ──
    const validateAward = (): string | null => {
        if (!selectedUser) return 'Vui lòng chọn sinh viên';
        if (!selectedEvent) return 'Vui lòng chọn sự kiện';
        const pts = awardPoints ? parseInt2(awardPoints) : null;
        if (pts !== null && (pts <= 0 || pts > 100)) return 'Điểm phải từ 1 đến 100';
        return null;
    };

    const handleAwardClick = () => {
        const err = validateAward();
        setAwardValidation(err);
        if (!err) setShowConfirm(true);
    };

    const handleAward = async () => {
        if (!selectedUser || !selectedEvent) return;
        const uid = selectedUser.id;
        const eid = selectedEvent.id;
        const pts = awardPoints ? parseInt2(awardPoints) : undefined;
        const payload: AwardTrainingPointsPayload = {
            user_id: uid,
            event_id: eid,
            points: pts,
            semester: awardSemester || undefined,
        };
        try {
            setAwarding(true);
            const r = await trainingPointsService.awardPoints(payload);
            toast.success(`Đã cộng ${r.points} điểm cho ${r.user.full_name}`);
            setSelectedUser(null);
            setSelectedEvent(null);
            setAwardPoints('');
            setAwardSemester('');
            setAwardValidation(null);
            if (isAdmin) {
                void loadStats();
                void fetchUserPoints(r.user_id);
                void loadHistory(historyPage, historyFilterSemester);
            }
        } catch {
            toast.error('Không thể cộng điểm rèn luyện');
        } finally {
            setAwarding(false);
        }
    };

    const buildParams = (): ExportTrainingPointsQuery | null => {
        try {
            return {
                semester: historyFilterSemester || undefined,
            };
        } catch {
            toast.error('Bộ lọc export không hợp lệ');
            return null;
        }
    };

    const handleExportCsv = async () => {
        const p = buildParams();
        if (!p) return;
        try {
            setExporting(true);
            const blob = await trainingPointsService.exportPointsCsv(p);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `training-points-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Đã xuất báo cáo CSV');
        } catch {
            toast.error('Không thể xuất báo cáo CSV');
        } finally {
            setExporting(false);
        }
    };

    const handlePreviewJson = async () => {
        const p = buildParams();
        if (!p) return;
        try {
            setPreviewing(true);
            const data = await trainingPointsService.exportPoints(p);
            setExportPreview(data);
            setShowJson(true);
            toast.success('Đã tải dữ liệu JSON');
        } catch {
            toast.error('Không thể tải dữ liệu JSON export');
        } finally {
            setPreviewing(false);
        }
    };

    // ── Dropdown data fetchers ──
    const loadStudents = async (query: string) => {
        const result = await adminService.getUsers({ limit: 100, role: 'student', search: query });
        return (result.data?.items || result.data || []) as Array<{ id: number; full_name: string; student_id: string | null }>;
    };

    const loadEvents = async (query: string) => {
        const result = await eventService.getAll({ limit: 100, status: 'completed', search: query });
        return (result.data?.items || result.data || []) as Event[];
    };

    // ── Award confirm description ──
    const confirmDescription = useMemo(() => {
        const parts: string[] = [];
        if (selectedUser) parts.push(`Sinh viên: **${selectedUser.full_name}**${selectedUser.student_id ? ` (${selectedUser.student_id})` : ''}`);
        if (selectedEvent) parts.push(`Sự kiện: **${selectedEvent.title}**`);
        const pts = awardPoints ? parseInt2(awardPoints) : null;
        parts.push(`Điểm: **${pts !== null ? pts : 'mặc định sự kiện'}**`);
        if (awardSemester) parts.push(`Học kỳ: **${awardSemester}**`);
        return parts.join('\n\n');
    }, [selectedUser, selectedEvent, awardPoints, awardSemester]);

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
                                    <Award className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Training Points</p>
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
                                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-2">{label}</p>
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

                {/* ─── TOP 5 LEADERBOARD ─── */}
                {isAdmin && (
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.purple.hex }} />
                        <div className="px-5 pt-5 pb-0 border-b border-[var(--border-light)]">
                            <SectionHeader
                                label="Leaderboard"
                                title="Top 5 sinh viên điểm cao nhất"
                                subtitle={loadingStats ? 'Đang tải...' : `${(stats?.top_users || []).length} sinh viên trong bảng xếp hạng`}
                                action={<Trophy className="w-5 h-5" style={{ color: ACCENT.gold.hex }} />}
                            />
                        </div>
                        <div className="p-5">
                            {(stats?.top_users || []).length === 0 && !loadingStats ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                        <Trophy className="w-7 h-7 text-[var(--text-muted)]" />
                                    </div>
                                    <p className="text-sm font-semibold text-[var(--text-secondary)]">Chưa có dữ liệu sinh viên</p>
                                    <p className="text-xs text-[var(--text-muted)]">Cộng điểm cho sinh viên để xem bảng xếp hạng</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                    {(stats?.top_users || []).slice(0, 5).map((row, i) => {
                                        const info = row.user;
                                        const rankColors = [ACCENT.gold.hex, '#94a3b8', '#cd7f32'];
                                        return (
                                            <button
                                                key={`${info?.id || i}`}
                                                onClick={() => info?.id && void fetchUserPoints(info.id)}
                                                disabled={!info?.id}
                                                className="relative flex items-center gap-3 rounded-xl border border-[var(--border-default)] p-3.5 hover:border-[color-mix(in_srgb,var(--color-brand-navy)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left group cursor-pointer active:scale-[0.98]"
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0 ${i < 3 ? '' : 'bg-[var(--bg-muted)] text-[var(--text-muted)]'}`} style={i < 3 ? { background: rankColors[i] } : {}}>
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--color-brand-navy)] transition-colors">{info?.full_name || '—'}</p>
                                                    <p className="text-[11px] text-[var(--text-muted)] truncate">{info?.student_id || info?.email || '—'}</p>
                                                </div>
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

                {/* ─── AWARD FORM ─── */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.gold.hex }} />
                    <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                        <SectionHeader
                            label="Actions"
                            title="Cộng điểm thủ công"
                            subtitle="Yêu cầu sinh viên đã check-in sự kiện — tối đa 100 điểm/sự kiện"
                            action={<div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT.gold.tint, color: ACCENT.gold.hex }}><Plus className="w-4 h-4" /></div>}
                        />
                    </div>
                    <div className="p-5">
                        {/* User & Event dropdowns side by side */}
                        <div className="relative">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {/* Student Dropdown */}
                                <SearchableDropdown
                                    label="Sinh viên"
                                    placeholder="Chọn sinh viên..."
                                    value={selectedUser}
                                    onChange={(item) => setSelectedUser(item as typeof selectedUser)}
                                    getItems={loadStudents}
                                    getLabel={(item) => item.full_name}
                                    getSubLabel={(item) => item.student_id || ''}
                                    error={awardValidation && selectedUser === null ? awardValidation : undefined}
                                />

                                {/* Event Dropdown */}
                                <SearchableDropdown
                                    label="Sự kiện"
                                    placeholder="Chọn sự kiện (đã hoàn thành)..."
                                    value={selectedEvent}
                                    onChange={(item) => setSelectedEvent(item as typeof selectedEvent)}
                                    getItems={loadEvents}
                                    getLabel={(item) => item.title}
                                    error={awardValidation && selectedEvent === null ? awardValidation : undefined}
                                />
                            </div>
                        </div>

                        {/* Points & Semester */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                                    Điểm (tùy chọn, tối đa 100)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={awardPoints}
                                    onChange={(e) => {
                                        setAwardPoints(e.target.value);
                                        setAwardValidation(null);
                                    }}
                                    placeholder="Để trống = điểm mặc định của sự kiện"
                                    className={`h-10 rounded-xl border-2 bg-white px-3.5 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:outline-none focus:ring-4 shadow-[var(--shadow-xs)] ${awardValidation && parseInt2(awardPoints) !== null && (parseInt2(awardPoints)! <= 0 || parseInt2(awardPoints)! > 100)
                                        ? 'border-[var(--color-brand-red)] focus:border-[var(--color-brand-red)] focus:ring-[color-mix(in_srgb,var(--color-brand-red)_8%,transparent)]'
                                        : 'border-[var(--border-default)] focus:border-[var(--color-brand-navy)] focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)]'
                                    }`}
                                />
                                {parseInt2(awardPoints) !== null && (parseInt2(awardPoints)! <= 0 || parseInt2(awardPoints)! > 100) && (
                                    <p className="text-xs text-[var(--color-brand-red)]">Điểm phải từ 1 đến 100</p>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Học kỳ (tùy chọn)</label>
                                <input
                                    type="text"
                                    value={awardSemester}
                                    onChange={(e) => setAwardSemester(e.target.value)}
                                    placeholder="VD: 2024-1"
                                    className="h-10 rounded-xl border-2 border-[var(--border-default)] bg-white px-3.5 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] shadow-[var(--shadow-xs)]"
                                />
                            </div>
                        </div>

                        {/* Validation message */}
                        {awardValidation && (
                            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-red)_8%,transparent)] border border-[color-mix(in_srgb,var(--color-brand-red)_20%,transparent)]">
                                <AlertCircle className="w-4 h-4 text-[var(--color-brand-red)] shrink-0" />
                                <p className="text-xs font-semibold text-[var(--color-brand-red)]">{awardValidation}</p>
                            </div>
                        )}

                        <PrimaryButton onClick={handleAwardClick} loading={awarding} icon={<Plus className="w-4 h-4" />} className="w-full">
                            Cộng điểm
                        </PrimaryButton>
                    </div>
                </div>

                {/* ─── USER LOOKUP ─── */}
                {isAdmin && (
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.green.hex }} />
                        <div className="px-5 pt-5 pb-4 border-b border-[var(--border-light)]">
                            <SectionHeader
                                label="Lookup"
                                title="Tra cứu điểm sinh viên"
                                subtitle="Tìm theo tên hoặc mã sinh viên để xem chi tiết"
                                action={<Search className="w-5 h-5" style={{ color: ACCENT.green.hex }} />}
                            />
                        </div>
                        <div className="p-5 space-y-4">

                            {/* ── Search bar ── */}
                            <div className="relative" ref={(el) => { searchRef.current = el; }}>
                                <div className="relative flex items-center">
                                    <Search className="absolute left-3.5 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            void debouncedSearch(e.target.value);
                                        }}
                                        onFocus={() => {
                                            if (searchQuery.length > 0) setShowSearchDropdown(true);
                                        }}
                                        placeholder="Tìm theo tên hoặc mã sinh viên..."
                                        className="w-full h-10 pl-10 pr-10 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] shadow-[var(--shadow-xs)]"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                setSearchResults([]);
                                                setShowSearchDropdown(false);
                                                setSelectedUserPoints(null);
                                            }}
                                            className="absolute right-3 w-5 h-5 rounded-full bg-[var(--bg-muted)] flex items-center justify-center hover:bg-[var(--border-default)] transition-colors"
                                        >
                                            <X className="w-3 h-3 text-[var(--text-muted)]" />
                                        </button>
                                    )}
                                    {searchingUser && (
                                        <Loader2 className="absolute right-3 w-4 h-4 text-[var(--text-muted)] animate-spin" />
                                    )}
                                </div>

                                {/* Search results dropdown */}
                                {showSearchDropdown && searchQuery.length > 0 && (
                                    <div className="absolute z-50 mt-1.5 w-full rounded-xl border-2 border-[var(--border-default)] bg-white shadow-[var(--shadow-xl)] overflow-hidden">
                                        {searchResults.length === 0 && !searchingUser ? (
                                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                                <Users className="w-6 h-6 text-[var(--text-muted)]" />
                                                <p className="text-xs text-[var(--text-muted)]">Không tìm thấy sinh viên</p>
                                            </div>
                                        ) : (
                                            <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-light)]">
                                                {searchResults.map((r) => {
                                                    const info = r.user;
                                                    return (
                                                        <button
                                                            key={info.id}
                                                            onClick={() => {
                                                                void fetchUserPoints(info.id);
                                                                setShowSearchDropdown(false);
                                                                setSearchQuery('');
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_4%,transparent)] transition-colors flex items-center gap-3"
                                                        >
                                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-extrabold text-white" style={{ background: ACCENT.navy.hex }}>
                                                                {info.full_name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{info.full_name}</p>
                                                                <p className="text-[11px] text-[var(--text-muted)]">{info.student_id || info.email || `ID: ${info.id}`}</p>
                                                            </div>
                                                            <div className="shrink-0 text-right">
                                                                <p className="text-sm font-extrabold" style={{ color: ACCENT.gold.hex }}>{r.total_points}</p>
                                                                <p className="text-[10px] font-semibold text-[var(--text-muted)]">điểm</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── Detail card (shown when a student is selected) ── */}
                            {selectedUserPoints ? (
                                <div className="border border-[var(--border-default)] rounded-xl overflow-hidden">
                                    <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-default)] bg-[var(--bg-muted)]/30">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-extrabold text-white" style={{ background: ACCENT.navy.hex }}>
                                            {selectedUserPoints.user.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-bold text-[var(--text-primary)]">{selectedUserPoints.user.full_name}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{selectedUserPoints.user.student_id || selectedUserPoints.user.email || `ID: ${selectedUserPoints.user.id}`}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedUserPoints(null)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-brand-red)]/30 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-brand-red)] hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] transition-colors shrink-0"
                                        >
                                            <X className="w-3 h-3" />
                                            Đóng
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 divide-x divide-[var(--border-default)]">
                                        <div className="px-5 py-4">
                                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">Tổng điểm</p>
                                            <p className="text-3xl font-extrabold" style={{ color: ACCENT.gold.hex }}>{selectedUserPoints.grand_total.toLocaleString('vi-VN')}</p>
                                        </div>
                                        <div className="px-5 py-4">
                                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">Sự kiện đã tham gia</p>
                                            <p className="text-3xl font-extrabold text-[var(--text-primary)]">{selectedUserPoints.total_events}</p>
                                        </div>
                                    </div>

                                    {selectedUserPoints.semesters.length > 0 && (
                                        <div className="px-5 py-4 border-t border-[var(--border-default)] bg-[var(--bg-muted)]/20">
                                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-3">Điểm theo học kỳ</p>
                                            <div className="space-y-2">
                                                {selectedUserPoints.semesters.map((s) => (
                                                    <div key={s.semester} className="flex items-center justify-between py-2 border-b border-[var(--border-light)] last:border-0">
                                                        <span className="text-sm font-semibold text-[var(--text-secondary)]">{s.semester}</span>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-24 h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full" style={{
                                                                    width: `${selectedUserPoints.grand_total > 0 ? Math.round((s.total_points / selectedUserPoints.grand_total) * 100) : 0}%`,
                                                                    background: ACCENT.green.hex,
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
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 gap-3 border-2 border-dashed border-[var(--border-default)] rounded-xl">
                                    <div className="w-12 h-12 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                        <Users className="w-6 h-6 text-[var(--text-muted)]" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-[var(--text-secondary)]">Chưa chọn sinh viên</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">Tìm và chọn sinh viên bên trên để xem chi tiết điểm</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── POINTS HISTORY TABLE ─── */}
                {isAdmin && (
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: ACCENT.navy.hex }} />
                        <div className="px-4 pt-4 pb-3 border-b border-[var(--border-light)]">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Lịch sử điểm rèn luyện</h3>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--bg-muted)] text-[var(--text-muted)]">{historyTotal.toLocaleString('vi-VN')} bản ghi</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={historyFilterSemester}
                                        onChange={(e) => {
                                            setHistoryFilterSemester(e.target.value);
                                            setHistoryPage(1);
                                        }}
                                        className="h-8 pl-3 pr-7 rounded-lg border border-[var(--border-default)] bg-white text-[11px] font-medium text-[var(--text-secondary)] transition-all focus:outline-none focus:border-[var(--color-brand-navy)] cursor-pointer"
                                    >
                                        <option value="">Tất cả HK</option>
                                        {availableSemesters.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    {historyFilterSemester && (
                                        <button
                                            onClick={() => { setHistoryFilterSemester(''); setHistoryPage(1); }}
                                            className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-[var(--color-brand-red)]/30 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] text-[var(--color-brand-red)] hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] transition-colors"
                                            title="Xóa lọc học kỳ"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => void loadHistory(historyPage, historyFilterSemester)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all disabled:opacity-40"
                                        disabled={loadingHistory}
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={handleExportCsv}
                                        disabled={exporting}
                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--border-default)] bg-white text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all disabled:opacity-50"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-[var(--border-default)]">
                            <div className="overflow-x-auto" style={{ maxHeight: '480px' }}>
                                <table className="w-full text-sm">
                                    <thead className="bg-[var(--bg-muted)] sticky top-0 z-10 shadow-[var(--shadow-xs)]">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Sinh viên</th>
                                            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Sự kiện</th>
                                            <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Điểm</th>
                                            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Học kỳ</th>
                                            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Ngày</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-light)]">
                                        {loadingHistory ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <tr key={i}>
                                                    {Array.from({ length: 5 }).map((__, j) => (
                                                        <td key={j} className="px-4 py-2.5">
                                                            <div className="h-3.5 w-20 rounded animate-pulse bg-[var(--bg-muted)]" />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : historyRecords.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Award className="w-7 h-7 text-[var(--text-muted)]" />
                                                        <p className="text-sm text-[var(--text-muted)]">Chưa có bản ghi điểm rèn luyện</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            historyRecords.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className="hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors cursor-pointer"
                                                    onClick={() => row.user_id && void fetchUserPoints(row.user_id)}
                                                >
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-[var(--text-primary)]">{row.full_name}</span>
                                                            <span className="text-[11px] text-[var(--text-muted)]">{row.student_id || '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="text-sm text-[var(--text-secondary)] truncate max-w-xs block">{row.event_title}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className="text-base font-extrabold" style={{ color: ACCENT.gold.hex }}>{row.points}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: ACCENT.navy.tint, color: ACCENT.navy.hex }}>
                                                            {row.semester}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">
                                                        {new Date(row.earned_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination footer */}
                            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-muted)]/20">
                                <p className="text-xs text-[var(--text-muted)]">
                                    Hiển thị <span className="font-semibold text-[var(--text-secondary)]">{historyRecords.length}</span> / <span className="font-semibold text-[var(--text-secondary)]">{historyTotal.toLocaleString('vi-VN')}</span> bản ghi
                                </p>
                                <Pagination currentPage={historyPage} totalPages={totalHistoryPages} onPageChange={setHistoryPage} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── JSON PREVIEW ─── */}
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
                                            <p className="text-xs text-[var(--text-muted)] mt-1">Bấm "Xem JSON" để tải dữ liệu theo bộ lọc</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {[
                                                { label: 'Tổng bản ghi', value: exportPreview.total_records.toLocaleString('vi-VN'), accent: ACCENT.navy },
                                                { label: 'Tổng điểm', value: exportPreview.total_points.toLocaleString('vi-VN'), accent: ACCENT.gold },
                                                { label: 'Phạm vi dữ liệu', value: exportPreview.filters.scope, accent: ACCENT.green },
                                            ].map(({ label, value, accent }) => (
                                                <div key={label} className="rounded-xl border border-[var(--border-default)] p-4">
                                                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-1">{label}</p>
                                                    <p className="text-xl font-extrabold" style={{ color: accent.hex }}>{value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-[var(--bg-muted)]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Người dùng</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Sự kiện</th>
                                                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Điểm</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Học kỳ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[var(--border-light)]">
                                                        {(exportPreview.records || []).slice(0, 10).map((row) => (
                                                            <tr key={row.id} className="hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors">
                                                                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{row.full_name}</td>
                                                                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{row.event_title}</td>
                                                                <td className="px-4 py-3 text-right font-bold" style={{ color: ACCENT.gold.hex }}>{row.points}</td>
                                                                <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{row.semester}</td>
                                                            </tr>
                                                        ))}
                                                        {(exportPreview.records || []).length === 0 && (
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
                                                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Học kỳ</th>
                                                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Tổng điểm</th>
                                                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Số sự kiện</th>
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

            {/* ─── CONFIRM DIALOG ─── */}
            <ConfirmDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleAward}
                title="Xác nhận cộng điểm rèn luyện"
                description={confirmDescription}
                confirmText="Cộng điểm"
                loading={awarding}
            />
        </DashboardLayout>
    );
}
