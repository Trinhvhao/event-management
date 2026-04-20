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

const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
};

export default function Card({
    children,
    className,
    variant = 'solid',
    padding = 'md',
    hover = false,
    onClick,
}: CardProps) {
    return (
        <div
            className={clsx(
                variant === 'glass' ? 'card-glass' : 'card-solid',
                paddingClass[padding],
                hover && 'cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
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
    icon?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action, className, icon }: CardHeaderProps) {
    return (
        <div className={clsx('flex items-center justify-between mb-5', className)}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center shrink-0">
                        <div className="text-[var(--color-brand-navy)]">{icon}</div>
                    </div>
                )}
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
                    {subtitle && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
