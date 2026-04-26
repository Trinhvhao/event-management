'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAdminUserStore } from '@/store/adminUserStore';
import { categoryService } from '@/services/categoryService';
import { adminService } from '@/services/adminService';
import { DataTable } from '@/components/admin/shared/DataTable';
import { StatusChip } from '@/components/admin/shared/StatusChip';
import { BulkActionToolbar } from '@/components/admin/shared/BulkActionToolbar';
import { ConfirmDialog } from '@/components/admin/shared/ConfirmDialog';
import { UserDetailPanel } from '@/components/admin/users/UserDetailPanel';
import {
    Lock,
    RotateCcw,
    Search,
    Unlock,
    Users,
    SlidersHorizontal,
    UserCog,
    Upload,
    FileSpreadsheet,
    X,
    Download,
    AlertCircle,
    ChevronDown,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { ColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';

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

interface CSVPreviewRow {
    email: string;
    full_name: string;
    student_id?: string;
    role?: string;
    department_id?: string;
}

interface CSVImportResult {
    success: number;
    failed: number;
    errors: Array<{ row: number; email: string; error: string }>;
}

const DEFAULT_FILTERS = {
    search: '',
    role: '',
    department_id: '',
    is_active: '',
    sortBy: 'created_at',
    sortOrder: 'desc' as const,
};

const SORT_OPTIONS = [
    { value: 'created_at-asc', label: 'Ngày đăng ký (Cũ nhất)' },
    { value: 'created_at-desc', label: 'Ngày đăng ký (Mới nhất)' },
    { value: 'full_name-asc', label: 'Họ tên (A→Z)' },
    { value: 'full_name-desc', label: 'Họ tên (Z→A)' },
    { value: 'role-asc', label: 'Vai trò' },
    { value: 'last_login-desc', label: 'Đăng nhập gần nhất' },
];

const ROLE_LABELS: Record<User['role'], string> = {
    admin: 'Quản trị viên',
    organizer: 'Ban tổ chức',
    student: 'Sinh viên',
};

const ROLE_BADGE_VARIANTS: Record<User['role'], 'info' | 'warning' | 'success'> = {
    admin: 'info',
    organizer: 'warning',
    student: 'success',
};

const SORTABLE_FIELD_MAP: Record<string, string> = {
    full_name: 'full_name',
    role: 'role',
    created_at: 'created_at',
    last_login: 'last_login',
};

const formatDate = (dateString: string | null, withTime = false) => {
    if (!dateString) return 'Chưa đăng nhập';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('vi-VN', withTime
        ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' }
    );
};

const formatDepartment = (name: string | undefined): string => {
    if (!name) return '-';
    if (name.startsWith('Khoa Khoa')) return name.replace('Khoa ', '');
    if (name.startsWith('Khoa ')) return name.slice(5);
    return name;
};

const getInitials = (fullName: string) =>
    fullName.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');

const CSV_TEMPLATE = `email,full_name,student_id,role,department_id
student1@email.com,Nguyen Van A,SV001,student,1
student2@email.com,Tran Thi B,SV002,student,2
organizer1@email.com,Le Van C,,organizer,1`;

function ImportCSVModal({
    isOpen,
    onClose,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<CSVPreviewRow[]>([]);
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<CSVImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setFile(null);
        setPreview([]);
        setPreviewHeaders([]);
        setImporting(false);
        setResult(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = async (selectedFile: File) => {
        if (!selectedFile.name.endsWith('.csv')) {
            toast.error('Vui lòng chọn file CSV');
            return;
        }

        setFile(selectedFile);
        setResult(null);

        // Parse and preview the CSV
        const text = await selectedFile.text();
        const lines = text.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
            toast.error('File CSV phải có header và ít nhất 1 dòng dữ liệu');
            setFile(null);
            return;
        }

        // Parse headers
        const headers = parseCSVLine(lines[0]);
        setPreviewHeaders(headers);

        // Check required columns
        const requiredColumns = ['email', 'full_name'];
        const missingColumns = requiredColumns.filter(
            (col) => !headers.map((h) => h.toLowerCase()).includes(col.toLowerCase())
        );

        if (missingColumns.length > 0) {
            toast.error(`Thiếu cột bắt buộc: ${missingColumns.join(', ')}`);
            setFile(null);
            return;
        }

        // Parse preview rows (first 5)
        const previewRows: CSVPreviewRow[] = [];
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
            const values = parseCSVLine(lines[i]);
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            previewRows.push(row as CSVPreviewRow);
        }
        setPreview(previewRows);
    };

    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileChange(droppedFile);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await adminService.importUsers(formData);
            setResult({
                success: response.success,
                failed: response.failed,
                errors: response.errors || [],
            });

            if (response.success > 0) {
                toast.success(`Đã nhập ${response.success} người dùng thành công`);
                onSuccess();
            }

            if (response.failed > 0 && response.success === 0) {
                toast.error(`Không thể nhập người dùng: ${response.errors?.[0]?.error || 'Lỗi không xác định'}`);
            }
        } catch (error) {
            toast.error((error as Error).message || 'Có lỗi xảy ra khi nhập file');
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'users_import_template.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center">
                            <Upload className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Nhập người dùng từ CSV</h3>
                            <p className="text-xs text-[var(--text-muted)]">Tải lên file CSV để nhập nhiều người dùng cùng lúc</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
                    >
                        <X className="w-5 h-5 text-[var(--text-muted)]" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto flex-1">
                    {/* Required columns info */}
                    <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-blue-800 mb-1">Cột bắt buộc:</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">email</span>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">full_name</span>
                                </div>
                                <p className="text-xs text-blue-600 mt-2">
                                    Các cột tùy chọn: <span className="font-medium">student_id</span>, <span className="font-medium">role</span> (mặc định: student), <span className="font-medium">department_id</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Download template button */}
                    <button
                        onClick={downloadTemplate}
                        className="mb-5 inline-flex items-center gap-2 px-4 py-2 border-2 border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-muted)] transition-all text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Tải file mẫu
                    </button>

                    {/* Drop zone */}
                    {!file && (
                        <div
                            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                                isDragging
                                    ? 'border-[var(--color-brand-navy)] bg-[var(--color-brand-navy)]/5'
                                    : 'border-[var(--border-default)] hover:border-[var(--color-brand-navy)]/50 hover:bg-[var(--bg-muted)]/50'
                            }`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0];
                                    if (selectedFile) handleFileChange(selectedFile);
                                }}
                            />
                            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center mx-auto mb-4">
                                <FileSpreadsheet className="w-8 h-8 text-[var(--color-brand-navy)]" />
                            </div>
                            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                                Kéo thả file CSV vào đây hoặc click để chọn file
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                                File phải có định dạng .csv
                            </p>
                        </div>
                    )}

                    {/* Selected file & preview */}
                    {file && (
                        <div>
                            {/* Selected file info */}
                            <div className="flex items-center justify-between p-4 bg-[var(--bg-muted)] rounded-xl mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                        <FileSpreadsheet className="w-5 h-5 text-[var(--color-brand-navy)]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{file.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setPreview([]);
                                        setPreviewHeaders([]);
                                        setResult(null);
                                    }}
                                    className="p-2 rounded-lg hover:bg-white transition-colors"
                                >
                                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                                </button>
                            </div>

                            {/* Preview table */}
                            <div className="mb-4">
                                <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                                    Xem trước (5 dòng đầu tiên):
                                </p>
                                <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[var(--bg-muted)]">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">#</th>
                                                {previewHeaders.map((header) => (
                                                    <th key={header} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-[var(--border-light)]">
                                            {preview.map((row, index) => (
                                                <tr key={index} className="hover:bg-[var(--bg-muted)]/50">
                                                    <td className="px-3 py-2 text-xs text-[var(--text-muted)]">{index + 1}</td>
                                                    {previewHeaders.map((header) => (
                                                        <td key={header} className="px-3 py-2 text-[var(--text-secondary)]">
                                                            {row[header as keyof CSVPreviewRow] || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className={`p-4 rounded-xl ${result.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                {result.failed === 0 ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                )}
                                <div>
                                    <p className={`text-sm font-semibold ${result.failed === 0 ? 'text-green-800' : 'text-amber-800'}`}>
                                        Kết quả nhập: {result.success} thành công, {result.failed} thất bại
                                    </p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="max-h-40 overflow-y-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-white/50">
                                            <tr>
                                                <th className="px-2 py-1 text-left font-bold text-[var(--text-muted)]">Dòng</th>
                                                <th className="px-2 py-1 text-left font-bold text-[var(--text-muted)]">Email</th>
                                                <th className="px-2 py-1 text-left font-bold text-[var(--text-muted)]">Lỗi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white/50 divide-y divide-[var(--border-light)]">
                                            {result.errors.slice(0, 10).map((err, index) => (
                                                <tr key={index}>
                                                    <td className="px-2 py-1 text-[var(--text-secondary)]">{err.row}</td>
                                                    <td className="px-2 py-1 text-[var(--text-secondary)]">{err.email || '-'}</td>
                                                    <td className="px-2 py-1 text-red-600">{err.error}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {result.errors.length > 10 && (
                                        <p className="text-xs text-[var(--text-muted)] mt-2">
                                            ... và {result.errors.length - 10} lỗi khác
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--border-default)] bg-[var(--bg-muted)]/50">
                    <button
                        onClick={handleClose}
                        className="px-5 py-2.5 border-2 border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] font-semibold hover:bg-white transition-all text-sm"
                    >
                        {result ? 'Đóng' : 'Hủy'}
                    </button>
                    {file && !result && (
                        <button
                            onClick={handleImport}
                            disabled={importing || preview.length === 0}
                            className="px-5 py-2.5 bg-gradient-to-r from-[var(--color-brand-navy)] to-[#1a5fc8] text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[var(--shadow-brand)] text-sm"
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang nhập...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Nhập {preview.length} người dùng
                                </>
                            )}
                        </button>
                    )}
                    {result && result.failed > 0 && (
                        <button
                            onClick={() => {
                                setFile(null);
                                setPreview([]);
                                setPreviewHeaders([]);
                                setResult(null);
                            }}
                            className="px-5 py-2.5 bg-gradient-to-r from-[var(--color-brand-navy)] to-[#1a5fc8] text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-[var(--shadow-brand)] text-sm"
                        >
                            <Upload className="w-4 h-4" />
                            Thử lại với file khác
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

import { motion } from 'framer-motion';

export default function UserManagementPage() {
    const {
        users, selectedUsers, filters, pagination, loading,
        fetchUsers, updateFilters, lockUser, unlockUser, changeUserRole,
        bulkLock, bulkUnlock, toggleUserSelection, selectAllUsers,
        clearSelection, setPage, setPageSize,
    } = useAdminUserStore();

    const [searchInput, setSearchInput] = useState('');
    const initializedRef = useRef(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'lock' | 'unlock' | 'bulkLock' | 'bulkUnlock' | null;
        userId?: string;
    }>({ isOpen: false, type: null });
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        if (pagination.limit !== 10) {
            setPageSize(10);
            return;
        }

        fetchUsers();

        categoryService.getDepartments().then((data) => {
            setDepartments(data || []);
        }).catch(() => {
            setDepartments([]);
        });
    }, [fetchUsers, pagination.limit, setPageSize]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== filters.search) updateFilters({ search: searchInput });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, filters.search, updateFilters]);

    const handleLockClick = (userId: string) =>
        setConfirmDialog({ isOpen: true, type: 'lock', userId });

    const handleUnlockClick = (userId: string) =>
        setConfirmDialog({ isOpen: true, type: 'unlock', userId });

    const handleConfirmAction = async () => {
        try {
            if (confirmDialog.type === 'lock' && confirmDialog.userId) {
                await lockUser(confirmDialog.userId);
                toast.success('Đã khóa tài khoản người dùng');
            } else if (confirmDialog.type === 'unlock' && confirmDialog.userId) {
                await unlockUser(confirmDialog.userId);
                toast.success('Đã mở khóa tài khoản người dùng');
            } else if (confirmDialog.type === 'bulkLock') {
                await bulkLock(Array.from(selectedUsers));
                clearSelection();
                toast.success('Đã khóa các tài khoản đã chọn');
            } else if (confirmDialog.type === 'bulkUnlock') {
                await bulkUnlock(Array.from(selectedUsers));
                clearSelection();
                toast.success('Đã mở khóa các tài khoản đã chọn');
            }
        } catch {
            toast.error('Không thể thực hiện thao tác. Vui lòng thử lại.');
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
            toast.success('Đã cập nhật vai trò người dùng');
        } catch {
            toast.error('Không thể đổi vai trò. Vui lòng thử lại.');
        }
    };

    const handleImportSuccess = () => {
        setShowImportModal(false);
        fetchUsers();
    };

    const parseSortOption = (value: string) => {
        const [sortBy, sortOrder] = value.split('-');
        return { sortBy, sortOrder };
    };

    const currentSortValue = `${filters.sortBy}-${filters.sortOrder}`;

    const handleSortChange = (value: string) => {
        const { sortBy, sortOrder } = parseSortOption(value);
        updateFilters({ sortBy, sortOrder });
    };

    const sortingState: SortingState = useMemo(
        () => [{ id: filters.sortBy || 'created_at', desc: filters.sortOrder !== 'asc' }],
        [filters.sortBy, filters.sortOrder]
    );

    const hasCustomFilters =
        searchInput.trim().length > 0 ||
        filters.role !== DEFAULT_FILTERS.role ||
        filters.department_id !== DEFAULT_FILTERS.department_id ||
        filters.is_active !== DEFAULT_FILTERS.is_active ||
        filters.sortBy !== DEFAULT_FILTERS.sortBy ||
        filters.sortOrder !== DEFAULT_FILTERS.sortOrder;

    const resetFilters = () => {
        setSearchInput('');
        updateFilters(DEFAULT_FILTERS);
        clearSelection();
    };

    const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
        const nextSorting = typeof updater === 'function' ? updater(sortingState) : updater;
        if (!nextSorting.length) {
            updateFilters({ sortBy: DEFAULT_FILTERS.sortBy, sortOrder: DEFAULT_FILTERS.sortOrder });
            return;
        }
        const [first] = nextSorting;
        updateFilters({
            sortBy: SORTABLE_FIELD_MAP[first.id] || DEFAULT_FILTERS.sortBy,
            sortOrder: first.desc ? 'desc' : 'asc',
        });
    };

    const columns: ColumnDef<User>[] = [
        {
            id: 'select',
            header: () => (
                <input
                    type="checkbox"
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onChange={(e) => e.target.checked ? selectAllUsers() : clearSelection()}
                    className="h-4 w-4 rounded border-[var(--border-default)] text-[var(--color-brand-navy)] focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_40%,transparent)]"
                    aria-label="Chọn tất cả"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={selectedUsers.has(row.original.id)}
                    onChange={() => toggleUserSelection(row.original.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-[var(--border-default)] text-[var(--color-brand-navy)] focus:ring-[color-mix(in_srgb,var(--color-brand-navy)_40%,transparent)]"
                    aria-label={`Chọn ${row.original.full_name}`}
                />
            ),
            enableSorting: false,
            meta: { headerClassName: 'min-w-[48px]', cellClassName: 'min-w-[48px]', align: 'center' as const },
        },
        {
            accessorKey: 'full_name',
            header: 'Người dùng',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] text-[11px] font-bold text-white shadow-sm">
                        {getInitials(row.original.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{row.original.full_name}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]" title={row.original.email}>
                            {row.original.email}
                        </p>
                    </div>
                </div>
            ),
            meta: { headerClassName: 'w-[calc(100%-12rem)]', cellClassName: 'w-[calc(100%-12rem)]', align: 'left' as const },
        },
        {
            accessorKey: 'role',
            header: 'Vai trò',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <StatusChip
                        status={ROLE_LABELS[row.original.role]}
                        variant={ROLE_BADGE_VARIANTS[row.original.role]}
                    />
                </div>
            ),
            meta: { headerClassName: 'min-w-[140px]', cellClassName: 'min-w-[140px]', align: 'center' as const },
        },
        {
            accessorKey: 'department',
            header: 'Khoa',
            enableSorting: false,
            cell: ({ row }) => (
                <span className="text-sm text-[var(--text-secondary)] truncate block max-w-[180px]" title={formatDepartment(row.original.department?.name)}>
                    {formatDepartment(row.original.department?.name)}
                </span>
            ),
            meta: { headerClassName: 'min-w-[160px]', cellClassName: 'min-w-[160px]', align: 'left' as const },
        },
        {
            accessorKey: 'is_active',
            header: 'Trạng thái',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <StatusChip status={row.original.is_active ? 'Đang hoạt động' : 'Đã khóa'} />
                </div>
            ),
            meta: { headerClassName: 'min-w-[130px]', cellClassName: 'min-w-[130px]', align: 'center' as const },
        },
        {
            accessorKey: 'created_at',
            header: 'Ngày tạo',
            enableSorting: true,
            cell: ({ row }) => (
                <span className="text-sm text-[var(--text-secondary)]">{formatDate(row.original.created_at)}</span>
            ),
            meta: { headerClassName: 'min-w-[120px]', cellClassName: 'min-w-[120px]', align: 'left' as const },
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6 p-4 md:p-6">
                {/* Page header */}
                <section className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
                                <UserCog className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">
                                    User Management
                                </p>
                                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                                    Quản lý người dùng
                                </h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-brand-navy)] rounded-xl text-[var(--color-brand-navy)] font-semibold hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] transition-all text-sm"
                            >
                                <Upload className="w-4 h-4" />
                                Nhập CSV
                            </button>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-muted)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] shadow-sm">
                                <Users className="h-4 w-4 text-[var(--color-brand-navy)]" />
                                {pagination.total} tài khoản
                            </div>
                        </div>
                    </div>
                </section>

                {/* Filters */}
                <section className="rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                    <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                                <SlidersHorizontal className="w-4.5 h-4.5 text-[var(--color-brand-navy)]" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[var(--text-primary)]">Bộ lọc và tìm kiếm</h2>
                                <p className="text-xs text-[var(--text-muted)]">Tìm kiếm và lọc người dùng theo tiêu chí</p>
                            </div>
                        </div>
                        {hasCustomFilters && (
                            <button
                                onClick={resetFilters}
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-red)]/30 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] px-4 py-2 text-xs font-bold text-[var(--color-brand-red)] shadow-sm transition-all hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] active:scale-95"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Search */}
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Tìm kiếm</label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    placeholder="Nhập họ tên hoặc email..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="input-base pr-10"
                                    style={{ paddingLeft: '3.25rem' }}
                                />
                                {searchInput && (
                                    <button
                                        onClick={() => setSearchInput('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter controls */}
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {/* Role */}
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Vai trò</label>
                                <div className="relative">
                                    <select
                                        value={filters.role}
                                        onChange={(e) => updateFilters({ role: e.target.value })}
                                        className="input-base appearance-none pr-10"
                                    >
                                        <option value="">Tất cả vai trò</option>
                                        <option value="student">Sinh viên</option>
                                        <option value="organizer">Ban tổ chức</option>
                                        <option value="admin">Quản trị viên</option>
                                    </select>
                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Trạng thái</label>
                                <div className="relative">
                                    <select
                                        value={filters.is_active}
                                        onChange={(e) => updateFilters({ is_active: e.target.value })}
                                        className="input-base appearance-none pr-10"
                                    >
                                        <option value="">Tất cả trạng thái</option>
                                        <option value="true">Đang hoạt động</option>
                                        <option value="false">Đã khóa</option>
                                    </select>
                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                                    </div>
                                </div>
                            </div>

                            {/* Department */}
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Khoa/Phòng</label>
                                <div className="relative">
                                    <select
                                        value={filters.department_id}
                                        onChange={(e) => updateFilters({ department_id: e.target.value })}
                                        className="input-base appearance-none pr-10"
                                    >
                                        <option value="">Tất cả khoa</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                                    </div>
                                </div>
                            </div>

                            {/* Sort — merged into single dropdown */}
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Sắp xếp</label>
                                <div className="relative">
                                    <select
                                        value={currentSortValue}
                                        onChange={(e) => handleSortChange(e.target.value)}
                                        className="input-base appearance-none pr-10"
                                    >
                                        {SORT_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Active filter summary */}
                        {hasCustomFilters && (
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-muted)] px-4 py-2.5">
                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Bộ lọc:</span>
                                {searchInput && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm border border-[var(--border-default)]">
                                        Tìm: &ldquo;{searchInput}&rdquo;
                                    </span>
                                )}
                                {filters.role && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm border border-[var(--border-default)]">
                                        Vai trò: {ROLE_LABELS[filters.role as User['role']]}
                                    </span>
                                )}
                                {filters.department_id && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm border border-[var(--border-default)]">
                                        Khoa: {formatDepartment(departments.find(d => d.id === filters.department_id)?.name) || filters.department_id}
                                    </span>
                                )}
                                {filters.is_active && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm border border-[var(--border-default)]">
                                        {filters.is_active === 'true' ? 'Đang hoạt động' : 'Đã khóa'}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* Table */}
                <section className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
                    <div className="border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--bg-muted)]/50 to-transparent px-5 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                                    <Users className="w-4 h-4 text-[var(--color-brand-navy)]" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Danh sách người dùng</h2>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Trang {pagination.page} / {Math.max(pagination.totalPages, 1)} — {pagination.total} tài khoản
                                    </p>
                                </div>
                            </div>
                            {selectedUsers.size > 0 && (
                                <div className="rounded-lg bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] px-3 py-1.5">
                                    <p className="text-sm font-bold text-[var(--color-brand-navy)]">
                                        Đã chọn {selectedUsers.size} tài khoản
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 md:p-5">
                        <DataTable
                            columns={columns}
                            data={users}
                            pagination={{ pageIndex: pagination.page - 1, pageSize: pagination.limit }}
                            onPaginationChange={(updater) => {
                                const current = { pageIndex: pagination.page - 1, pageSize: pagination.limit };
                                const next = typeof updater === 'function' ? updater(current) : updater;
                                if (next.pageIndex !== pagination.page - 1) setPage(next.pageIndex + 1);
                            }}
                            sorting={sortingState}
                            onSortingChange={handleSortingChange}
                            onRowClick={handleRowClick}
                            loading={loading}
                            pageCount={pagination.totalPages}
                            totalRows={pagination.total}
                            manualPagination
                            manualSorting
                            emptyTitle="Không tìm thấy người dùng"
                            emptyDescription="Thử thay đổi từ khóa hoặc điều chỉnh bộ lọc để mở rộng kết quả."
                        />
                    </div>
                </section>

                {/* Bulk actions */}
                <BulkActionToolbar
                    selectedCount={selectedUsers.size}
                    actions={[
                        {
                            label: 'Khóa đã chọn',
                            onClick: () => setConfirmDialog({ isOpen: true, type: 'bulkLock' }),
                            variant: 'destructive',
                            icon: <Lock className="h-4 w-4" />,
                        },
                        {
                            label: 'Mở khóa đã chọn',
                            onClick: () => setConfirmDialog({ isOpen: true, type: 'bulkUnlock' }),
                            icon: <Unlock className="h-4 w-4" />,
                        },
                    ]}
                    onClearSelection={clearSelection}
                />

                {/* Confirm dialog */}
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog({ isOpen: false, type: null })}
                    onConfirm={handleConfirmAction}
                    title={
                        confirmDialog.type === 'lock'
                            ? 'Khóa tài khoản'
                            : confirmDialog.type === 'unlock'
                                ? 'Mở khóa tài khoản'
                                : confirmDialog.type === 'bulkLock'
                                    ? `Khóa ${selectedUsers.size} tài khoản`
                                    : `Mở khóa ${selectedUsers.size} tài khoản`
                    }
                    description={
                        confirmDialog.type?.includes('bulk')
                            ? `Bạn có chắc muốn ${confirmDialog.type === 'bulkLock' ? 'khóa' : 'mở khóa'} ${selectedUsers.size} tài khoản đã chọn?`
                            : 'Bạn có chắc muốn thực hiện thao tác này?'
                    }
                    variant={confirmDialog.type?.includes('lock') ? 'destructive' : 'default'}
                    confirmText={confirmDialog.type?.includes('lock') ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
                    cancelText="Hủy"
                />

                {/* Detail panel */}
                <UserDetailPanel
                    user={selectedUser}
                    isOpen={showDetailPanel}
                    onClose={() => setShowDetailPanel(false)}
                    onRoleChange={handleRoleChange}
                    onLock={handleLockClick}
                    onUnlock={handleUnlockClick}
                />

                {/* Import CSV Modal */}
                <ImportCSVModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={handleImportSuccess}
                />
            </div>
        </DashboardLayout>
    );
}
