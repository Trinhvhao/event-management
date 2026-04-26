'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search, ShieldCheck, UserPlus2, X } from 'lucide-react';
import { adminService } from '@/services/adminService';

interface User {
    id: string;
    full_name: string;
    email: string;
    department?: {
        name: string;
    };
}

interface GrantOrganizerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onGrant: (userId: string) => Promise<void>;
}

export function GrantOrganizerDialog({ isOpen, onClose, onGrant }: GrantOrganizerDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [grantingUserId, setGrantingUserId] = useState<string | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    const handleSearch = useCallback(async (query: string) => {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) return;

        setLoading(true);
        try {
            const response = await adminService.getUsers({
                search: normalizedQuery,
                role: 'student',
                limit: 10,
            });
            setSearchResults(response.data || []);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleGrant = async (userId: string) => {
        setGrantingUserId(userId);
        try {
            await onGrant(userId);
            onClose();
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            console.error('Grant failed:', error);
        } finally {
            setGrantingUserId(null);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                void handleSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    // Escape key handler
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    // Reset state when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setGrantingUserId(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-[rgba(5,6,8,0.55)] backdrop-blur-sm" onClick={onClose} />

            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="grant-dialog-title"
                className="modal-panel relative flex w-full max-w-3xl flex-col max-h-[90vh]"
            >
                {/* Gradient top bar */}
                <div className="shrink-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-orange)] via-[var(--color-brand-gold)] to-[var(--color-brand-navy)]" />

                {/* Header */}
                <div className="shrink-0 border-b border-[var(--border-light)] p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand-orange)] to-[#e05500] text-white shadow-[0_8px_22px_rgba(242,102,0,0.25)]">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-orange)]">
                                    Organizer Access
                                </p>
                                <h2 id="grant-dialog-title" className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                                    Cấp quyền ban tổ chức
                                </h2>
                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                    Tìm sinh viên theo tên hoặc email rồi cấp quyền tổ chức sự kiện.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="icon-button"
                            aria-label="Đóng hộp thoại"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Search input */}
                    <div className="mt-5">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                            Tìm kiếm người dùng
                        </label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Nhập tên hoặc email sinh viên..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-base w-full pl-11 pr-10 text-base"
                                style={{ height: '52px' }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-7">
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-muted)]/35 p-3">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-14 text-[var(--text-muted)]">
                                <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-navy)]" />
                                <p className="text-sm font-medium">Đang tìm người dùng...</p>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                                    <Search className="h-6 w-6 text-[var(--text-muted)]" />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-[var(--text-primary)]">
                                        {searchQuery ? 'Không tìm thấy người dùng phù hợp' : 'Bắt đầu nhập để tìm kiếm'}
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                                        {searchQuery
                                            ? 'Hãy thử lại với tên đầy đủ hoặc email khác.'
                                            : 'Chỉ hiển thị sinh viên đủ điều kiện để cấp quyền organizer.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {searchResults.map((user) => (
                                    <div
                                        key={user.id}
                                        className="flex flex-col gap-4 rounded-2xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-xs)] transition-all hover:border-[var(--color-brand-orange)]/25 hover:shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] text-xs font-bold text-white shadow-sm">
                                                    {user.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                                                        {user.full_name}
                                                    </p>
                                                    <p className="truncate text-sm text-[var(--text-secondary)]">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            {user.department && (
                                                <p className="mt-2 pl-[52px] text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                                    {user.department.name}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => void handleGrant(user.id)}
                                            disabled={grantingUserId !== null}
                                            className="btn btn-secondary btn-sm shrink-0"
                                        >
                                            {grantingUserId === user.id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Đang cấp...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus2 className="h-4 w-4" />
                                                    Cấp quyền
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
