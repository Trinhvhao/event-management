'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { adminService } from '@/services/adminService';
import { User } from '@/types';
import { UserCog, Search, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminOrganizersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadOrganizers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers({
        page: 1,
        limit: 100,
        role: 'organizer',
        search: search || undefined,
      });
      setUsers(res.data || []);
    } catch {
      toast.error('Không thể tải danh sách ban tổ chức');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadOrganizers();
  }, [loadOrganizers]);

  const activeCount = useMemo(() => users.filter((u) => u.is_active).length, [users]);

  const handleToggleActive = async (user: User) => {
    try {
      setProcessingId(user.id);
      await adminService.updateUser(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? 'Đã khóa tài khoản ban tổ chức' : 'Đã mở khóa tài khoản ban tổ chức');
      await loadOrganizers();
    } catch {
      toast.error('Cập nhật trạng thái thất bại');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDowngrade = async (user: User) => {
    try {
      setProcessingId(user.id);
      await adminService.updateUser(user.id, { role: 'student' });
      toast.success('Đã chuyển về vai trò sinh viên');
      await loadOrganizers();
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
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Quản lý ban tổ chức</h1>
              <p className="text-gray-600">Quản trị tài khoản tổ chức sự kiện</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Tổng ban tổ chức</p>
            <p className="text-2xl font-bold text-primary">{users.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Đang hoạt động</p>
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Đã khóa</p>
            <p className="text-2xl font-bold text-red-600">{users.length - activeCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:border-brandBlue focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Không có ban tổ chức nào</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-4 py-3">Họ tên</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-primary">{user.full_name}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            user.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.is_active ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={processingId === user.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                          >
                            {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            {user.is_active ? 'Khóa' : 'Mở khóa'}
                          </button>
                          <button
                            onClick={() => handleDowngrade(user)}
                            disabled={processingId === user.id}
                            className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-60"
                          >
                            Chuyển về sinh viên
                          </button>
                        </div>
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
