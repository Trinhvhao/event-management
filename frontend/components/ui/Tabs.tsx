'use client';

import React from 'react';
import { clsx } from 'clsx';

interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

export default function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    return (
        <div className={clsx('dash-tabs', className)}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    className={clsx('dash-tab', activeTab === tab.id && 'active')}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.icon && <span className="mr-1.5 inline-flex">{tab.icon}</span>}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
