'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Search, UserPlus, X } from 'lucide-react';
import { eventTeamService } from '@/services/eventTeamService';

interface AvailableUser {
    id: number;
    full_name: string;
    email: string;
    student_id: string | null;
    role: string;
    department: {
        id: number;
        name: string;
        code: string;
    } | null;
}

interface AddTeamMemberDialogProps {
    eventId: number;
    isOpen: boolean;
    onClose: () => void;
    onAdd: (userId: number, role: 'main_organizer' | 'helper') => Promise<void>;
}

export function AddTeamMemberDialog({
    eventId,
    isOpen,
    onClose,
    onAdd,
}: AddTeamMemberDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AvailableUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
    const [selectedRole, setSelectedRole] = useState<'main_organizer' | 'helper'>('helper');
    const [addingUserId, setAddingUserId] = useState<number | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    const handleSearch = useCallback(async (query: string) => {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const users = await eventTeamService.searchAvailableUsers(
                eventId,
                normalizedQuery,
                10
            );
            setSearchResults(users);
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    const handleAdd = async () => {
        if (!selectedUser) return;
        setAddingUserId(selectedUser.id);
        try {
            await onAdd(selectedUser.id, selectedRole);
            onClose();
            setSearchQuery('');
            setSearchResults([]);
            setSelectedUser(null);
            setSelectedRole('helper');
        } catch (error) {
            console.error('Add failed:', error);
        } finally {
            setAddingUserId(null);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            void handleSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedUser(null);
            setSelectedRole('helper');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-[rgba(5,6,8,0.55)] backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                ref={dialogRef}
                className="relative bg-white rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-lg animate-scale-in"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-[var(--color-brand-navy)]" />
                        </div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            Thêm thành viên
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-muted)] transition-colors"
                    >
                        <X className="w-5 h-5 text-[var(--text-secondary)]" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                            Tìm kiếm người tổ chức
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm theo tên, email hoặc mã sinh viên..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]/20 focus:border-[var(--color-brand-navy)]"
                            />
                            {loading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] animate-spin" />
                            )}
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && !selectedUser && (
                        <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
                            {searchResults.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-muted)] transition-colors text-left"
                                >
                                    <div className="w-9 h-9 rounded-full bg-[color-mix(in_srgb,var(--color-brand-navy)_15%,transparent)] flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-[var(--color-brand-navy)]">
                                            {user.full_name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                            {user.full_name}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)] truncate">
                                            {user.email}
                                            {user.department && ` · ${user.department.name}`}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Selected User */}
                    {selectedUser && (
                        <div className="rounded-xl border border-[var(--color-brand-navy)]/30 bg-[color-mix(in_srgb,var(--color-brand-navy)_5%,transparent)] p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--color-brand-navy)_15%,transparent)] flex items-center justify-center">
                                        <span className="text-sm font-bold text-[var(--color-brand-navy)]">
                                            {selectedUser.full_name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                            {selectedUser.full_name}
                                        </p>
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            {selectedUser.email}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="text-xs text-[var(--color-brand-red)] hover:underline"
                                >
                                    Bỏ chọn
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Role Selection */}
                    {selectedUser && (
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                                Vai trò
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setSelectedRole('main_organizer')}
                                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                                        selectedRole === 'main_organizer'
                                            ? 'border-[var(--color-brand-navy)] bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] text-[var(--color-brand-navy)]'
                                            : 'border-[var(--border-default)] bg-white text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)]/50'
                                    }`}
                                >
                                    Main Organizer
                                </button>
                                <button
                                    onClick={() => setSelectedRole('helper')}
                                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                                        selectedRole === 'helper'
                                            ? 'border-[var(--color-brand-navy)] bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] text-[var(--color-brand-navy)]'
                                            : 'border-[var(--border-default)] bg-white text-[var(--text-secondary)] hover:border-[var(--color-brand-navy)]/50'
                                    }`}
                                >
                                    Helper
                                </button>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                                {selectedRole === 'main_organizer'
                                    ? 'Toàn quyền quản lý sự kiện, checkin, xem feedback, cộng điểm'
                                    : 'Chỉ có quyền checkin và xem feedback'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border-default)]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={() => void handleAdd()}
                        disabled={!selectedUser || addingUserId !== null}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-brand-navy)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {addingUserId !== null && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Thêm thành viên
                    </button>
                </div>
            </div>
        </div>
    );
}
