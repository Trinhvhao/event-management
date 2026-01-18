import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { vi } from 'date-fns/locale';

export function formatDate(date: string | Date, formatStr: string = 'PPP'): string {
  return format(new Date(date), formatStr, { locale: vi });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'PPP p', { locale: vi });
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'p', { locale: vi });
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi });
}

export function isEventPast(endTime: string | Date): boolean {
  return isPast(new Date(endTime));
}

export function isEventUpcoming(startTime: string | Date): boolean {
  return isFuture(new Date(startTime));
}

export function getEventStatus(startTime: string | Date, endTime: string | Date): 'upcoming' | 'ongoing' | 'completed' {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'ongoing';
  return 'completed';
}
