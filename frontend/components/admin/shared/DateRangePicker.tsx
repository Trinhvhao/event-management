'use client';

import React, { useState } from 'react';
import { Calendar, ChevronLeft, RotateCcw } from 'lucide-react';

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

const PRESETS: Preset[] = [
    {
        label: 'Hôm nay',
        getValue: () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const end = new Date(today);
            end.setHours(23, 59, 59, 999);
            return { from: today, to: end };
        },
    },
    {
        label: 'Tuần này',
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
        label: 'Tháng này',
        getValue: () => {
            const today = new Date();
            const from = new Date(today.getFullYear(), today.getMonth(), 1);
            const to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            return { from, to };
        },
    },
    {
        label: 'Quý này',
        getValue: () => {
            const today = new Date();
            const quarter = Math.floor(today.getMonth() / 3);
            const from = new Date(today.getFullYear(), quarter * 3, 1);
            const to = new Date(today.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
            return { from, to };
        },
    },
    {
        label: 'Năm nay',
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

    const fmtDate = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const handlePresetClick = (preset: Preset) => {
        onChange(preset.getValue());
        setError(null);
        setCustomMode(false);
        setIsOpen(false);
    };

    const handleCustomDateChange = (type: 'from' | 'to', dateString: string) => {
        const newDate = dateString ? new Date(dateString) : null;
        const newRange = { ...value, [type]: newDate };
        if (newRange.from && newRange.to && newRange.to < newRange.from) {
            setError('Ngày kết thúc phải sau ngày bắt đầu');
            onChange(newRange);
            return;
        }
        setError(null);
        onChange(newRange);
    };

    const displayText = value.from && value.to
        ? `${fmtDate(value.from)} – ${fmtDate(value.to)}`
        : 'Chọn khoảng ngày';

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 h-10 px-4 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] transition-all shadow-[var(--shadow-xs)]"
            >
                <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{displayText}</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => { setIsOpen(false); setCustomMode(false); }} />
                    <div className="absolute z-20 mt-2 left-0 bg-white border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-xl)] p-4 min-w-[320px]">
                        {/* Presets */}
                        {!customMode && (
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-3 px-1">Chọn nhanh</h4>
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        onClick={() => handlePresetClick(preset)}
                                        className="w-full text-left px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] rounded-xl transition-colors font-medium"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCustomMode(true)}
                                    className="w-full text-left px-3 py-2.5 text-sm text-[var(--color-brand-navy)] hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_6%,transparent)] rounded-xl font-semibold transition-colors flex items-center gap-2"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    Chọn ngày tùy chỉnh
                                </button>
                            </div>
                        )}

                        {/* Custom inputs */}
                        {customMode && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Ngày tùy chỉnh</h4>
                                    <button
                                        onClick={() => { setCustomMode(false); setError(null); }}
                                        className="text-xs text-[var(--color-brand-navy)] font-semibold hover:underline"
                                    >
                                        ← Quay lại
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Từ ngày</label>
                                    <input
                                        type="date"
                                        value={value.from ? value.from.toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleCustomDateChange('from', e.target.value)}
                                        className="input-base text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">Đến ngày</label>
                                    <input
                                        type="date"
                                        value={value.to ? value.to.toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleCustomDateChange('to', e.target.value)}
                                        className="input-base text-sm"
                                    />
                                </div>

                                {error && (
                                    <p className="text-xs text-[var(--color-brand-red)] font-medium">{error}</p>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            if (!error && value.from && value.to) {
                                                setIsOpen(false);
                                                setCustomMode(false);
                                            }
                                        }}
                                        disabled={!value.from || !value.to || !!error}
                                        className="flex-1 btn btn-primary btn-sm"
                                    >
                                        Áp dụng
                                    </button>
                                    <button
                                        onClick={() => {
                                            onChange({ from: null, to: null });
                                            setError(null);
                                            setIsOpen(false);
                                            setCustomMode(false);
                                        }}
                                        className="btn btn-ghost btn-sm flex items-center gap-1.5"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
