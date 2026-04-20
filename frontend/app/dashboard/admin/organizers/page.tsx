'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useOrganizerStore } from '@/store/organizerStore';
import { DataTable } from '@/components/admin/shared/DataTable';
import { StatusChip } from '@/components/admin/shared/StatusChip';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { KPIMetricsDisplay } from '@/components/admin/organizers/KPIMetricsDisplay';
import { GrantOrganizerDialog } from '@/components/admin/organizers/GrantOrganizerDialog';
import { Search, UserPlus, UserMinus, BarChart3, X } from 'lucide-react';
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
    eventsByCategory?: Array<{
      categoryId: string;
      categoryName: string;
      count: number;
    }>;
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
    fetchOrganizerMetrics,
    setPage,
    setPageSize,
  } = useOrganizerStore();

  const [searchInput, setSearchInput] = useState('');
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<Organizer['metrics'] | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [revokeDialog, setRevokeDialog] = useState<{
    isOpen: boolean;
    organizerId?: string;
    organizerName?: string;
  }>({
    isOpen: false,
  });

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({ search: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, updateFilters]);

  const fetchDetailedMetrics = useCallback(
    async (organizerId: string, from?: string, to?: string) => {
      try {
        setMetricsLoading(true);
        setMetricsError(null);
        const metrics = await fetchOrganizerMetrics(organizerId, from || undefined, to || undefined);
        setSelectedMetrics(metrics);
      } catch {
        setMetricsError('Không thể tải KPI chi tiết cho organizer này.');
      } finally {
        setMetricsLoading(false);
      }
    },
    [fetchOrganizerMetrics]
  );

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

  const handleOpenMetrics = (organizer: Organizer) => {
    setSelectedOrganizer(organizer);
    setSelectedMetrics(organizer.metrics || null);
    setMetricsError(null);
    setDateFrom('');
    setDateTo('');
    setIsMetricsOpen(true);
    fetchDetailedMetrics(organizer.id);
  };

  const topCategoryCount = useMemo(() => {
    if (!selectedMetrics?.eventsByCategory || selectedMetrics.eventsByCategory.length === 0) {
      return 0;
    }
    return Math.max(...selectedMetrics.eventsByCategory.map((item) => item.count));
  }, [selectedMetrics]);

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
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenMetrics(row.original);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
          >
            <BarChart3 className="h-4 w-4" />
            KPI
          </button>
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
        </div>
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
        onRowClick={handleOpenMetrics}
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

      {isMetricsOpen && selectedOrganizer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMetricsOpen(false)}
          />

          <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">KPI Organizer</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedOrganizer.full_name} - {selectedOrganizer.email}
                  </p>
                </div>
                <button
                  onClick={() => setIsMetricsOpen(false)}
                  className="rounded-md p-2 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-b px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-xs text-gray-500">
                  Từ ngày
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Đến ngày
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => {
                      if (!selectedOrganizer) return;
                      fetchDetailedMetrics(selectedOrganizer.id, dateFrom, dateTo);
                    }}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Áp dụng
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedOrganizer) return;
                      setDateFrom('');
                      setDateTo('');
                      fetchDetailedMetrics(selectedOrganizer.id);
                    }}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Xóa lọc
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {metricsError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {metricsError}
                  </div>
                )}

                {metricsLoading ? (
                  <div className="flex items-center justify-center py-10 text-gray-500">
                    Đang tải KPI chi tiết...
                  </div>
                ) : selectedMetrics ? (
                  <>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <KPIMetricsDisplay metrics={selectedMetrics} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Sự kiện sắp tới</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {selectedMetrics.upcomingEvents}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Sự kiện hoàn thành</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {selectedMetrics.completedEvents}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Điểm đánh giá TB</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-1">
                          {selectedMetrics.averageRating.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Phân bổ sự kiện theo danh mục</h3>

                      {selectedMetrics.eventsByCategory && selectedMetrics.eventsByCategory.length > 0 ? (
                        <div className="space-y-3">
                          {selectedMetrics.eventsByCategory.map((item) => {
                            const width = topCategoryCount > 0 ? (item.count / topCategoryCount) * 100 : 0;

                            return (
                              <div key={item.categoryId}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-700">{item.categoryName}</span>
                                  <span className="font-medium text-gray-900">{item.count}</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-blue-500"
                                    style={{ width: `${width}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Không có dữ liệu danh mục trong khoảng thời gian đã chọn.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Chưa có dữ liệu KPI chi tiết.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
