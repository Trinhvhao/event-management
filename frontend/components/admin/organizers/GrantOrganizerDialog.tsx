'use client';

import React, { useCallback, useState } from 'react';
import { Search, X } from 'lucide-react';
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
    const [granting, setGranting] = useState(false);

    const handleSearch = useCallback(async (query: string) => {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) return;

        setLoading(true);
        try {
            const response = await adminService.getUsers({
                search: normalizedQuery,
                role: 'student', // Only search non-organizer users
                limit: 10,
            });
            setSearchResults(response.data);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleGrant = async (userId: string) => {
        setGranting(true);
        try {
            await onGrant(userId);
            onClose();
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            console.error('Grant failed:', error);
        } finally {
            setGranting(false);
        }
    };

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                handleSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Grant Organizer Rights</h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-2 hover:bg-gray-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search Input */}
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>

                {/* Search Results */}
                <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2">Searching...</p>
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchQuery ? 'No users found' : 'Start typing to search for users'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{user.full_name}</p>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                        {user.department && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                {user.department.name}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleGrant(user.id)}
                                        disabled={granting}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {granting ? 'Granting...' : 'Grant Rights'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
