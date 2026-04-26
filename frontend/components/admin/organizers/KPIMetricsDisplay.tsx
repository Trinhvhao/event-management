'use client';

import React from 'react';
import { TrendingUp, Users, Calendar, Star } from 'lucide-react';

interface Metrics {
    eventsCreated: number;
    totalAttendees: number;
    averageRating: number;
    upcomingEvents: number;
    completedEvents: number;
}

interface KPIMetricsDisplayProps {
    metrics: Metrics;
}

const RATING_LEVELS = [
    { min: 4.5, color: 'text-[var(--color-brand-green)]',   bg: 'bg-[color-mix(in_srgb,var(--color-brand-green)_12%,transparent)]',   label: 'Xuất sắc' },
    { min: 4.0, color: 'text-[var(--color-brand-navy)]',      bg: 'bg-[color-mix(in_srgb,var(--color-brand-navy)_12%,transparent)]',      label: 'Tốt' },
    { min: 3.5, color: 'text-[var(--color-brand-orange)]',   bg: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_12%,transparent)]',  label: 'Trung bình' },
    { min: 0,   color: 'text-[var(--color-brand-red)]',       bg: 'bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)]',       label: 'Cần cải thiện' },
];

export function KPIMetricsDisplay({ metrics }: KPIMetricsDisplayProps) {
    const level = RATING_LEVELS.find((l) => metrics.averageRating >= l.min) || RATING_LEVELS[RATING_LEVELS.length - 1];

    const items = [
        { icon: Calendar, iconColor: 'text-[var(--color-brand-navy)]',  iconBg: 'bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)]',   label: 'Sự kiện đã tạo', value: metrics.eventsCreated },
        { icon: Users,   iconColor: 'text-[var(--color-brand-green)]',  iconBg: 'bg-[color-mix(in_srgb,var(--color-brand-green)_10%,transparent)]',    label: 'Lượt tham gia',  value: metrics.totalAttendees },
        { icon: Star,     iconColor: level.color,                       iconBg: level.bg,                                                      label: 'Điểm đánh giá',  value: `${metrics.averageRating.toFixed(1)}` },
        { icon: TrendingUp, iconColor: 'text-[var(--color-brand-orange)]', iconBg: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,transparent)]', label: 'Sắp diễn ra',   value: metrics.upcomingEvents },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map(({ icon: Icon, iconColor, iconBg, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-muted)]/40 border border-[var(--border-light)]">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
                        <p className="text-sm font-extrabold text-[var(--text-primary)]">{value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
