'use client';

import { FormEvent, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FolderCog, Pencil } from 'lucide-react';
import { categoryService } from '@/services/categoryService';
import { toast } from 'sonner';

interface CategoryWithCount {
  id: string;
  name: string;
  description?: string;
  event_count?: number;
}

interface DepartmentWithCount {
  id: string;
  name: string;
  code: string;
  description?: string;
  user_count?: number;
}

export default function SettingsCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [departments, setDepartments] = useState<DepartmentWithCount[]>([]);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [editCat, setEditCat] = useState<{ id: string; name: string } | null>(null);
  const [editDept, setEditDept] = useState<{ id: string; name: string; code: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, depts] = await Promise.all([
        categoryService.getCategories(),
        categoryService.getDepartments(),
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
      await categoryService.createCategory({
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
      await categoryService.createDepartment({
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

  const deleteCategory = async (id: string) => {
    try {
      await categoryService.deleteCategory(id);
      toast.success('Đã xóa danh mục');
      await loadData();
    } catch {
      toast.error('Không thể xóa danh mục đang có sự kiện');
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      await categoryService.deleteDepartment(id);
      toast.success('Đã xóa khoa');
      await loadData();
    } catch {
      toast.error('Không thể xóa khoa đang có users/events');
    }
  };

  const updateCategory = async (id: string, name: string) => {
    if (!name.trim()) return;
    try {
      await categoryService.updateCategory(id, { name: name.trim() });
      toast.success('Cập nhật danh mục thành công');
      setEditCat(null);
      await loadData();
    } catch {
      toast.error('Cập nhật thất bại');
    }
  };

  const updateDepartment = async (id: string, name: string, code: string) => {
    if (!name.trim() || !code.trim()) return;
    try {
      await categoryService.updateDepartment(id, { name: name.trim(), code: code.trim() });
      toast.success('Cập nhật khoa thành công');
      setEditDept(null);
      await loadData();
    } catch {
      toast.error('Cập nhật thất bại');
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
                    {editCat?.id === item.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={editCat.name}
                          onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                          className="flex-1 px-2 py-1 border border-brandBlue rounded text-sm"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && updateCategory(editCat.id, editCat.name)}
                        />
                        <button onClick={() => updateCategory(editCat.id, editCat.name)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Lưu</button>
                        <button onClick={() => setEditCat(null)} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Hủy</button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium text-primary">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.event_count || 0} sự kiện</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditCat({ id: item.id, name: item.name })}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-brandBlue"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCategory(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm"
                          >
                            Xóa
                          </button>
                        </div>
                      </>
                    )}
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
                    {editDept?.id === item.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={editDept.name}
                          onChange={(e) => setEditDept({ ...editDept, name: e.target.value })}
                          className="flex-1 px-2 py-1 border border-brandBlue rounded text-sm"
                          placeholder="Tên khoa"
                          autoFocus
                        />
                        <input
                          value={editDept.code}
                          onChange={(e) => setEditDept({ ...editDept, code: e.target.value })}
                          className="w-20 px-2 py-1 border border-brandBlue rounded text-sm uppercase"
                          placeholder="Mã"
                        />
                        <button onClick={() => updateDepartment(editDept.id, editDept.name, editDept.code)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Lưu</button>
                        <button onClick={() => setEditDept(null)} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Hủy</button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium text-primary">{item.name} ({item.code})</p>
                          <p className="text-xs text-gray-500">
                            {item.user_count || 0} users
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditDept({ id: item.id, name: item.name, code: item.code })}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-brandBlue"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteDepartment(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm"
                          >
                            Xóa
                          </button>
                        </div>
                      </>
                    )}
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
