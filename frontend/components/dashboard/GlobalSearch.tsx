'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Calendar, Users, FileText } from 'lucide-react';
import Link from 'next/link';
import { searchService } from '@/services/searchService';

interface SearchResult {
    id: number | string;
    type: 'event' | 'student' | 'user';
    title: string;
    subtitle?: string;
}

const getResultIcon = (type: SearchResult['type']) => {
    if (type === 'event') return { icon: Calendar, color: 'text-[var(--color-brand-navy)]', bg: 'bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)]' };
    if (type === 'student') return { icon: Users, color: 'text-[var(--color-brand-green)]', bg: 'bg-[color-mix(in_srgb,var(--color-brand-green)_10%,transparent)]' };
    return { icon: FileText, color: 'text-[var(--color-brand-orange)]', bg: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,transparent)]' };
};

const TYPE_LABELS: Record<SearchResult['type'], string> = {
    event: 'Sự kiện',
    student: 'Sinh viên',
    user: 'Người dùng',
};

const TYPE_LABEL_CLASSES: Record<SearchResult['type'], string> = {
    event: 'bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] text-[var(--color-brand-navy)]',
    student: 'bg-[color-mix(in_srgb,var(--color-brand-green)_10%,transparent)] text-[var(--color-brand-green)]',
    user: 'bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,transparent)] text-[var(--color-brand-orange)]',
};

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounced search
    useEffect(() => {
        const searchData = async () => {
            if (query.length < 2) {
                setResults([]);
                setActiveIndex(-1);
                return;
            }
            setLoading(true);
            try {
                const data = await searchService.globalSearch(query);
                setResults(data);
                setActiveIndex(-1);
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(searchData, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, -1));
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setActiveIndex(-1);
            inputRef.current?.blur();
        }
    };

    const getResultHref = (result: SearchResult): string => {
        if (result.type === 'event') return `/dashboard/events/${result.id}`;
        return `/dashboard/admin/users?search=${encodeURIComponent(result.title)}`;
    };

    const handleResultClick = () => {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        setActiveIndex(-1);
    };

    return (
        <div ref={searchRef} className="relative flex-1 max-w-lg">
            {/* Input wrapper */}
            <div className="relative">
                {/* Search icon — properly positioned with padding-left to avoid overlap */}
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-muted)] pointer-events-none z-10" />

                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Tìm kiếm sự kiện, sinh viên, MSSV..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-10 pl-11 pr-10 rounded-xl border-2 border-[var(--border-default)] bg-white text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-xs)] placeholder:text-[var(--text-muted)] transition-all duration-200 focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] focus:shadow-[var(--shadow-card)]"
                    aria-label="Tìm kiếm toàn cục"
                    aria-expanded={isOpen && query.length >= 2}
                    aria-autocomplete="list"
                    role="combobox"
                />

                {/* Clear button */}
                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setResults([]);
                            setActiveIndex(-1);
                            inputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                        aria-label="Xóa tìm kiếm"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && query.length >= 2 && (
                <div
                    className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-xl)] z-50 overflow-hidden"
                    role="listbox"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-3 py-10">
                            <div className="w-5 h-5 rounded-full border-2 border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                            <span className="text-sm text-[var(--text-muted)] font-medium">Đang tìm kiếm...</span>
                        </div>
                    ) : results.length > 0 ? (
                        <ul className="py-2 max-h-96 overflow-y-auto">
                            {results.map((result, index) => {
                                const { icon: Icon, color, bg } = getResultIcon(result.type);
                                const isActive = index === activeIndex;

                                return (
                                    <li key={`${result.type}-${result.id}`} role="option" aria-selected={isActive}>
                                        <Link
                                            href={getResultHref(result)}
                                            onClick={handleResultClick}
                                            className={`flex items-center gap-3 mx-3 px-3 py-3 rounded-xl transition-all duration-150 ${
                                                isActive
                                                    ? 'bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)]'
                                                    : 'hover:bg-[var(--bg-muted)]'
                                            }`}
                                            onMouseEnter={() => setActiveIndex(index)}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                                                <Icon className={`w-4.5 h-4.5 ${color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${TYPE_LABEL_CLASSES[result.type]}`}>
                                                        {TYPE_LABELS[result.type]}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate mt-0.5">{result.title}</p>
                                                {result.subtitle && (
                                                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{result.subtitle}</p>
                                                )}
                                            </div>
                                            <div className={`shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                                                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-muted)] px-2 py-0.5 rounded-md">
                                                    Enter để chọn
                                                </span>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                <Search className="w-6 h-6 text-[var(--text-muted)]" />
                            </div>
                            <p className="text-sm font-semibold text-[var(--text-secondary)]">Không tìm thấy kết quả</p>
                            <p className="text-xs text-[var(--text-muted)]">Thử từ khóa khác</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
