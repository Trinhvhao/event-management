'use client';

import { FormEvent, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FolderCog } from 'lucide-react';
import { adminService, CategoryWithCount, DepartmentWithCount } from '@/services/adminService';
import { toast } from 'sonner';

export default function SettingsCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [departments, setDepartments] = useState<DepartmentWithCount[]>([]);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, depts] = await Promise.all([
        adminService.getCategories(),
        adminService.getDepartments(),
      ]);
      setCategories(cats);
      setDepartments(depts);
    } catch {
      toast.error('Không thể tải danh mục hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }
    try {
      await adminService.createCategory({
        name: catName.trim(),
        description: catDesc.trim() || undefined,
      });
      setCatName('');
      setCatDesc('');
      toast.success('Tạo danh mục thành công');
      await loadData();
    } catch {
      toast.error('Tạo danh mục thất bại');
    }
  };

  const createDepartment = async (e: FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      toast.error('Vui lòng nhập tên và mã khoa');
      return;
    }
    try {
      await adminService.createDepartment({
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        description: deptDesc.trim() || undefined,
      });
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      toast.success('Tạo khoa thành công');
      await loadData();
    } catch {
      toast.error('Tạo khoa thất bại');
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await adminService.deleteCategory(id);
      toast.success('Đã xóa danh mục');
      await loadData();
    } catch {
      toast.error('Không thể xóa danh mục đang có sự kiện');
    }
  };

  const deleteDepartment = async (id: number) => {
    try {
      await adminService.deleteDepartment(id);
      toast.success('Đã xóa khoa');
      await loadData();
    } catch {
      toast.error('Không thể xóa khoa đang có users/events');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brandLightBlue/25 text-brandBlue flex items-center justify-center">
              <FolderCog className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Danh mục hệ thống</h1>
              <p className="text-gray-600">Quản lý danh mục và khoa/phòng ban</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-primary mb-3">Danh mục sự kiện</h2>
            <form onSubmit={createCategory} className="space-y-2 mb-4">
              <input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Tên danh mục"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brandBlue focus:outline-none"
              />
              <input
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Mô tả (tùy chọn)"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brandBlue focus:outline-none"
              />
              <button className="px-4 py-2 rounded-lg bg-brandBlue text-white hover:bg-brandBlue/90">Thêm danh mục</button>
            </form>

            {loading ? (
              <p className="text-sm text-gray-500">Đang tải...</p>
            ) : (
              <div className="space-y-2">
                {categories.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-primary">{item.name}</p>
                      <p className="text-xs text-gray-500">{item._count?.events || 0} sự kiện</p>
                    </div>
                    <button
                      onClick={() => deleteCategory(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-primary mb-3">Khoa / Phòng ban</h2>
            <form onSubmit={createDepartment} className="space-y-2 mb-4">
              <input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Tên khoa"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brandBlue focus:outline-none"
              />
              <input
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
                placeholder="Mã khoa (VD: CNTT)"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brandBlue focus:outline-none"
              />
              <input
                value={deptDesc}
                onChange={(e) => setDeptDesc(e.target.value)}
                placeholder="Mô tả (tùy chọn)"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-brandBlue focus:outline-none"
              />
              <button className="px-4 py-2 rounded-lg bg-brandBlue text-white hover:bg-brandBlue/90">Thêm khoa</button>
            </form>

            {loading ? (
              <p className="text-sm text-gray-500">Đang tải...</p>
            ) : (
              <div className="space-y-2">
                {departments.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-primary">{item.name} ({item.code})</p>
                      <p className="text-xs text-gray-500">
                        {item._count?.users || 0} users, {item._count?.events || 0} sự kiện
                      </p>
                    </div>
                    <button
                      onClick={() => deleteDepartment(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
