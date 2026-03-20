'use client';

import React from 'react';
import { clsx } from 'clsx';

interface AvatarProps {
    src?: string | null;
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
    const sizeClass = {
        sm: 'avatar-sm',
        md: 'avatar-md',
        lg: 'avatar-lg',
        xl: 'avatar-xl',
    }[size];

    return (
        <div className={clsx('avatar', sizeClass, className)} title={name}>
            {src ? (
                <img src={src} alt={name} />
            ) : (
                <span>{getInitials(name)}</span>
            )}
        </div>
    );
}
