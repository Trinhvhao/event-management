'use client';

import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    options: SelectOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    className?: string;
}

export default function Select({ options, value, onChange, placeholder = 'Chọn...', label, error, className }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className={clsx('w-full', className)} ref={ref}>
            {label && <label className="input-label">{label}</label>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={clsx(
                        'input-field text-left flex items-center justify-between',
                        error && 'error',
                        !selectedOption && 'text-[var(--dash-text-muted)]'
                    )}
                >
                    <span className="truncate">{selectedOption?.label || placeholder}</span>
                    <ChevronDown size={16} className={clsx('transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                    <div className="dropdown-menu mt-1">
                        {options.map(option => (
                            <div
                                key={option.value}
                                className={clsx(
                                    'dropdown-item',
                                    value === option.value && 'bg-[var(--dash-accent-light)] text-[var(--dash-accent)] font-medium'
                                )}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {error && <p className="input-error">{error}</p>}
        </div>
    );
}
