'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Avatar from '@/components/ui/Avatar';
import Pagination from '@/components/ui/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserX, Shield } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { User } from '@/types';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = { admin: 'Admin', organizer: 'Ban tổ chức', student: 'Sinh viên' };
const roleBadgeVariant = (role: string) => role === 'admin' ? 'danger' as const : role === 'organizer' ? 'info' as const : 'neutral' as const;

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 0 });

    // Load users khi thay đổi filter hoặc page
    useEffect(() => {
        loadUsers();
    }, [page, search, roleFilter]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            // adminService.getUsers trả về { data: User[], pagination: {...} }
            const res = await adminService.getUsers({
                page,
                limit: 20,
                search: search || undefined,
                role: roleFilter || undefined,
            });
            setUsers(res?.data || []);
            setPagination(res?.pagination || { total: 0, page: 1, pageSize: 20, totalPages: 0 });
        } catch {
            toast.error('Không thể tải danh sách users');
        } finally {
            setLoading(false);
        }
    };

    // Toggle kích hoạt/vô hiệu hóa user
    const handleToggleActive = async (user: User) => {
        try {
            await adminService.updateUser(user.id, { is_active: !user.is_active });
            toast.success(user.is_active ? 'Đã vô hiệu hóa' : 'Đã kích hoạt');
            loadUsers();
        } catch {
            toast.error('Cập nhật thất bại');
        }
    };

    const totalActive = users.filter(u => u.is_active).length;
    const totalInactive = users.filter(u => !u.is_active).length;

    return (
        <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Quản lý người dùng</h1>
                    <p className="page-subtitle">Quản lý tài khoản trong hệ thống</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <Card variant="glass" padding="sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center"><Users size={18} /></div>
                        <div><p className="text-xs text-[var(--dash-text-muted)]">Tổng users</p><p className="text-lg font-bold">{pagination.total}</p></div>
                    </div>
                </Card>
                <Card variant="glass" padding="sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 text-green-500 flex items-center justify-center"><UserCheck size={18} /></div>
                        <div><p className="text-xs text-[var(--dash-text-muted)]">Đang hoạt động</p><p className="text-lg font-bold">{totalActive}</p></div>
                    </div>
                </Card>
                <Card variant="glass" padding="sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center"><UserX size={18} /></div>
                        <div><p className="text-xs text-[var(--dash-text-muted)]">Đã vô hiệu</p><p className="text-lg font-bold">{totalInactive}</p></div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card variant="glass" padding="md" className="mb-6">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <Input placeholder="Tìm kiếm theo tên, email, MSSV..." isSearch value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <Select
                        options={[
                            { value: '', label: 'Tất cả vai trò' },
                            { value: 'admin', label: 'Admin' },
                            { value: 'organizer', label: 'Ban tổ chức' },
                            { value: 'student', label: 'Sinh viên' },
                        ]}
                        value={roleFilter}
                        onChange={(v) => { setRoleFilter(v); setPage(1); }}
                    />
                </div>
            </Card>

            {/* Users table */}
            <Card variant="glass" padding="none">
                <div className="overflow-x-auto">
                    <table className="dash-table w-full">
                        <thead>
                            <tr>
                                <th>Người dùng</th>
                                <th>Email</th>
                                <th>MSSV</th>
                                <th>Vai trò</th>
                                <th>Khoa</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={7}><Skeleton height={40} /></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-8 text-[var(--dash-text-muted)]">Không tìm thấy người dùng</td></tr>
                            ) : (
                                users.map((user: any) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <Avatar name={user.full_name} size="sm" />
                                                <span className="font-medium">{user.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="text-[var(--dash-text-muted)]">{user.email}</td>
                                        <td className="text-[var(--dash-text-muted)]">{user.student_id || '—'}</td>
                                        <td><Badge variant={roleBadgeVariant(user.role)}>{roleLabels[user.role] || user.role}</Badge></td>
                                        <td className="text-[var(--dash-text-muted)]">{user.department?.name || '—'}</td>
                                        <td>
                                            <Badge variant={user.is_active ? 'success' : 'danger'} dot>
                                                {user.is_active ? 'Hoạt động' : 'Đã khóa'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user)}>
                                                {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                    <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
                </div>
            )}
        </motion.div>
        </DashboardLayout>
    );
}
