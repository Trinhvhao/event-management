'use client';

import React from 'react';

type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface StatusChipProps {
    status: string;
    variant?: StatusVariant;
}

const variantStyles: Record<StatusVariant, string> = {
    default: 'bg-gray-100 text-gray-800 border-gray-300',
    success: 'bg-green-100 text-green-800 border-green-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    error: 'bg-red-100 text-red-800 border-red-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
};

// Auto-map status strings to variants
const getVariantFromStatus = (status: string): StatusVariant => {
    const lowerStatus = status.toLowerCase();

    if (
        lowerStatus.includes('active') ||
        lowerStatus.includes('approved') ||
        lowerStatus.includes('completed') ||
        lowerStatus.includes('success') ||
        lowerStatus.includes('verified')
    ) {
        return 'success';
    }

    if (
        lowerStatus.includes('pending') ||
        lowerStatus.includes('warning') ||
        lowerStatus.includes('upcoming')
    ) {
        return 'warning';
    }

    if (
        lowerStatus.includes('inactive') ||
        lowerStatus.includes('rejected') ||
        lowerStatus.includes('cancelled') ||
        lowerStatus.includes('error') ||
        lowerStatus.includes('failed') ||
        lowerStatus.includes('locked')
    ) {
        return 'error';
    }

    if (
        lowerStatus.includes('info') ||
        lowerStatus.includes('draft') ||
        lowerStatus.includes('ongoing')
    ) {
        return 'info';
    }

    return 'default';
};

export function StatusChip({ status, variant }: StatusChipProps) {
    const finalVariant = variant || getVariantFromStatus(status);

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[finalVariant]}`}
        >
            {status}
        </span>
    );
}
