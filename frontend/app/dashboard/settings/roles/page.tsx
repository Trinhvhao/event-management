'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminService } from '@/services/adminService';
import { User, UserRole } from '@/types';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type RoleSummary = {
  total: number;
  active: number;
  inactive: number;
  percentage: number;
};

type RoleMatrixState = Record<UserRole, { permissions: string[] }>;

const DEFAULT_ROLE_SUMMARY: Record<UserRole, RoleSummary> = {
  admin: { total: 0, active: 0, inactive: 0, percentage: 0 },
  organizer: { total: 0, active: 0, inactive: 0, percentage: 0 },
  student: { total: 0, active: 0, inactive: 0, percentage: 0 },
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  organizer: 'Ban tổ chức',
  student: 'Sinh viên',
};

const formatPermission = (permission: string): string =>
  permission.replace(':', ' / ').replace(/_/g, ' ');

export default function SettingsRolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roleStats, setRoleStats] = useState<Record<UserRole, RoleSummary>>(DEFAULT_ROLE_SUMMARY);
  const [roleMatrix, setRoleMatrix] = useState<RoleMatrixState | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [usersResponse, roleStatistics, matrix] = await Promise.all([
        adminService.getUsers({ page: 1, limit: 100 }),
        adminService.getRoleStatistics(),
        adminService.getRoleMatrix(),
      ]);

      setUsers(usersResponse.data || []);
      setTotalUsers(roleStatistics.totalUsers || 0);

      const nextStats: Record<UserRole, RoleSummary> = {
        admin: { ...DEFAULT_ROLE_SUMMARY.admin },
        organizer: { ...DEFAULT_ROLE_SUMMARY.organizer },
        student: { ...DEFAULT_ROLE_SUMMARY.student },
      };

      for (const row of roleStatistics.byRole || []) {
        nextStats[row.role] = {
          total: row.total,
          active: row.active,
          inactive: row.inactive,
          percentage: row.percentage,
        };
      }

      setRoleStats(nextStats);
      setRoleMatrix(matrix);
    } catch {
      toast.error('Không thể tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateRole = async (user: User, role: UserRole) => {
    try {
      setProcessingId(String(user.id));
      await adminService.changeUserRole(String(user.id), role);
      toast.success('Cập nhật vai trò thành công');
      await loadData();
    } catch {
      toast.error('Không thể cập nhật vai trò');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brandLightBlue/25 text-brandBlue flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Phân quyền hệ thống</h1>
              <p className="text-gray-600">Quản lý vai trò người dùng</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Admin</p>
            <p className="text-2xl font-bold text-red-600">{roleStats.admin.total}</p>
            <p className="text-xs text-gray-500 mt-1">
              Active: {roleStats.admin.active} | Inactive: {roleStats.admin.inactive}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Ban tổ chức</p>
            <p className="text-2xl font-bold text-blue-600">{roleStats.organizer.total}</p>
            <p className="text-xs text-gray-500 mt-1">
              Active: {roleStats.organizer.active} | Inactive: {roleStats.organizer.inactive}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Sinh viên</p>
            <p className="text-2xl font-bold text-emerald-600">{roleStats.student.total}</p>
            <p className="text-xs text-gray-500 mt-1">
              Active: {roleStats.student.active} | Inactive: {roleStats.student.inactive}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-primary mb-3">Ma trận quyền theo vai trò</h2>
          <p className="text-sm text-gray-500 mb-4">Tổng người dùng: {totalUsers}</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(['admin', 'organizer', 'student'] as UserRole[]).map((role) => (
              <div key={role} className="rounded-lg border border-gray-200 p-3">
                <h3 className="font-semibold text-primary mb-2">{ROLE_LABEL[role]}</h3>
                <div className="flex flex-wrap gap-2">
                  {(roleMatrix?.[role]?.permissions || []).map((permission) => (
                    <span
                      key={permission}
                      className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                    >
                      {formatPermission(permission)}
                    </span>
                  ))}
                  {(roleMatrix?.[role]?.permissions || []).length === 0 && (
                    <span className="text-xs text-gray-500">Không có dữ liệu quyền.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Họ tên</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Vai trò</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-primary">{user.full_name}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          disabled={processingId === String(user.id)}
                          onChange={(e) => updateRole(user, e.target.value as UserRole)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 focus:border-brandBlue focus:outline-none disabled:opacity-60"
                        >
                          <option value="student">Sinh viên</option>
                          <option value="organizer">Ban tổ chức</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
