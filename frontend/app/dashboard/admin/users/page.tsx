'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAdminUserStore } from '@/store/adminUserStore';
import { DataTable } from '@/components/admin/shared/DataTable';
import { StatusChip } from '@/components/admin/shared/StatusChip';
import { BulkActionToolbar } from '@/components/admin/shared/BulkActionToolbar';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { UserDetailPanel } from '@/components/admin/users/UserDetailPanel';
import { Search, Lock, Unlock } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

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

export default function UserManagementPage() {
    const {
        users,
        selectedUsers,
        filters,
        pagination,
        loading,
        fetchUsers,
        updateFilters,
        lockUser,
        unlockUser,
        changeUserRole,
        bulkLock,
        bulkUnlock,
        toggleUserSelection,
        selectAllUsers,
        clearSelection,
        setPage,
        setPageSize,
    } = useAdminUserStore();

    const [searchInput, setSearchInput] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'lock' | 'unlock' | 'bulkLock' | 'bulkUnlock' | null;
        userId?: string;
    }>({
        isOpen: false,
        type: null,
    });

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ search: searchInput });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, updateFilters]);

    const handleLockClick = (userId: string) => {
        setConfirmDialog({ isOpen: true, type: 'lock', userId });
    };

    const handleUnlockClick = (userId: string) => {
        setConfirmDialog({ isOpen: true, type: 'unlock', userId });
    };

    const handleConfirmAction = async () => {
        try {
            if (confirmDialog.type === 'lock' && confirmDialog.userId) {
                await lockUser(confirmDialog.userId);
            } else if (confirmDialog.type === 'unlock' && confirmDialog.userId) {
                await unlockUser(confirmDialog.userId);
            } else if (confirmDialog.type === 'bulkLock') {
                await bulkLock(Array.from(selectedUsers));
                clearSelection();
            } else if (confirmDialog.type === 'bulkUnlock') {
                await bulkUnlock(Array.from(selectedUsers));
                clearSelection();
            }
        } catch (error) {
            console.error('Action failed:', error);
        }
    };

    const handleRowClick = (user: User) => {
        setSelectedUser(user);
        setShowDetailPanel(true);
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await changeUserRole(userId, newRole);
            setShowDetailPanel(false);
        } catch (error) {
            console.error('Role change failed:', error);
        }
    };

    const columns: ColumnDef<User>[] = [
        {
            id: 'select',
            header: () => (
                <input
                    type="checkbox"
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onChange={(e) => {
                        if (e.target.checked) {
                            selectAllUsers();
                        } else {
                            clearSelection();
                        }
                    }}
                    className="rounded border-gray-300"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={selectedUsers.has(row.original.id)}
                    onChange={() => toggleUserSelection(row.original.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-gray-300"
                />
            ),
        },
        {
            accessorKey: 'full_name',
            header: 'Full Name',
            enableSorting: true,
        },
        {
            accessorKey: 'email',
            header: 'Email',
            enableSorting: true,
        },
        {
            accessorKey: 'role',
            header: 'Role',
            cell: ({ row }) => (
                <span className="capitalize">{row.original.role}</span>
            ),
        },
        {
            accessorKey: 'department',
            header: 'Department',
            cell: ({ row }) => row.original.department?.name || 'N/A',
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            cell: ({ row }) => (
                <StatusChip status={row.original.is_active ? 'Active' : 'Locked'} />
            ),
        },
        {
            accessorKey: 'created_at',
            header: 'Registration Date',
            enableSorting: true,
            cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
        },
        {
            accessorKey: 'last_login',
            header: 'Last Login',
            enableSorting: true,
            cell: ({ row }) =>
                row.original.last_login
                    ? new Date(row.original.last_login).toLocaleDateString()
                    : 'Never',
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {row.original.is_active ? (
                        <button
                            onClick={() => handleLockClick(row.original.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                        >
                            Lock
                        </button>
                    ) : (
                        <button
                            onClick={() => handleUnlockClick(row.original.id)}
                            className="text-green-600 hover:text-green-800 text-sm"
                        >
                            Unlock
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <DashboardLayout>
        <div className="p-2">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
                <p className="text-gray-600 mt-1">
                    Tổng số: {pagination.total} người dùng
                </p>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <select
                    value={filters.role}
                    onChange={(e) => updateFilters({ role: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-md"
                >
                    <option value="">All Roles</option>
                    <option value="student">Student</option>
                    <option value="organizer">Organizer</option>
                    <option value="admin">Admin</option>
                </select>

                <select
                    value={filters.is_active}
                    onChange={(e) => updateFilters({ is_active: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-md"
                >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Locked</option>
                </select>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={users}
                pagination={{
                    pageIndex: pagination.page - 1,
                    pageSize: pagination.limit,
                }}
                onPaginationChange={(updater) => {
                    const newPagination = typeof updater === 'function' ? updater({ pageIndex: pagination.page - 1, pageSize: pagination.limit }) : updater;
                    if (newPagination.pageIndex !== pagination.page - 1) {
                        setPage(newPagination.pageIndex + 1);
                    }
                    if (newPagination.pageSize !== pagination.limit) {
                        setPageSize(newPagination.pageSize);
                    }
                }}
                onRowClick={handleRowClick}
                loading={loading}
                pageCount={pagination.totalPages}
                manualPagination
            />

            {/* Bulk Actions Toolbar */}
            <BulkActionToolbar
                selectedCount={selectedUsers.size}
                actions={[
                    {
                        label: 'Lock Selected',
                        onClick: () => setConfirmDialog({ isOpen: true, type: 'bulkLock' }),
                        variant: 'destructive',
                        icon: <Lock className="h-4 w-4" />,
                    },
                    {
                        label: 'Unlock Selected',
                        onClick: () => setConfirmDialog({ isOpen: true, type: 'bulkUnlock' }),
                        icon: <Unlock className="h-4 w-4" />,
                    },
                ]}
                onClearSelection={clearSelection}
            />

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ isOpen: false, type: null })}
                onConfirm={handleConfirmAction}
                title={
                    confirmDialog.type === 'lock'
                        ? 'Lock User'
                        : confirmDialog.type === 'unlock'
                            ? 'Unlock User'
                            : confirmDialog.type === 'bulkLock'
                                ? `Lock ${selectedUsers.size} Users`
                                : `Unlock ${selectedUsers.size} Users`
                }
                description={
                    confirmDialog.type?.includes('bulk')
                        ? `Are you sure you want to ${confirmDialog.type === 'bulkLock' ? 'lock' : 'unlock'} ${selectedUsers.size} users?`
                        : 'Are you sure you want to perform this action?'
                }
                variant={confirmDialog.type?.includes('lock') ? 'destructive' : 'default'}
            />

            {/* User Detail Panel */}
            <UserDetailPanel
                user={selectedUser}
                isOpen={showDetailPanel}
                onClose={() => setShowDetailPanel(false)}
                onRoleChange={handleRoleChange}
            />
        </div>
        </DashboardLayout>
    );
}
