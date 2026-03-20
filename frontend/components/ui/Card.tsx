'use client';

import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'glass' | 'solid';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    onClick?: () => void;
}

export default function Card({
    children,
    className,
    variant = 'solid',
    padding = 'md',
    hover = false,
    onClick,
}: CardProps) {
    const paddingClass = {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
    }[padding];

    return (
        <div
            className={clsx(
                variant === 'glass' ? 'card-glass' : 'card-solid',
                paddingClass,
                hover && 'cursor-pointer',
                !hover && '[&]:hover:transform-none [&]:hover:shadow-[var(--dash-shadow-sm)]',
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
    return (
        <div className={clsx('flex items-center justify-between mb-4', className)}>
            <div>
                <h3 className="text-base font-semibold text-[var(--dash-text-primary)]">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-[var(--dash-text-muted)] mt-0.5">{subtitle}</p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
