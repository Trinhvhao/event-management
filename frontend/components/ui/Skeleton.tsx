'use client';

import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
    width?: string | number;
    height?: string | number;
    circle?: boolean;
}

export default function Skeleton({ className, style, width, height, circle }: SkeletonProps) {
    return (
        <div
            className={clsx(
                'skeleton-animate',
                circle && '!rounded-full',
                className
            )}
            style={{
                width: width || '100%',
                height: height || '16px',
                ...style,
            }}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="card-solid p-5">
            <Skeleton height={160} className="mb-4 !rounded-xl" />
            <Skeleton width="70%" height={20} className="mb-3" />
            <Skeleton width="50%" height={14} className="mb-2" />
            <Skeleton width="40%" height={14} />
        </div>
    );
}

export function SkeletonRow() {
    return (
        <div className="flex items-center gap-4 py-3.5 px-4">
            <Skeleton circle width={36} height={36} />
            <div className="flex-1">
                <Skeleton width="60%" height={14} className="mb-2" />
                <Skeleton width="40%" height={12} />
            </div>
            <Skeleton width={80} height={24} className="!rounded-full" />
        </div>
    );
}
