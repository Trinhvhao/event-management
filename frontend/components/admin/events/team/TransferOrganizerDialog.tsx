'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Search, Loader2, UserCog, AlertTriangle } from 'lucide-react';
import { eventTeamService } from '@/services/eventTeamService';
import { TeamMember } from '@/types';
import { toast } from 'sonner';

interface TransferOrganizerDialogProps {
    eventId: number;
    eventTitle: string;
    currentOrganizerId: number;
    teamMembers: TeamMember[];
    isOpen: boolean;
    onClose: () => void;
    onTransferred: () => void;
}

export function TransferOrganizerDialog({
    eventId,
    eventTitle,
    currentOrganizerId,
    teamMembers,
    isOpen,
    onClose,
    onTransferred,
}: TransferOrganizerDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const eligibleMembers = teamMembers.filter(
        (m) => m.role === 'helper' && m.user_id !== currentOrganizerId
    );

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const doSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setSearching(false);
            return;
        }
        try {
            const results = await eventTeamService.searchAvailableUsers(eventId, query, 10);
            setSearchResults(results.filter((r: any) => r.id !== currentOrganizerId));
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setSearching(false);
        }
    }, [eventId, currentOrganizerId]);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setSearching(true);
        setSelectedUser(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void doSearch(value);
        }, 400);
    };

    const handleSelectFromTeam = (member: TeamMember) => {
        setSelectedUser(member.user);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleTransfer = async () => {
        if (!selectedUser) return;
        setSubmitting(true);
        try {
            await eventTeamService.transferMainOrganizer(eventId, selectedUser.id, 'helper');
            toast.success(`Đã chuyển quyền chủ sự kiện cho ${selectedUser.full_name}`);
            onTransferred();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Không thể chuyển quyền');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in">
                <div className="p-6 border-b border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_12%,transparent)] flex items-center justify-center">
                            <UserCog className="w-5 h-5 text-[var(--color-brand-navy)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                Chuyển quyền chủ sự kiện
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)] truncate max-w-[280px]">
                                {eventTitle}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {/* Warning */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-orange)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-brand-orange)_25%,transparent)]">
                        <AlertTriangle className="w-4 h-4 text-[var(--color-brand-orange)] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[var(--text-secondary)]">
                            Sau khi chuyển quyền, bạn sẽ không còn là chủ sự kiện. Người được chuyển quyền sẽ có toàn quyền quản lý sự kiện này.
                        </p>
                    </div>

                    {/* Eligible helpers from team */}
                    {eligibleMembers.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                                Thành viên helper trong team
                            </label>
                            <div className="space-y-2">
                                {eligibleMembers.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => handleSelectFromTeam(member)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                            selectedUser?.id === member.user_id
                                                ? 'border-[var(--color-brand-navy)] bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)]'
                                                : 'border-[var(--border-default)] hover:border-[var(--color-brand-navy)]/40'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-[color-mix(in_srgb,var(--color-brand-navy)_15%,transparent)] flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-[var(--color-brand-navy)]">
                                                {member.user.full_name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                                {member.user.full_name}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] truncate">
                                                {member.user.email}
                                            </p>
                                        </div>
                                        {selectedUser?.id === member.user_id && (
                                            <div className="w-2 h-2 rounded-full bg-[var(--color-brand-navy)] flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Search other organizers */}
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                            Hoặc tìm kiếm organizer khác
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Tìm theo tên, email, MSSV..."
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-2 focus:ring-[var(--color-brand-navy)]/10 transition-colors"
                            />
                            {searching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] animate-spin" />
                            )}
                        </div>

                        {searchResults.length > 0 && (
                            <div className="mt-2 rounded-xl border border-[var(--border-default)] bg-white shadow-lg py-1 max-h-48 overflow-y-auto">
                                {searchResults.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={() => {
                                            setSelectedUser(result);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-muted)] transition-colors ${
                                            selectedUser?.id === result.id ? 'bg-[var(--bg-muted)]' : ''
                                        }`}
                                    >
                                        <div className="w-7 h-7 rounded-full bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-bold text-[var(--color-brand-navy)]">
                                                {result.full_name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                                {result.full_name}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] truncate">
                                                {result.email}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected user summary */}
                    {selectedUser && (
                        <div className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_5%,transparent)] border border-[var(--color-brand-navy)]/20">
                            <p className="text-xs text-[var(--text-secondary)] mb-1">Sẽ chuyển quyền cho:</p>
                            <p className="text-sm font-bold text-[var(--color-brand-navy)]">
                                {selectedUser.full_name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">{selectedUser.email}</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleTransfer}
                        disabled={!selectedUser || submitting}
                        className="px-4 py-2 rounded-xl bg-[var(--color-brand-navy)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Xác nhận chuyển quyền
                    </button>
                </div>
            </div>
        </div>
    );
}
