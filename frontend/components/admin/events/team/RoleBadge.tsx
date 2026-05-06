'use client';

import React from 'react';

interface RoleBadgeProps {
    role: 'main_organizer' | 'helper';
}

const roleConfig = {
    main_organizer: {
        label: 'Main Organizer',
        variant: 'primary' as const,
    },
    helper: {
        label: 'Helper',
        variant: 'secondary' as const,
    },
};

export function RoleBadge({ role }: RoleBadgeProps) {
    const config = roleConfig[role];

    const variantStyles = {
        primary:
            'bg-[color-mix(in_srgb,var(--color-brand-navy)_12%,transparent)] text-[var(--color-brand-navy)] border-[color-mix(in_srgb,var(--color-brand-navy)_30%,transparent)]',
        secondary:
            'bg-[color-mix(in_srgb,var(--color-brand-gray)_12%,transparent)] text-[var(--color-brand-gray)] border-[color-mix(in_srgb,var(--color-brand-gray)_30%,transparent)]',
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${variantStyles[config.variant]}`}
        >
            {config.label}
        </span>
    );
}
