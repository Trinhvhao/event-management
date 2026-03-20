'use client';

import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    dot?: boolean;
    className?: string;
}

export default function Badge({ children, variant = 'neutral', dot = false, className }: BadgeProps) {
    const variantClass = {
        success: 'badge-success',
        warning: 'badge-warning',
        danger: 'badge-danger',
        info: 'badge-info',
        neutral: 'badge-neutral',
    }[variant];

    return (
        <span className={clsx('badge', variantClass, dot && 'badge-dot', className)}>
            {children}
        </span>
    );
}

// Helper to map event status to badge variant
export function getStatusBadgeVariant(status: string): BadgeVariant {
    switch (status) {
        case 'upcoming': return 'info';
        case 'ongoing': return 'success';
        case 'completed': return 'neutral';
        case 'cancelled': return 'danger';
        default: return 'neutral';
    }
}

export function getStatusLabel(status: string): string {
    switch (status) {
        case 'upcoming': return 'Sắp diễn ra';
        case 'ongoing': return 'Đang diễn ra';
        case 'completed': return 'Đã kết thúc';
        case 'cancelled': return 'Đã hủy';
        default: return status;
    }
}
