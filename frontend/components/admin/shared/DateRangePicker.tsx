'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateRange {
    from: Date | null;
    to: Date | null;
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    className?: string;
}

type Preset = {
    label: string;
    getValue: () => DateRange;
};

const presets: Preset[] = [
    {
        label: 'Today',
        getValue: () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);
            return { from: today, to: endOfDay };
        },
    },
    {
        label: 'This Week',
        getValue: () => {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const from = new Date(today);
            from.setDate(today.getDate() - dayOfWeek);
            from.setHours(0, 0, 0, 0);
            const to = new Date(from);
            to.setDate(from.getDate() + 6);
            to.setHours(23, 59, 59, 999);
            return { from, to };
        },
    },
    {
        label: 'This Month',
        getValue: () => {
            const today = new Date();
            const from = new Date(today.getFullYear(), today.getMonth(), 1);
            const to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            return { from, to };
        },
    },
    {
        label: 'This Year',
        getValue: () => {
            const today = new Date();
            const from = new Date(today.getFullYear(), 0, 1);
            const to = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
            return { from, to };
        },
    },
];

export function DateRangePicker({ value, onChange, className = '' }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [customMode, setCustomMode] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatDate = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handlePresetClick = (preset: Preset) => {
        const range = preset.getValue();
        onChange(range);
        setError(null);
        setCustomMode(false);
        setIsOpen(false);
    };

    const handleCustomDateChange = (type: 'from' | 'to', dateString: string) => {
        const newDate = dateString ? new Date(dateString) : null;
        const newRange = { ...value, [type]: newDate };

        // Validation: end date must be after start date
        if (newRange.from && newRange.to && newRange.to < newRange.from) {
            setError('End date must be after start date');
            return;
        }

        setError(null);
        onChange(newRange);
    };

    const displayText = value.from && value.to
        ? `${formatDate(value.from)} - ${formatDate(value.to)}`
        : 'Select date range';

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm"
            >
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{displayText}</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute z-20 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[320px]">
                        {/* Presets */}
                        {!customMode && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Select</h4>
                                {presets.map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => handlePresetClick(preset)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCustomMode(true)}
                                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md font-medium"
                                >
                                    Custom Range
                                </button>
                            </div>
                        )}

                        {/* Custom Date Inputs */}
                        {customMode && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-gray-700">Custom Range</h4>
                                    <button
                                        onClick={() => {
                                            setCustomMode(false);
                                            setError(null);
                                        }}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        Back
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        From
                                    </label>
                                    <input
                                        type="date"
                                        value={value.from ? value.from.toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleCustomDateChange('from', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        To
                                    </label>
                                    <input
                                        type="date"
                                        value={value.to ? value.to.toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleCustomDateChange('to', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>

                                {error && (
                                    <p className="text-xs text-red-600">{error}</p>
                                )}

                                <button
                                    onClick={() => {
                                        if (!error && value.from && value.to) {
                                            setIsOpen(false);
                                            setCustomMode(false);
                                        }
                                    }}
                                    disabled={!value.from || !value.to || !!error}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Apply
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
