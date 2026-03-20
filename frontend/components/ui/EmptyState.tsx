'use client';

import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">
                {icon || <Inbox size={28} />}
            </div>
            <p className="empty-state-title">{title}</p>
            {description && <p className="empty-state-desc">{description}</p>}
            {actionLabel && onAction && (
                <div className="mt-5">
                    <Button variant="primary" onClick={onAction}>{actionLabel}</Button>
                </div>
            )}
        </div>
    );
}
