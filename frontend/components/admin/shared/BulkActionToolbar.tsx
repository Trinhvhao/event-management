'use client';

import React from 'react';
import { X } from 'lucide-react';

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
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-gray-900 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-6">
                {/* Selected Count */}
                <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedCount}</span>
                    <span className="text-gray-300">selected</span>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-700" />

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={action.onClick}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${action.variant === 'destructive'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {action.icon}
                            {action.label}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-700" />

                {/* Clear Selection */}
                <button
                    onClick={onClearSelection}
                    className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white transition-colors"
                    title="Clear selection"
                >
                    <X className="h-4 w-4" />
                    <span className="text-sm">Clear</span>
                </button>
            </div>
        </div>
    );
}
