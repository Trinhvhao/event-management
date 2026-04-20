'use client';

import React from 'react';
import { X, CheckCircle } from 'lucide-react';

interface BulkAction {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive';
    icon?: React.ReactNode;
}

interface BulkActionToolbarProps {
    selectedCount: number;
    actions: BulkAction[];
    onClearSelection: () => void;
}

export function BulkActionToolbar({
    selectedCount,
    actions,
    onClearSelection,
}: BulkActionToolbarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-slide-up">
            <div className="bg-white rounded-2xl shadow-[var(--shadow-xl)] border border-[var(--border-default)] px-5 py-3.5 flex items-center gap-4">
                {/* Selected count */}
                <div className="flex items-center gap-2.5 pr-4 border-r border-[var(--border-default)]">
                    <div className="w-8 h-8 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-[var(--color-brand-navy)]" />
                    </div>
                    <div>
                        <span className="text-sm font-extrabold text-[var(--text-primary)]">{selectedCount}</span>
                        <span className="text-sm text-[var(--text-muted)] ml-1">đã chọn</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={action.onClick}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                                action.variant === 'destructive'
                                    ? 'bg-[var(--color-brand-red)] text-white hover:opacity-90 shadow-sm'
                                    : 'bg-[var(--color-brand-navy)] text-white hover:opacity-90 shadow-[var(--shadow-brand)]'
                            }`}
                        >
                            {action.icon}
                            {action.label}
                        </button>
                    ))}
                </div>

                {/* Clear */}
                <button
                    onClick={onClearSelection}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Bỏ chọn"
                >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Bỏ chọn</span>
                </button>
            </div>
        </div>
    );
}
