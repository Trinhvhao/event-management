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
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

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
    manualPagination?: boolean;
    manualSorting?: boolean;
}

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
    manualPagination = false,
    manualSorting = false,
}: DataTableProps<TData>) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
        getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
        onPaginationChange,
        onSortingChange,
        onRowSelectionChange,
        state: {
            pagination,
            sorting,
            rowSelection,
        },
        pageCount,
        manualPagination,
        manualSorting,
    });

    return (
        <div className="w-full">
            <div className="rounded-md border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    className={
                                                        header.column.getCanSort()
                                                            ? 'flex items-center gap-2 cursor-pointer select-none'
                                                            : ''
                                                    }
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {header.column.getCanSort() && (
                                                        <span className="text-gray-400">
                                                            {header.column.getIsSorted() === 'asc' ? (
                                                                <ChevronUp className="h-4 w-4" />
                                                            ) : header.column.getIsSorted() === 'desc' ? (
                                                                <ChevronDown className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronsUpDown className="h-4 w-4" />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-6 py-12 text-center text-gray-500"
                                    >
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <span className="ml-3">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-6 py-12 text-center text-gray-500"
                                    >
                                        No data available
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''
                                            }`}
                                        onClick={() => onRowClick?.(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td
                                                key={cell.id}
                                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {pagination && onPaginationChange && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 mt-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                            Page {pagination.pageIndex + 1} of {pageCount || table.getPageCount()}
                        </span>
                        <select
                            value={pagination.pageSize}
                            onChange={(e) =>
                                onPaginationChange({
                                    ...pagination,
                                    pageSize: Number(e.target.value),
                                    pageIndex: 0,
                                })
                            }
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                        >
                            {[10, 20, 50, 100].map((size) => (
                                <option key={size} value={size}>
                                    {size} per page
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() =>
                                onPaginationChange({
                                    ...pagination,
                                    pageIndex: 0,
                                })
                            }
                            disabled={pagination.pageIndex === 0}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            First
                        </button>
                        <button
                            onClick={() =>
                                onPaginationChange({
                                    ...pagination,
                                    pageIndex: pagination.pageIndex - 1,
                                })
                            }
                            disabled={pagination.pageIndex === 0}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() =>
                                onPaginationChange({
                                    ...pagination,
                                    pageIndex: pagination.pageIndex + 1,
                                })
                            }
                            disabled={
                                pagination.pageIndex >= (pageCount || table.getPageCount()) - 1
                            }
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Next
                        </button>
                        <button
                            onClick={() =>
                                onPaginationChange({
                                    ...pagination,
                                    pageIndex: (pageCount || table.getPageCount()) - 1,
                                })
                            }
                            disabled={
                                pagination.pageIndex >= (pageCount || table.getPageCount()) - 1
                            }
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
