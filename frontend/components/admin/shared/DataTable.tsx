'use client';

import React from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    RowSelectionState,
    PaginationState,
    OnChangeFn,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Database } from 'lucide-react';

interface DataTableProps<TData> {
    columns: ColumnDef<TData, unknown>[];
    data: TData[];
    pagination?: PaginationState;
    onPaginationChange?: OnChangeFn<PaginationState>;
    sorting?: SortingState;
    onSortingChange?: OnChangeFn<SortingState>;
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    onRowClick?: (row: TData) => void;
    loading?: boolean;
    pageCount?: number;
    totalRows?: number;
    manualPagination?: boolean;
    manualSorting?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
}

type TableColumnMeta = {
    headerClassName?: string;
    cellClassName?: string;
    align?: 'left' | 'center' | 'right';
};

export function DataTable<TData>({
    columns,
    data,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    rowSelection,
    onRowSelectionChange,
    onRowClick,
    loading = false,
    pageCount,
    totalRows,
    manualPagination = false,
    manualSorting = false,
    emptyTitle = 'Không có dữ liệu',
    emptyDescription = 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.',
}: DataTableProps<TData>) {
    const safeRowSelection: RowSelectionState = rowSelection ?? {};

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
        getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
        onPaginationChange,
        onSortingChange,
        onRowSelectionChange,
        state: { pagination, sorting, rowSelection: safeRowSelection },
        pageCount,
        manualPagination,
        manualSorting,
    });

    const resolvedPageCount = Math.max(pageCount || table.getPageCount(), 1);
    const resolvedTotalRows = typeof totalRows === 'number'
        ? totalRows
        : manualPagination
            ? data.length
            : table.getFilteredRowModel().rows.length;

    const pageStart = pagination
        ? resolvedTotalRows === 0
            ? 0
            : pagination.pageIndex * pagination.pageSize + 1
        : 0;
    const pageEnd = pagination
        ? Math.min((pagination.pageIndex + 1) * pagination.pageSize, resolvedTotalRows)
        : 0;

    const alignClass = (align?: 'left' | 'center' | 'right') => {
        if (align === 'center') return 'justify-center';
        if (align === 'right')  return 'justify-end';
        return 'justify-start';
    };
    const textAlignClass = (align?: 'left' | 'center' | 'right') => {
        if (align === 'center') return 'text-center';
        if (align === 'right')  return 'text-right';
        return 'text-left';
    };

    const thClass = 'px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] bg-[var(--bg-muted)]';
    const tdClass = 'px-4 py-3 align-middle text-sm text-[var(--text-primary)]';

    return (
        <div className="w-full space-y-4">
            <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const colMeta = header.column.columnDef.meta as TableColumnMeta | undefined;
                                        const align = colMeta?.align || 'left';
                                        return (
                                            <th
                                                key={header.id}
                                                className={`${thClass} ${textAlignClass(align)} ${colMeta?.headerClassName || ''}`}
                                            >
                                                {header.isPlaceholder ? null : (
                                                    <div
                                                        className={`inline-flex items-center gap-1.5 ${alignClass(align)} ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                                                        onClick={header.column.getToggleSortingHandler()}
                                                    >
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                        {header.column.getCanSort() && (
                                                            <span className="text-[var(--text-muted)]">
                                                                {header.column.getIsSorted() === 'asc' ? (
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                ) : header.column.getIsSorted() === 'desc' ? (
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-[var(--border-light)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-14 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-7 h-7 rounded-full border-2 border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                                            <span className="text-sm text-[var(--text-muted)] font-medium">Đang tải dữ liệu...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length}>
                                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                                                <Database className="w-7 h-7 text-[var(--text-muted)]" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-[var(--text-secondary)]">{emptyTitle}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">{emptyDescription}</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row, rowIndex) => {
                                    const isSelected = Boolean(safeRowSelection[row.id]);
                                    const isEven = rowIndex % 2 === 0;

                                    return (
                                    <tr
                                        key={row.id}
                                        className={`transition-colors duration-150 ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-[color-mix(in_srgb,var(--color-brand-navy)_6%,transparent)]' : isEven ? 'bg-white' : 'bg-[color-mix(in_srgb,var(--color-brand-navy)_2%,transparent)]'} hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_5%,transparent)]`}
                                        onClick={() => onRowClick?.(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => {
                                            const colMeta = cell.column.columnDef.meta as TableColumnMeta | undefined;
                                            const align = colMeta?.align || 'left';
                                            return (
                                                <td
                                                    key={cell.id}
                                                    className={`${tdClass} ${textAlignClass(align)} ${colMeta?.cellClassName || ''}`}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pagination && onPaginationChange && (
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-default)] bg-white px-5 py-3 shadow-[var(--shadow-xs)] sm:flex-row sm:items-center sm:justify-between">
                    {/* Row count */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--text-muted)]">
                            Hiển thị{' '}
                            <span className="font-bold text-[var(--text-primary)]">{pageStart}–{pageEnd}</span>
                            {' / '}
                            <span className="font-bold text-[var(--text-primary)]">{resolvedTotalRows}</span>
                        </span>
                        <select
                            value={pagination.pageSize}
                            onChange={(e) =>
                                onPaginationChange({ ...pagination, pageSize: Number(e.target.value), pageIndex: 0 })
                            }
                            className="h-8 rounded-lg border border-[var(--border-default)] bg-white px-2.5 text-sm font-medium text-[var(--text-secondary)] shadow-sm focus:outline-none focus:border-[var(--color-brand-navy)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)]"
                        >
                            {[10, 20, 50, 100].map((size) => (
                                <option key={size} value={size}>{size} / trang</option>
                            ))}
                        </select>
                    </div>

                    {/* Page nav */}
                    <div className="flex items-center gap-1.5">
                        <span className="mr-2 text-sm text-[var(--text-muted)]">
                            Trang{' '}
                            <span className="font-bold text-[var(--text-primary)]">{pagination.pageIndex + 1}</span>
                            {' / '}
                            <span className="font-bold text-[var(--text-primary)]">{resolvedPageCount}</span>
                        </span>

                        <button
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: 0 })}
                            disabled={pagination.pageIndex === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-white text-[var(--text-muted)] transition-colors hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Trang đầu tiên"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex - 1 })}
                            disabled={pagination.pageIndex === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-white text-[var(--text-muted)] transition-colors hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Trang trước"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
                            disabled={pagination.pageIndex >= resolvedPageCount - 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-white text-[var(--text-muted)] transition-colors hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Trang sau"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onPaginationChange({ ...pagination, pageIndex: resolvedPageCount - 1 })}
                            disabled={pagination.pageIndex >= resolvedPageCount - 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-white text-[var(--text-muted)] transition-colors hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Trang cuối cùng"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
