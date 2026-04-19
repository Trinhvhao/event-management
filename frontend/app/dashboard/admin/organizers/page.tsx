'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useOrganizerStore } from '@/store/organizerStore';
import { DataTable } from '@/components/admin/shared/DataTable';
import { StatusChip } from '@/components/admin/shared/StatusChip';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { KPIMetricsDisplay } from '@/components/admin/organizers/KPIMetricsDisplay';
import { GrantOrganizerDialog } from '@/components/admin/organizers/GrantOrganizerDialog';
import { Search, UserPlus, UserMinus } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

interface Organizer {
  id: string;
  full_name: string;
  email: string;
  department?: {
    id: string;
    name: string;
  };
  is_active: boolean;
  metrics?: {
    eventsCreated: number;
    totalAttendees: number;
    averageRating: number;
    upcomingEvents: number;
    completedEvents: number;
  };
}

export default function OrganizerManagementPage() {
  const {
    organizers,
    filters,
    pagination,
    loading,
    fetchOrganizers,
    updateFilters,
    grantOrganizerRights,
    revokeOrganizerRights,
    setPage,
    setPageSize,
  } = useOrganizerStore();

  const [searchInput, setSearchInput] = useState('');
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [revokeDialog, setRevokeDialog] = useState<{
    isOpen: boolean;
    organizerId?: string;
    organizerName?: string;
  }>({
    isOpen: false,
  });

  useEffect(() => {
    fetchOrganizers();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({ search: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleGrantRights = async (userId: string) => {
    try {
      await grantOrganizerRights(userId);
    } catch (error) {
      console.error('Grant failed:', error);
    }
  };

  const handleRevokeClick = (organizer: Organizer) => {
    setRevokeDialog({
      isOpen: true,
      organizerId: organizer.id,
      organizerName: organizer.full_name,
    });
  };

  const handleRevokeConfirm = async () => {
    if (!revokeDialog.organizerId) return;
    try {
      await revokeOrganizerRights(revokeDialog.organizerId);
      setRevokeDialog({ isOpen: false });
    } catch (error) {
      console.error('Revoke failed:', error);
    }
  };

  const columns: ColumnDef<Organizer>[] = [
    {
      accessorKey: 'full_name',
      header: 'Name',
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.department?.name || 'N/A',
    },
    {
      id: 'metrics',
      header: 'KPI Metrics',
      cell: ({ row }) =>
        row.original.metrics ? (
          <KPIMetricsDisplay metrics={row.original.metrics} />
        ) : (
          <span className="text-gray-400 text-sm">Loading...</span>
        ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <StatusChip status={row.original.is_active ? 'Active' : 'Inactive'} />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRevokeClick(row.original);
          }}
          className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
        >
          <UserMinus className="h-4 w-4" />
          Revoke
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout>
    <div className="p-2">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Ban tổ chức</h1>
          <p className="text-gray-600 mt-1">
            Tổng: {pagination.total} organizer
          </p>
        </div>
        <button
          onClick={() => setShowGrantDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <UserPlus className="h-5 w-5" />
          Cấp quyền Organizer
        </button>
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
          value={filters.status}
          onChange={(e) => updateFilters({ status: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => updateFilters({ sortBy: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="eventsCreated">Sort by Events</option>
          <option value="totalAttendees">Sort by Attendees</option>
          <option value="averageRating">Sort by Rating</option>
        </select>

        <select
          value={filters.sortOrder}
          onChange={(e) => updateFilters({ sortOrder: e.target.value as 'asc' | 'desc' })}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={organizers}
        pagination={{
          pageIndex: pagination.page - 1,
          pageSize: pagination.limit,
        }}
        onPaginationChange={(updater) => {
          const currentState = { pageIndex: pagination.page - 1, pageSize: pagination.limit };
          const newPagination = typeof updater === 'function' ? updater(currentState) : updater;
          if (newPagination.pageIndex !== pagination.page - 1) {
            setPage(newPagination.pageIndex + 1);
          }
          if (newPagination.pageSize !== pagination.limit) {
            setPageSize(newPagination.pageSize);
          }
        }}
        loading={loading}
        pageCount={pagination.totalPages}
        manualPagination
      />

      {/* Grant Dialog */}
      <GrantOrganizerDialog
        isOpen={showGrantDialog}
        onClose={() => setShowGrantDialog(false)}
        onGrant={handleGrantRights}
      />

      {/* Revoke Confirm Dialog */}
      <ConfirmDialog
        isOpen={revokeDialog.isOpen}
        onClose={() => setRevokeDialog({ isOpen: false })}
        onConfirm={handleRevokeConfirm}
        title="Revoke Organizer Rights"
        description={`Are you sure you want to revoke organizer rights from ${revokeDialog.organizerName}? This action cannot be undone.`}
        confirmText="Revoke Rights"
        variant="destructive"
      />
    </div>
    </DashboardLayout>
  );
}
