'use client';

import React from 'react';
import { clsx } from 'clsx';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

export default function Toggle({
    checked,
    onChange,
    disabled = false,
    size = 'md',
    className
}: ToggleProps) {
    const handleToggle = () => {
        if (!disabled) {
            onChange(!checked);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
        }
    };

    const sizeClasses = {
        sm: {
            track: 'w-9 h-5',
            thumb: 'w-4 h-4',
            translate: 'translate-x-4',
            translateOff: 'translate-x-0.5',
        },
        md: {
            track: 'w-11 h-6',
            thumb: 'w-5 h-5',
            translate: 'translate-x-5',
            translateOff: 'translate-x-0.5',
        }
    };

    const classes = sizeClasses[size];

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            className={clsx(
                'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brandBlue focus-visible:ring-offset-2',
                checked ? 'bg-brandGreen' : 'bg-gray-300',
                disabled && 'cursor-not-allowed opacity-50',
                classes.track,
                className
            )}
        >
            <span
                className={clsx(
                    'pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out',
                    classes.thumb,
                    checked ? classes.translate : classes.translateOff
                )}
            />
        </button>
    );
}
