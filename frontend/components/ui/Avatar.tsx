'use client';

import React from 'react';
import Image from 'next/image';
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
        sm: 'h-7 w-7 text-[11px]',
        md: 'h-9 w-9 text-sm',
        lg: 'h-11 w-11 text-base',
        xl: 'h-14 w-14 text-xl',
    }[size];

    return (
        <div
            className={clsx(
                'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brandBlue to-brandLightBlue text-white font-semibold shrink-0',
                sizeClass,
                className
            )}
            title={name}
        >
            {src ? (
                <Image src={src} alt={name} fill sizes="64px" className="object-cover" />
            ) : (
                <span>{getInitials(name)}</span>
            )}
        </div>
    );
}
