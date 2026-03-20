'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useEvents } from '@/hooks/useEvents';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Event } from '@/types';

type CalendarMode = 'month' | 'week';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export default function EventsCalendarPage() {
  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursorDate, setCursorDate] = useState(new Date());
  const { events, loading } = useEvents({
    limit: 200,
    status: 'upcoming',
  });

  const safeEvents = useMemo<Event[]>(() => {
    return Array.isArray(events) ? events : [];
  }, [events]);

  const eventMap = useMemo(() => {
    const map = new Map<string, Event[]>();

    for (const event of safeEvents) {
      if (!event?.start_time || !event?.id) {
        continue;
      }

      const key = toDateKey(parseISO(event.start_time));
      const arr = map.get(key) || [];
      arr.push(event);
      map.set(key, arr);
    }

    // Ensure event chips are consistently ordered by start time.
    for (const [key, list] of map.entries()) {
      map.set(
        key,
        list.sort(
          (a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
        )
      );
    }

    return map;
  }, [safeEvents]);

  const days = useMemo(() => {
    if (mode === 'week') {
      const start = startOfWeek(cursorDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }

    const monthStart = startOfMonth(cursorDate);
    const monthEnd = endOfMonth(cursorDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const result: Date[] = [];
    let current = gridStart;
    while (current <= gridEnd) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  }, [mode, cursorDate]);

  const periodLabel = useMemo(() => {
    if (mode === 'week') {
      const start = startOfWeek(cursorDate, { weekStartsOn: 1 });
      const end = endOfWeek(cursorDate, { weekStartsOn: 1 });
      return `${format(start, 'dd/MM', { locale: vi })} - ${format(end, 'dd/MM/yyyy', {
        locale: vi,
      })}`;
    }

    return format(cursorDate, 'MMMM yyyy', { locale: vi });
  }, [mode, cursorDate]);

  const goPrev = () => {
    setCursorDate((prev) => (mode === 'week' ? subWeeks(prev, 1) : subMonths(prev, 1)));
  };

  const goNext = () => {
    setCursorDate((prev) => (mode === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1)));
  };

  const today = new Date();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brandLightBlue/20 text-brandBlue flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">Lịch sự kiện</h1>
                <p className="text-sm text-gray-500">Chế độ xem tháng/tuần</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                <button
                  onClick={() => setMode('month')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    mode === 'month'
                      ? 'bg-white text-brandBlue shadow-sm'
                      : 'text-gray-600 hover:text-primary'
                  }`}
                >
                  Tháng
                </button>
                <button
                  onClick={() => setMode('week')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    mode === 'week'
                      ? 'bg-white text-brandBlue shadow-sm'
                      : 'text-gray-600 hover:text-primary'
                  }`}
                >
                  Tuần
                </button>
              </div>

              <button
                onClick={goPrev}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                aria-label="Trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={goNext}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                aria-label="Sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-primary capitalize mb-4">{periodLabel}</h2>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="text-center text-xs font-semibold text-gray-500 py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 auto-rows-[120px] md:auto-rows-[132px]">
            {days.map((day) => {
              const key = toDateKey(day);
              const dayEvents = eventMap.get(key) || [];
              const muted = mode === 'month' && !isSameMonth(day, cursorDate);
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={key}
                  className={`rounded-lg border p-2 overflow-hidden ${
                    isToday
                      ? 'border-brandBlue/50 bg-brandLightBlue/10'
                      : muted
                      ? 'border-gray-200 bg-gray-50/70'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-semibold ${
                        muted ? 'text-gray-400' : isToday ? 'text-brandBlue' : 'text-gray-700'
                      }`}
                    >
                      {format(day, 'dd/MM')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary font-semibold">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <Link
                        key={event.id}
                        href={`/dashboard/events/${event.id}`}
                        className="block rounded-md px-2 py-1 bg-brandBlue/10 hover:bg-brandBlue/15 text-[11px] leading-tight text-brandBlue truncate"
                        title={event.title}
                      >
                        {format(parseISO(event.start_time), 'HH:mm')} {event.title}
                      </Link>
                    ))}

                    {dayEvents.length > 2 && (
                      <p className="text-[11px] text-gray-500 px-1">+{dayEvents.length - 2} sự kiện khác</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Đang tải lịch sự kiện...
          </div>
        ) : safeEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Chưa có sự kiện sắp diễn ra.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-primary mb-3">Sự kiện sắp tới</h3>
            <div className="space-y-2">
              {safeEvents
                .slice()
                .sort(
                  (a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
                )
                .slice(0, 8)
                .map((event) => (
                  <Link
                    key={event.id}
                    href={`/dashboard/events/${event.id}`}
                    className="block rounded-lg border border-gray-200 p-3 hover:border-brandBlue/40 hover:shadow-sm transition-all"
                  >
                    <p className="font-semibold text-primary mb-1 truncate">{event.title}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {format(parseISO(event.start_time), 'dd/MM HH:mm', { locale: vi })}
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
