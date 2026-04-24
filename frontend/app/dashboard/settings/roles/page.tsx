'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminService } from '@/services/adminService';
import { User, UserRole } from '@/types';
import { ShieldCheck, Users, Shield, GraduationCap, Activity } from 'lucide-react';
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

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  admin: {
    label: 'Admin',
    color: '#00358F',
    bgColor: 'from-[#00358F]/10 to-[#1a5fc8]/5',
    icon: <Shield className="w-5 h-5" />,
  },
  organizer: {
    label: 'Ban tổ chức',
    color: '#F26600',
    bgColor: 'from-[#F26600]/10 to-[#F26600]/5',
    icon: <Activity className="w-5 h-5" />,
  },
  student: {
    label: 'Sinh viên',
    color: '#00A651',
    bgColor: 'from-[#00A651]/10 to-[#00A651]/5',
    icon: <GraduationCap className="w-5 h-5" />,
  },
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
      <div className="space-y-6 p-4 md:p-6">

        {/* Page header */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">System Settings</p>
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Phân quyền hệ thống</h1>
              <p className="text-sm text-[var(--text-muted)]">Quản lý vai trò và quyền hạn người dùng</p>
            </div>
          </div>
        </div>

        {/* Role statistics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['admin', 'organizer', 'student'] as UserRole[]).map((role) => {
            const config = ROLE_CONFIG[role];
            const stats = roleStats[role];
            return (
              <div
                key={role}
                className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: config.color }} />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-sm">
                        <div className="text-white">{config.icon}</div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                          {config.label}
                        </p>
                        <p className="text-2xl font-extrabold tracking-tight" style={{ color: config.color }}>
                          {stats.total}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-brand-green)]" />
                        <span className="text-xs text-[var(--text-muted)]">
                          Active: <span className="font-semibold text-[var(--text-secondary)]">{stats.active}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)]">
                          Inactive: <span className="font-semibold text-[var(--text-secondary)]">{stats.inactive}</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="h-1.5 w-full rounded-full bg-[var(--bg-muted)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${stats.percentage}%`,
                            background: `linear-gradient(90deg, ${config.color}, ${config.color}aa)`
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        {stats.percentage.toFixed(1)}% of total users
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Permission matrix */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-[var(--shadow-brand)]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Ma trận quyền theo vai trò</h2>
              <p className="text-sm text-[var(--text-muted)]">Tổng người dùng: <span className="font-semibold text-[var(--color-brand-navy)]">{totalUsers}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(['admin', 'organizer', 'student'] as UserRole[]).map((role) => {
              const config = ROLE_CONFIG[role];
              const permissions = roleMatrix?.[role]?.permissions || [];
              return (
                <div
                  key={role}
                  className="rounded-xl border border-[var(--border-default)] bg-gradient-to-br from-white to-[var(--bg-muted)]/30 p-4 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${config.color}15` }}>
                      <div style={{ color: config.color }}>{config.icon}</div>
                    </div>
                    <h3 className="font-bold text-[var(--text-primary)]">{config.label}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {permissions.length > 0 ? (
                      permissions.map((permission) => (
                        <span
                          key={permission}
                          className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium border"
                          style={{
                            background: `${config.color}10`,
                            borderColor: `${config.color}30`,
                            color: config.color,
                          }}
                        >
                          {formatPermission(permission)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] italic">Không có dữ liệu quyền.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User role table */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--bg-muted)]/50 to-transparent px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center">
                <Users className="w-5 h-5 text-[var(--color-brand-navy)]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Danh sách người dùng</h2>
                <p className="text-xs text-[var(--text-muted)]">Thay đổi vai trò người dùng trong bảng dưới</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
              <span className="text-sm text-[var(--text-muted)] font-medium">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-muted)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Họ tên</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Email</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Vai trò</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  {users.map((user) => {
                    const roleConfig = ROLE_CONFIG[user.role];
                    return (
                      <tr key={user.id} className="hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_3%,transparent)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] text-[11px] font-bold text-white shadow-sm">
                              {user.full_name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('')}
                            </div>
                            <span className="font-semibold text-[var(--text-primary)]">{user.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{user.email}</td>
                        <td className="px-6 py-4 text-center">
                          <select
                            value={user.role}
                            disabled={processingId === String(user.id)}
                            onChange={(e) => updateRole(user, e.target.value as UserRole)}
                            className="inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition-all hover:border-[var(--color-brand-navy)] hover:text-[var(--color-brand-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]/30 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="student">Sinh viên</option>
                            <option value="organizer">Ban tổ chức</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!loading && users.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center">
                    <Users className="w-7 h-7 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">Không có người dùng</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
