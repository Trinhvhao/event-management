'use client';

import React from 'react';

type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface StatusChipProps {
    status: string;
    variant?: StatusVariant;
}

// Brand-aligned palette — no gray
const variantStyles: Record<StatusVariant, string> = {
    default: 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-default)]',
    success: 'bg-[color-mix(in_srgb,var(--color-brand-green)_12%,transparent)] text-[var(--color-brand-green)] border-[color-mix(in_srgb,var(--color-brand-green)_30%,transparent)]',
    warning: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_12%,transparent)] text-[var(--color-brand-orange)] border-[color-mix(in_srgb,var(--color-brand-orange)_30%,transparent)]',
    error:   'bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] text-[var(--color-brand-red)] border-[color-mix(in_srgb,var(--color-brand-red)_30%,transparent)]',
    info:    'bg-[color-mix(in_srgb,var(--color-brand-navy)_12%,transparent)] text-[var(--color-brand-navy)] border-[color-mix(in_srgb,var(--color-brand-navy)_30%,transparent)]',
};

const getVariantFromStatus = (status: string): StatusVariant => {
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes('approved') || s.includes('completed') || s.includes('success') || s.includes('verified') || s.includes('hoạt động'))
        return 'success';
    if (s.includes('pending') || s.includes('warning') || s.includes('upcoming') || s.includes('sắp') || s.includes('chờ'))
        return 'warning';
    if (s.includes('inactive') || s.includes('rejected') || s.includes('cancelled') || s.includes('failed') || s.includes('locked') || s.includes('khóa') || s.includes('hủy'))
        return 'error';
    if (s.includes('info') || s.includes('draft') || s.includes('ongoing') || s.includes('đang'))
        return 'info';
    return 'default';
};

export function StatusChip({ status, variant }: StatusChipProps) {
    const finalVariant = variant || getVariantFromStatus(status);

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${variantStyles[finalVariant]}`}>
            {status}
        </span>
    );
}
