'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CheckSquare, Calendar, Clock, MapPin, ExternalLink, Check, X } from 'lucide-react';
import { eventService } from '@/services/eventService';
import { Event } from '@/types';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
      ?.message === 'string'
  ) {
    return (error as { response?: { data?: { error?: { message?: string } } } }).response!.data!
      .error!.message!;
  }

  return fallback;
}

export default function PendingEventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchReviewEvents = async () => {
      try {
        setLoading(true);
        const response = await eventService.getPending({
          limit: 50,
        });

        const items = response?.data?.items || response?.items || response?.data || [];
        setEvents(Array.isArray(items) ? items : []);
      } catch {
        toast.error('Không thể tải danh sách sự kiện để rà soát');
      } finally {
        setLoading(false);
      }
    };

    fetchReviewEvents();
  }, []);

  const handleApprove = async (event: Event) => {
    try {
      setProcessingId(event.id);
      await eventService.approveEvent(event.id);
      setEvents((prev) => prev.filter((item) => item.id !== event.id));
      toast.success(`Đã duyệt: ${event.title}`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Không thể duyệt sự kiện'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (event: Event) => {
    const reason = window.prompt('Nhập lý do từ chối (không bắt buộc):')?.trim();
    try {
      setProcessingId(event.id);
      await eventService.rejectEvent(event.id, reason || undefined);
      setEvents((prev) => prev.filter((item) => item.id !== event.id));
      toast.success(`Đã từ chối: ${event.title}`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Không thể từ chối sự kiện'));
    } finally {
      setProcessingId(null);
    }
  };

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime()
    );
  }, [events]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">Phê duyệt sự kiện</h1>
                <p className="text-sm text-gray-500">Danh sách sự kiện để quản trị viên rà soát nhanh</p>
              </div>
            </div>

            <Link
              href="/dashboard/events"
              className="inline-flex items-center px-4 py-2 rounded-lg border border-brandBlue text-brandBlue hover:bg-brandBlue/5 transition-colors"
            >
              Về danh sách sự kiện
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Đang tải sự kiện...
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-brandLightBlue/20 text-brandBlue flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-primary mb-2">Không còn sự kiện chờ duyệt</h2>
            <p className="text-gray-600">Danh sách pending đang trống.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 hover:border-brandBlue/35 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-lg font-semibold text-primary">{event.title}</h2>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-semibold">
                        Chờ duyệt
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(parseISO(event.start_time), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Tạo lúc {format(parseISO(event.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Xem chi tiết
                    </Link>

                    <button
                      onClick={() => handleApprove(event)}
                      disabled={processingId === event.id}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-sm"
                    >
                      <Check className="w-4 h-4" />
                      Duyệt
                    </button>

                    <button
                      onClick={() => handleReject(event)}
                      disabled={processingId === event.id}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 text-sm"
                    >
                      <X className="w-4 h-4" />
                      Từ chối
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
