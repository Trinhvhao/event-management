'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useEvents } from '@/hooks/useEvents';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  CalendarDays,
  Sparkles,
  X,
  Users,
  Ticket,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInDays,
  endOfMonth,
  endOfWeek,
  format,
  getHours,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
  getDay,
  isToday,
  differenceInHours,
  differenceInMinutes,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Event } from '@/types';

type CalendarMode = 'month' | 'week';

// ─── Category color palette ───────────────────────────────────────────
const CATEGORY_COLORS = [
  { bg: 'bg-blue-500',   light: 'bg-blue-100 text-blue-700',   border: 'border-blue-400' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-400' },
  { bg: 'bg-orange-500', light: 'bg-orange-100 text-orange-700', border: 'border-orange-400' },
  { bg: 'bg-purple-500', light: 'bg-purple-100 text-purple-700', border: 'border-purple-400' },
  { bg: 'bg-pink-500',   light: 'bg-pink-100 text-pink-700',   border: 'border-pink-400' },
  { bg: 'bg-cyan-500',   light: 'bg-cyan-100 text-cyan-700',   border: 'border-cyan-400' },
  { bg: 'bg-amber-500',  light: 'bg-amber-100 text-amber-700', border: 'border-amber-400' },
  { bg: 'bg-rose-500',   light: 'bg-rose-100 text-rose-700',   border: 'border-rose-400' },
];

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 - 22:00

function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function getCategoryColor(categoryId: number | undefined): { bg: string; light: string; border: string } {
  if (!categoryId) return CATEGORY_COLORS[0];
  return CATEGORY_COLORS[(categoryId - 1) % CATEGORY_COLORS.length];
}

// ─── Event Preview Tooltip ────────────────────────────────────────────
function EventPreviewTooltip({ event, anchorRef }: { event: Event; anchorRef: React.RefObject<HTMLElement | null> }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const color = getCategoryColor(event.category_id);

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const scrollTop = window.scrollY;
      const scrollLeft = window.scrollX;
      let top = rect.top + scrollTop + rect.height + 8;
      let left = rect.left + scrollLeft + rect.width / 2;

      // Keep within viewport
      const previewWidth = 320;
      if (left - previewWidth / 2 < 8) left = previewWidth / 2 + 8;
      if (left + previewWidth / 2 > window.innerWidth - 8) left = window.innerWidth - previewWidth / 2 - 8;

      setPos({ top, left });
    }
  }, [anchorRef]);

  const duration = format(parseISO(event.start_time), 'HH:mm', { locale: vi }) +
    ' – ' + format(parseISO(event.end_time), 'HH:mm', { locale: vi });

  return createPortal(
    <div
      className="fixed z-[9999] w-[320px] bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-xl)] overflow-hidden pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
    >
      {/* Color accent bar */}
      <div className={`h-1.5 ${color.bg}`} />
      <div className="p-4">
        {/* Title */}
        <p className="font-bold text-[var(--text-primary)] text-sm leading-tight mb-3">
          {event.title}
        </p>

        {/* Meta grid */}
        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
            <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{format(parseISO(event.start_time), 'EEEE, dd/MM/yyyy', { locale: vi })}</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{duration}</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-light)]">
          <div className="flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)]">
            <Users className="w-3 h-3" />
            <span>{event.current_registrations || 0}/{event.capacity}</span>
          </div>
          {Number(event.event_cost) > 0 ? (
            <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-brand-orange)]">
              <Ticket className="w-3 h-3" />
              <span>{new Intl.NumberFormat('vi-VN').format(Number(event.event_cost))}đ</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-emerald-600">Miễn phí</span>
          )}
          <div className="ml-auto flex items-center gap-1 text-xs font-bold text-[var(--color-brand-gold)]">
            <Star className="w-3 h-3" />
            <span>+{event.training_points} ĐRL</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function EventsCalendarPage() {
  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursorDate, setCursorDate] = useState(new Date());
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);
  const hoveredEventRef = useRef<HTMLAnchorElement | null>(null);
  const { events, loading } = useEvents({ limit: 200, status: 'upcoming' });

  const safeEvents = useMemo<Event[]>(() => {
    return Array.isArray(events) ? events : [];
  }, [events]);

  const eventMap = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of safeEvents) {
      if (!event?.start_time || !event?.id) continue;
      const key = toDateKey(parseISO(event.start_time));
      const arr = map.get(key) || [];
      arr.push(event);
      map.set(key, arr);
    }
    for (const [key, list] of map.entries()) {
      map.set(key, list.sort((a, b) =>
        parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
      ));
    }
    return map;
  }, [safeEvents]);

  const weekHourMap = useMemo(() => {
    const map = new Map<string, Map<number, Event[]>>();
    for (const event of safeEvents) {
      if (!event?.start_time || !event?.id) continue;
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      const dayKey = toDateKey(start);
      if (!map.has(dayKey)) map.set(dayKey, new Map());
      const hourMap = map.get(dayKey)!;
      let h = getHours(start);
      const endH = getHours(end);
      while (h <= endH) {
        const arr = hourMap.get(h) || [];
        arr.push(event);
        hourMap.set(h, arr);
        h++;
      }
    }
    return map;
  }, [safeEvents]);

  const days = useMemo(() => {
    if (mode === 'week') {
      const start = startOfWeek(cursorDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const monthStart = startOfMonth(cursorDate);
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const result: Date[] = [];
    let cur = gridStart;
    while (cur <= gridEnd) {
      result.push(cur);
      cur = addDays(cur, 1);
    }
    return result;
  }, [mode, cursorDate]);

  // ── Heatmap: max events in current view ──────────────────────────
  const heatmapMax = useMemo(() => {
    let max = 1;
    for (const day of days) {
      const count = (eventMap.get(toDateKey(day)) || []).length;
      if (count > max) max = count;
    }
    return max;
  }, [days, eventMap]);

  const getHeatmapIntensity = (count: number): string => {
    if (count === 0) return '';
    const intensity = Math.min(count / heatmapMax, 1);
    if (intensity >= 0.75) return 'bg-[var(--color-brand-navy)]/20';
    if (intensity >= 0.5)  return 'bg-[var(--color-brand-navy)]/12';
    if (intensity >= 0.25) return 'bg-[var(--color-brand-navy)]/6';
    return 'bg-[var(--color-brand-navy)]/3';
  };

  const periodLabel = useMemo(() => {
    if (mode === 'week') {
      const start = startOfWeek(cursorDate, { weekStartsOn: 1 });
      const end = endOfWeek(cursorDate, { weekStartsOn: 1 });
      return `${format(start, 'dd/MM', { locale: vi })} – ${format(end, 'dd/MM/yyyy', { locale: vi })}`;
    }
    return format(cursorDate, 'MMMM yyyy', { locale: vi });
  }, [mode, cursorDate]);

  const goPrev = () => {
    setCursorDate((prev) => mode === 'week' ? subWeeks(prev, 1) : subMonths(prev, 1));
  };

  const goNext = () => {
    setCursorDate((prev) => mode === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1));
  };

  const goToday = () => {
    setCursorDate(new Date());
  };

  const today = new Date();

  // Quick stats
  const stats = useMemo(() => {
    const now = new Date();
    const sw = startOfWeek(now, { weekStartsOn: 1 });
    const ew = endOfWeek(now, { weekStartsOn: 1 });
    const sm = startOfMonth(now);
    const em = endOfMonth(now);
    let todayC = 0, weekC = 0, monthC = 0;
    for (const e of safeEvents) {
      if (!e?.start_time) continue;
      const d = parseISO(e.start_time);
      if (isSameDay(d, now)) todayC++;
      if (d >= sw && d <= ew) weekC++;
      if (d >= sm && d <= em) monthC++;
    }
    return { todayC, weekC, monthC };
  }, [safeEvents]);

  const getEventStyle = (event: Event) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const startH = getHours(start);
    const startM = start.getMinutes();
    const endH = getHours(end);
    const endM = end.getMinutes();
    const top = ((startH - 7) * 60 + startM);
    const duration = ((endH - startH) * 60 + (endM - startM));
    return { top: `${top}px`, height: `${Math.max(duration, 30)}px` };
  };

  // Find hovered event for tooltip
  const hoveredEvent = useMemo(() => {
    if (!hoveredEventId) return null;
    return safeEvents.find(e => e.id === hoveredEventId) || null;
  }, [hoveredEventId, safeEvents]);

  // Highlighted events in list (from calendar selection)
  const highlightedEvents = useMemo(() => {
    if (selectedEventId === null) return new Set<number>();
    const event = safeEvents.find(e => e.id === selectedEventId);
    if (!event) return new Set<number>();
    return new Set([selectedEventId]);
  }, [selectedEventId, safeEvents]);

  // Close preview on scroll
  useEffect(() => {
    const handler = () => setHoveredEventId(null);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-screen-2xl mx-auto">

        {/* ── PAGE HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[var(--color-brand-navy)] opacity-[0.03] pointer-events-none" />
          <div className="px-6 pt-6 pb-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)] shrink-0">
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">Events</p>
                  <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">Lịch sự kiện</h1>
                  <p className="text-sm text-[var(--text-muted)]">Xem lịch trình sự kiện theo tháng hoặc tuần</p>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden xl:flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
                  <Calendar className="w-3.5 h-3.5 text-[var(--color-brand-navy)]" />
                  <span className="text-xs font-bold text-[var(--color-brand-navy)]">{stats.todayC} hôm nay</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand-orange)]" />
                  <span className="text-xs font-bold text-[var(--color-brand-orange)]">{stats.weekC} tuần này</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100">
                  <Star className="w-3.5 h-3.5 text-[var(--color-brand-gold)]" />
                  <span className="text-xs font-bold text-amber-600">{stats.monthC} tháng này</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl border border-[var(--border-default)] p-1 bg-[var(--bg-muted)]">
                  <button onClick={() => setMode('month')} className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${mode === 'month' ? 'bg-white text-[var(--color-brand-navy)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
                    Tháng
                  </button>
                  <button onClick={() => setMode('week')} className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${mode === 'week' ? 'bg-white text-[var(--color-brand-navy)] shadow-[var(--shadow-xs)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
                    Tuần
                  </button>
                </div>

                <button onClick={goToday} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-[var(--color-brand-navy)] text-[var(--color-brand-navy)] text-xs font-bold hover:bg-[var(--color-brand-navy)] hover:text-white transition-all duration-200">
                  Hôm nay
                </button>

                <button onClick={goPrev} className="p-2 rounded-xl border-2 border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all duration-200" aria-label="Trước">
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-sm font-bold text-[var(--text-primary)] min-w-[160px] text-center">
                  {periodLabel}
                </span>

                <button onClick={goNext} className="p-2 rounded-xl border-2 border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all duration-200" aria-label="Sau">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── CALENDAR GRID (MONTH VIEW) ── */}
        {mode === 'month' && (
          <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
            {/* Weekday labels */}
            <div className="grid grid-cols-7 border-b border-[var(--border-light)]">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={label} className={`px-3 py-3 text-center text-xs font-bold uppercase tracking-wider ${i === 6 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                  {label}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = toDateKey(day);
                const dayEvents = eventMap.get(key) || [];
                const muted = !isSameMonth(day, cursorDate);
                const todayCell = isSameDay(day, today);
                const weekend = day.getDay() === 0;
                const heatIntensity = getHeatmapIntensity(dayEvents.length);

                return (
                  <div
                    key={key}
                    className={`
                      min-h-[120px] md:min-h-[140px] p-2 border-b border-r border-[var(--border-light)]
                      transition-colors duration-150
                      ${todayCell ? 'bg-[var(--color-brand-light)]/30 ring-2 ring-[var(--color-brand-navy)] ring-inset' : muted ? 'bg-[var(--bg-muted)]/50' : 'bg-white hover:bg-[var(--bg-muted)]/30'}
                      ${weekend && !todayCell ? 'bg-red-50/20' : ''}
                      ${!todayCell && !weekend && heatIntensity ? heatIntensity : ''}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`
                        w-7 h-7 flex items-center justify-center text-xs font-bold rounded-full
                        ${todayCell ? 'bg-[var(--color-brand-navy)] text-white shadow-[var(--shadow-brand)]' : ''}
                        ${weekend && !todayCell ? 'text-red-500' : ''}
                        ${!todayCell && muted ? 'text-gray-400' : ''}
                        ${!todayCell && !weekend && !muted ? 'text-[var(--text-secondary)]' : ''}
                      `}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${todayCell ? 'bg-[var(--color-brand-navy)] text-white' : 'bg-[var(--color-brand-navy)] text-white'}`}>
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Events */}
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => {
                        const color = getCategoryColor(event.category_id);
                        const isSelected = selectedEventId === event.id;
                        return (
                          <Link
                            key={event.id}
                            href={`/dashboard/events/${event.id}`}
                            ref={(el) => { if (hoveredEventId === event.id) hoveredEventRef.current = el; }}
                            onMouseEnter={() => setHoveredEventId(event.id)}
                            onMouseLeave={() => setHoveredEventId(null)}
                            onClick={() => setSelectedEventId(event.id)}
                            className={`
                              group flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-[10px] leading-tight font-semibold truncate transition-all duration-150
                              ${isSelected ? 'ring-2 ring-[var(--color-brand-orange)] shadow-md' : 'hover:shadow-sm'}
                            `}
                            style={{ backgroundColor: `color-mix(in srgb, ${color.bg.replace('bg-', '')} 18%, transparent)`, color: `color-mix(in srgb, ${color.bg.replace('bg-', '')} 80%, #050608)` }}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.bg}`} />
                            <span>{format(parseISO(event.start_time), 'HH:mm')}</span>
                            <span className="truncate">{event.title}</span>
                          </Link>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-[var(--text-muted)] font-medium px-1 leading-none">
                          +{dayEvents.length - 3} sự kiện
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── WEEK VIEW WITH TIME SLOTS ── */}
        {mode === 'week' && (
          <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-[var(--border-light)]">
              <div className="w-16 shrink-0" />
              {days.map((day) => {
                const todayCell = isSameDay(day, today);
                const weekend = day.getDay() === 0;
                const dayKey = toDateKey(day);
                const dayCount = (eventMap.get(dayKey) || []).length;
                return (
                  <div
                    key={dayKey}
                    className={`py-3 text-center border-l border-[var(--border-light)] ${todayCell ? 'bg-[var(--color-brand-light)]/20' : ''} ${weekend ? 'bg-red-50/30' : ''}`}
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${weekend ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
                      {WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                    </p>
                    <div className="relative mt-1">
                      {todayCell ? (
                        <div className="w-8 h-8 rounded-full bg-[var(--color-brand-navy)] text-white flex items-center justify-center mx-auto shadow-[var(--shadow-brand)]">
                          <span className="text-lg font-extrabold">{format(day, 'd')}</span>
                        </div>
                      ) : (
                        <span className={`text-lg font-extrabold ${weekend ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                          {format(day, 'd')}
                        </span>
                      )}
                      {dayCount > 0 && (
                        <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${todayCell ? 'bg-white text-[var(--color-brand-navy)] border border-[var(--color-brand-navy)]' : 'bg-[var(--color-brand-orange)] text-white'}`}>
                          {dayCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="overflow-y-auto max-h-[600px]">
              <div className="grid grid-cols-8 relative">
                {/* Time labels */}
                <div className="w-16 shrink-0">
                  {HOURS.map((h) => (
                    <div key={h} className="h-[60px] pr-2 flex items-start justify-end">
                      <span className="text-[10px] font-semibold text-[var(--text-muted)] -mt-2">
                        {h.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {days.map((day) => {
                  const dayKey = toDateKey(day);
                  const todayCell = isSameDay(day, today);
                  const weekend = day.getDay() === 0;
                  const dayEvents = eventMap.get(dayKey) || [];

                  return (
                    <div
                      key={dayKey}
                      className={`relative border-l border-[var(--border-light)] ${todayCell ? 'bg-[var(--color-brand-light)]/10' : ''} ${weekend ? 'bg-red-50/20' : ''}`}
                    >
                      {HOURS.map((h) => (
                        <div key={h} className="h-[60px] border-b border-[var(--border-light)]/50" />
                      ))}

                      {/* Event blocks */}
                      {dayEvents.map((event) => {
                        const color = getCategoryColor(event.category_id);
                        const { top, height } = getEventStyle(event);
                        const isSelected = selectedEventId === event.id;
                        return (
                          <Link
                            key={event.id}
                            href={`/dashboard/events/${event.id}`}
                            ref={(el) => { if (hoveredEventId === event.id) hoveredEventRef.current = el; }}
                            onMouseEnter={() => setHoveredEventId(event.id)}
                            onMouseLeave={() => setHoveredEventId(null)}
                            onClick={() => setSelectedEventId(event.id)}
                            className={`
                              absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 overflow-hidden
                              text-white text-[10px] leading-tight font-semibold cursor-pointer
                              shadow-sm hover:shadow-md transition-shadow
                              ${color.bg}
                              ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''}
                            `}
                            style={{ top, height }}
                          >
                            <p className="font-bold truncate">{event.title}</p>
                            <p className="opacity-80 truncate">{format(parseISO(event.start_time), 'HH:mm')} – {format(parseISO(event.end_time), 'HH:mm')}</p>
                          </Link>
                        );
                      })}

                      {/* Now indicator */}
                      {todayCell && (() => {
                        const now = new Date();
                        const nowH = now.getHours();
                        const nowM = now.getMinutes();
                        if (nowH >= 7 && nowH <= 22) {
                          const top = ((nowH - 7) * 60 + nowM);
                          return (
                            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
                              <div className="flex items-center gap-0.5">
                                <div className="w-2 h-2 rounded-full bg-[var(--color-brand-red)] -ml-[5px]" />
                                <div className="h-0.5 bg-[var(--color-brand-red)] flex-1" />
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── EVENT PREVIEW TOOLTIP ── */}
        {hoveredEvent && hoveredEventRef.current && (
          <EventPreviewTooltip event={hoveredEvent} anchorRef={hoveredEventRef} />
        )}

        {/* ── UPCOMING EVENTS (with sync highlight) ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] p-8 text-center">
            <div className="w-8 h-8 rounded-full border-[3px] border-[var(--bg-muted)] border-t-[var(--color-brand-navy)] animate-spin mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">Đang tải lịch sự kiện...</p>
          </div>
        ) : safeEvents.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-16 text-center shadow-[var(--shadow-card)]">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center mx-auto mb-5">
              <Calendar className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Chưa có sự kiện sắp diễn ra</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
              Hiện tại không có sự kiện nào được lên lịch. Quay lại sau để cập nhật.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-brand-orange)]" />
                Sự kiện sắp tới
                {selectedEventId !== null && (
                  <button
                    onClick={() => setSelectedEventId(null)}
                    className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-brand-orange)]/10 text-[var(--color-brand-orange)] text-xs font-semibold hover:bg-[var(--color-brand-orange)]/20 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Bỏ chọn
                  </button>
                )}
              </h3>
              <span className="text-xs font-medium text-[var(--text-muted)]">{safeEvents.length} sự kiện</span>
            </div>
            <div className="divide-y divide-[var(--border-light)]">
              {safeEvents
                .slice()
                .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())
                .slice(0, 8)
                .map((event) => {
                  const color = getCategoryColor(event.category_id);
                  const isHighlighted = highlightedEvents.has(event.id);
                  return (
                    <Link
                      key={event.id}
                      href={`/dashboard/events/${event.id}`}
                      onClick={() => setSelectedEventId(event.id)}
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                      className={`
                        flex items-center gap-4 px-6 py-4 transition-all duration-200 group
                        ${isHighlighted ? 'bg-[var(--color-brand-orange)]/5 border-l-4 border-l-[var(--color-brand-orange)]' : 'hover:bg-[var(--bg-muted)]/50 border-l-4 border-l-transparent'}
                      `}
                    >
                      {/* Date block */}
                      <div className={`w-12 h-12 rounded-xl ${color.bg} flex flex-col items-center justify-center shrink-0 shadow-[var(--shadow-sm)] group-hover:shadow-[var(--shadow-brand)] transition-shadow ${isHighlighted ? 'ring-2 ring-[var(--color-brand-orange)]' : ''}`}>
                        <span className="text-[10px] font-bold text-white/70 uppercase leading-none">
                          {format(parseISO(event.start_time), 'MMM', { locale: vi })}
                        </span>
                        <span className="text-lg font-extrabold text-white leading-none">
                          {format(parseISO(event.start_time), 'd')}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate transition-colors ${isHighlighted ? 'text-[var(--color-brand-orange)]' : 'text-[var(--text-primary)] group-hover:text-[var(--color-brand-navy)]'}`}>
                          {event.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(event.start_time), 'HH:mm', { locale: vi })}
                          </span>
                          <span className="inline-flex items-center gap-1 font-medium">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{event.location}</span>
                          </span>
                          {event.category && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${color.light}`}>
                              {event.category.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Highlight badge */}
                      {isHighlighted && (
                        <div className="px-2.5 py-1 rounded-full bg-[var(--color-brand-orange)] text-white text-xs font-bold shrink-0">
                          Đang xem
                        </div>
                      )}

                      {/* Arrow */}
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center shrink-0 group-hover:bg-[var(--color-brand-navy)] transition-colors">
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-white transition-colors" />
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
