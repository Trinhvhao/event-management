'use client';

import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface DropdownItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    divider?: boolean;
}

interface DropdownProps {
    trigger: React.ReactNode;
    items: DropdownItem[];
    align?: 'left' | 'right';
    className?: string;
}

export default function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
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

    return (
        <div className={clsx('relative inline-block', className)} ref={ref}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>
            {isOpen && (
                <div className={clsx('dropdown-menu', align === 'left' ? 'left-0 right-auto' : '')}>
                    {items.map((item, idx) => {
                        if (item.divider) {
                            return <div key={idx} className="dropdown-divider" />;
                        }
                        return (
                            <div
                                key={idx}
                                className={clsx('dropdown-item', item.danger && 'text-[var(--dash-danger)]')}
                                onClick={() => {
                                    item.onClick();
                                    setIsOpen(false);
                                }}
                            >
                                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                                {item.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
