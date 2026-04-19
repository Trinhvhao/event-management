'use client';

import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Building, Calendar, Shield } from 'lucide-react';
import { AuditLogViewer } from '../shared/AuditLogViewer';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { adminService } from '@/services/adminService';

interface User {
    id: string;
    full_name: string;
    email: string;
    role: 'admin' | 'organizer' | 'student';
    department?: {
        id: string;
        name: string;
    };
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

interface UserDetailPanelProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onRoleChange: (userId: string, newRole: string) => void;
}

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

export function UserDetailPanel({ user, isOpen, onClose, onRoleChange }: UserDetailPanelProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'audit'>('info');
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [showRoleDialog, setShowRoleDialog] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');

    useEffect(() => {
        if (user && activeTab === 'audit') {
            fetchAuditLogs();
        }
    }, [user, activeTab]);

    const fetchAuditLogs = async () => {
        if (!user) return;
        setAuditLoading(true);
        try {
            const response = await adminService.getUserAuditLogs(user.id);
            setAuditLogs(response.data);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setAuditLoading(false);
        }
    };

    const handleRoleChangeClick = (role: string) => {
        setSelectedRole(role);
        setShowRoleDialog(true);
    };

    const handleRoleChangeConfirm = async () => {
        if (!user) return;
        await onRoleChange(user.id, selectedRole);
        setShowRoleDialog(false);
    };

    if (!isOpen || !user) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 overflow-hidden">
                <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

                <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
                    <div className="flex h-full flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
                            <button
                                onClick={onClose}
                                className="rounded-md p-2 hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="border-b">
                            <div className="flex px-6">
                                <button
                                    onClick={() => setActiveTab('info')}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'info'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Information
                                </button>
                                <button
                                    onClick={() => setActiveTab('audit')}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'audit'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Audit Log
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'info' && (
                                <div className="space-y-6">
                                    {/* User Info */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <UserIcon className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-500">Full Name</p>
                                                <p className="font-medium">{user.full_name}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-500">Email</p>
                                                <p className="font-medium">{user.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Building className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-500">Department</p>
                                                <p className="font-medium">{user.department?.name || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-500">Joined</p>
                                                <p className="font-medium">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-500">Last Login</p>
                                                <p className="font-medium">
                                                    {user.last_login
                                                        ? new Date(user.last_login).toLocaleString()
                                                        : 'Never'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Role Change */}
                                    <div className="border-t pt-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Shield className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm text-gray-500">Current Role</p>
                                                <p className="font-medium capitalize">{user.role}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium text-gray-700 mb-2">Change Role</p>
                                            <div className="flex gap-2">
                                                {['student', 'organizer', 'admin'].map((role) => (
                                                    <button
                                                        key={role}
                                                        onClick={() => handleRoleChangeClick(role)}
                                                        disabled={user.role === role}
                                                        className={`px-4 py-2 rounded-md text-sm font-medium ${user.role === role
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                            }`}
                                                    >
                                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'audit' && (
                                <AuditLogViewer logs={auditLogs} loading={auditLoading} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showRoleDialog}
                onClose={() => setShowRoleDialog(false)}
                onConfirm={handleRoleChangeConfirm}
                title="Change User Role"
                description={`Are you sure you want to change ${user.full_name}'s role to ${selectedRole}?`}
                confirmText="Change Role"
                variant="default"
            />
        </>
    );
}
