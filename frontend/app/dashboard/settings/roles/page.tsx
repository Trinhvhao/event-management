'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminService } from '@/services/adminService';
import { User, UserRole } from '@/types';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsRolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers({ page: 1, limit: 100 });
      setUsers(res.data || []);
    } catch {
      toast.error('Không thể tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const roleStats = useMemo(() => {
    return {
      admin: users.filter((u) => u.role === 'admin').length,
      organizer: users.filter((u) => u.role === 'organizer').length,
      student: users.filter((u) => u.role === 'student').length,
    };
  }, [users]);

  const updateRole = async (user: User, role: UserRole) => {
    try {
      setProcessingId(user.id);
      await adminService.updateUser(user.id, { role });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, role } : item)));
      toast.success('Cập nhật vai trò thành công');
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
            <p className="text-2xl font-bold text-red-600">{roleStats.admin}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Ban tổ chức</p>
            <p className="text-2xl font-bold text-blue-600">{roleStats.organizer}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Sinh viên</p>
            <p className="text-2xl font-bold text-emerald-600">{roleStats.student}</p>
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
                          disabled={processingId === user.id}
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
