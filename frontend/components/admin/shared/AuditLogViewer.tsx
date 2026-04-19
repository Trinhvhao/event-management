'use client';

import React from 'react';
import { Clock, User, AlertCircle } from 'lucide-react';

interface AuditLogEntry {
    id: string;
    action_type: string;
    admin_id: string;
    user_id: string | null;
    entity_type: string;
    entity_id: string;
    old_value: unknown;
    new_value: unknown;
    metadata: unknown;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    admin?: {
        full_name: string;
        email: string;
    };
    user?: {
        full_name: string;
        email: string;
    };
}

interface AuditLogViewerProps {
    logs: AuditLogEntry[];
    loading?: boolean;
    pagination?: {
        page: number;
        limit: number;
        total: number;
    };
    onPageChange?: (page: number) => void;
}

const criticalActions = [
    'user_deleted',
    'role_changed',
    'organizer_revoked',
    'category_deleted',
    'department_deleted',
];

export function AuditLogViewer({
    logs,
    loading = false,
    pagination,
    onPageChange,
}: AuditLogViewerProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isCritical = (actionType: string) => {
        return criticalActions.includes(actionType);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading audit logs...</span>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                No audit logs found
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div
                    key={log.id}
                    className={`border rounded-lg p-4 ${isCritical(log.action_type)
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-white'
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            {/* Action Header */}
                            <div className="flex items-center gap-2 mb-2">
                                {isCritical(log.action_type) && (
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span
                                    className={`font-medium ${isCritical(log.action_type)
                                            ? 'text-red-900'
                                            : 'text-gray-900'
                                        }`}
                                >
                                    {log.action_type.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            </div>

                            {/* Admin Info */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                <User className="h-4 w-4" />
                                <span>
                                    By: {log.admin?.full_name || 'Unknown'} ({log.admin?.email || 'N/A'})
                                </span>
                            </div>

                            {/* Target User Info */}
                            {log.user && (
                                <div className="text-sm text-gray-600 mb-1">
                                    Target: {log.user.full_name} ({log.user.email})
                                </div>
                            )}

                            {/* Entity Info */}
                            <div className="text-sm text-gray-600 mb-2">
                                Entity: {log.entity_type} (ID: {log.entity_id})
                            </div>

                            {/* Changes */}
                            {Boolean(log.old_value) && Boolean(log.new_value) && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                    <div className="font-medium text-gray-700 mb-1">Changes:</div>
                                    <div className="space-y-1">
                                        <div className="text-red-600">
                                            - Old: {JSON.stringify(log.old_value)}
                                        </div>
                                        <div className="text-green-600">
                                            + New: {JSON.stringify(log.new_value)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatDate(log.created_at)}
                        </div>
                    </div>
                </div>
            ))}

            {/* Pagination */}
            {pagination && onPageChange && (
                <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm text-gray-600">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} entries
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={
                                pagination.page >= Math.ceil(pagination.total / pagination.limit)
                            }
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
