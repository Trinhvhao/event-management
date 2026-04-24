'use client';

import { FormEvent, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { FolderCog, Pencil, Tag, Building2, Trash2, Plus, X, Check } from 'lucide-react';
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
  const [editCat, setEditCat] = useState<{ id: string; name: string; description: string } | null>(null);
  const [editDept, setEditDept] = useState<{ id: string; name: string; code: string; description: string } | null>(null);
  const [deleteCategoryDialog, setDeleteCategoryDialog] = useState<{
    id: string;
    name: string;
    eventCount: number;
  } | null>(null);
  const [deleteDeptDialog, setDeleteDeptDialog] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [reassignCategoryId, setReassignCategoryId] = useState('');
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [deletingDept, setDeletingDept] = useState(false);

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

  const deleteCategory = async (id: string, reassignTo?: string) => {
    try {
      const result = await categoryService.deleteCategory(id, reassignTo);
      if (result.reassignedCount && result.reassignedCount > 0) {
        toast.success(`Đã xóa danh mục và chuyển ${result.reassignedCount} sự kiện`);
      } else {
        toast.success('Đã xóa danh mục');
      }
      await loadData();
    } catch {
      toast.error('Không thể xóa danh mục đang có sự kiện');
    }
  };

  const requestDeleteCategory = (item: CategoryWithCount) => {
    if ((item.event_count || 0) > 0) {
      setDeleteCategoryDialog({
        id: item.id,
        name: item.name,
        eventCount: item.event_count || 0,
      });
      setReassignCategoryId('');
      return;
    }

    void deleteCategory(item.id);
  };

  const confirmDeleteCategoryWithReassign = async () => {
    if (!deleteCategoryDialog) return;
    if (!reassignCategoryId) {
      toast.error('Vui lòng chọn danh mục để chuyển sự kiện');
      return;
    }

    try {
      setDeletingCategory(true);
      await deleteCategory(deleteCategoryDialog.id, reassignCategoryId);
      setDeleteCategoryDialog(null);
      setReassignCategoryId('');
    } finally {
      setDeletingCategory(false);
    }
  };

  const deleteDepartment = async () => {
    if (!deleteDeptDialog) return;
    try {
      setDeletingDept(true);
      await categoryService.deleteDepartment(deleteDeptDialog.id);
      toast.success('Đã xóa khoa');
      setDeleteDeptDialog(null);
      await loadData();
    } catch {
      toast.error('Không thể xóa khoa đang có users/events');
    } finally {
      setDeletingDept(false);
    }
  };

  const updateCategory = async (id: string, name: string, description: string) => {
    if (!name.trim()) return;
    try {
      await categoryService.updateCategory(id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Cập nhật danh mục thành công');
      setEditCat(null);
      await loadData();
    } catch {
      toast.error('Cập nhật thất bại');
    }
  };

  const updateDepartment = async (id: string, name: string, code: string, description: string) => {
    if (!name.trim() || !code.trim()) return;
    try {
      await categoryService.updateDepartment(id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
      });
      toast.success('Cập nhật khoa thành công');
      setEditDept(null);
      await loadData();
    } catch {
      toast.error('Cập nhật thất bại');
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
              <FolderCog className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-orange)]">System Settings</p>
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Danh mục hệ thống</h1>
              <p className="text-sm text-[var(--text-muted)]">Quản lý danh mục sự kiện và khoa/phòng ban</p>
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Categories section */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
            <div className="border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--bg-muted)]/50 to-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] flex items-center justify-center shadow-sm">
                  <Tag className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Danh mục sự kiện</h2>
                  <p className="text-xs text-[var(--text-muted)]">{categories.length} danh mục</p>
                </div>
              </div>
            </div>

            {/* Add form */}
            <form onSubmit={createCategory} className="p-5 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="w-4 h-4 text-[var(--color-brand-navy)]" />
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Thêm danh mục mới</span>
              </div>
              <div className="space-y-3">
                <div>
                  <input
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Tên danh mục"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]/30 focus:border-[var(--color-brand-navy)] transition-all"
                  />
                </div>
                <div>
                  <input
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Mô tả (tùy chọn)"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]/30 focus:border-[var(--color-brand-navy)] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-navy)] px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition-all hover:opacity-90 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Thêm danh mục
                </button>
              </div>
            </form>

            {/* Category list */}
            <div className="p-5">
              {loading ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-6 h-6 rounded-full border-[2px] border-[var(--color-brand-light)] border-t-[var(--color-brand-navy)] animate-spin" />
                  <span className="text-sm text-[var(--text-muted)]">Đang tải...</span>
                </div>
              ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center">
                    <Tag className="w-6 h-6 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">Chưa có danh mục nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[var(--border-default)] bg-gradient-to-br from-white to-[var(--bg-muted)]/30 p-4 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300"
                    >
                      {editCat?.id === item.id ? (
                        <div className="space-y-3">
                          <input
                            value={editCat.name}
                            onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--color-brand-navy)] bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]/30"
                            autoFocus
                          />
                          <input
                            value={editCat.description}
                            onChange={(e) => setEditCat({ ...editCat, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]/30"
                            placeholder="Mô tả"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCategory(editCat.id, editCat.name, editCat.description)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-green)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-brand-green)]/90 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Lưu
                            </button>
                            <button
                              onClick={() => setEditCat(null)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                              {item.description || 'Không có mô tả'}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-brand-navy)_8%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-brand-navy)]">
                                {item.event_count || 0} sự kiện
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                setEditCat({
                                  id: item.id,
                                  name: item.name,
                                  description: item.description || '',
                                })
                              }
                              className="rounded-lg border border-[var(--color-brand-navy)]/20 bg-[color-mix(in_srgb,var(--color-brand-navy)_6%,transparent)] p-2 text-[var(--color-brand-navy)] hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_12%,transparent)] transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => requestDeleteCategory(item)}
                              className="rounded-lg border border-[var(--color-brand-red)]/20 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] p-2 text-[var(--color-brand-red)] hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Departments section */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
            <div className="border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--bg-muted)]/50 to-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-brand-orange)] to-[#F26600] flex items-center justify-center shadow-sm">
                  <Building2 className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Khoa / Phòng ban</h2>
                  <p className="text-xs text-[var(--text-muted)]">{departments.length} khoa</p>
                </div>
              </div>
            </div>

            {/* Add form */}
            <form onSubmit={createDepartment} className="p-5 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="w-4 h-4 text-[var(--color-brand-orange)]" />
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Thêm khoa mới</span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="Tên khoa"
                    className="col-span-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]/30 focus:border-[var(--color-brand-orange)] transition-all"
                  />
                  <input
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    placeholder="Mã khoa (VD: CNTT)"
                    className="col-span-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] uppercase placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]/30 focus:border-[var(--color-brand-orange)] transition-all"
                  />
                </div>
                <div>
                  <input
                    value={deptDesc}
                    onChange={(e) => setDeptDesc(e.target.value)}
                    placeholder="Mô tả (tùy chọn)"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-white text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]/30 focus:border-[var(--color-brand-orange)] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-orange)] px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition-all hover:opacity-90 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Thêm khoa
                </button>
              </div>
            </form>

            {/* Department list */}
            <div className="p-5">
              {loading ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-6 h-6 rounded-full border-[2px] border-[var(--color-brand-light)] border-t-[var(--color-brand-orange)] animate-spin" />
                  <span className="text-sm text-[var(--text-muted)]">Đang tải...</span>
                </div>
              ) : departments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">Chưa có khoa nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {departments.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[var(--border-default)] bg-gradient-to-br from-white to-[var(--bg-muted)]/30 p-4 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300"
                    >
                      {editDept?.id === item.id ? (
                        <div className="space-y-3">
                          <input
                            value={editDept.name}
                            onChange={(e) => setEditDept({ ...editDept, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-[var(--color-brand-orange)] bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]/30"
                            placeholder="Tên khoa"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <input
                              value={editDept.code}
                              onChange={(e) => setEditDept({ ...editDept, code: e.target.value })}
                              className="w-24 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-white text-sm uppercase font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]/30"
                              placeholder="Mã"
                            />
                            <input
                              value={editDept.description}
                              onChange={(e) => setEditDept({ ...editDept, description: e.target.value })}
                              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-orange)]/30"
                              placeholder="Mô tả"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateDepartment(editDept.id, editDept.name, editDept.code, editDept.description)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-green)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--color-brand-green)]/90 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Lưu
                            </button>
                            <button
                              onClick={() => setEditDept(null)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[var(--text-primary)]">
                              {item.name}
                              <span className="ml-2 inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--color-brand-orange)_12%,transparent)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--color-brand-orange)]">
                                {item.code}
                              </span>
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                              {item.description || 'Không có mô tả'}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-brand-orange)_8%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-brand-orange)]">
                                {item.user_count || 0} users
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                setEditDept({
                                  id: item.id,
                                  name: item.name,
                                  code: item.code,
                                  description: item.description || '',
                                })
                              }
                              className="rounded-lg border border-[var(--color-brand-orange)]/20 bg-[color-mix(in_srgb,var(--color-brand-orange)_6%,transparent)] p-2 text-[var(--color-brand-orange)] hover:bg-[color-mix(in_srgb,var(--color-brand-orange)_12%,transparent)] transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteDeptDialog({ id: item.id, name: item.name })}
                              className="rounded-lg border border-[var(--color-brand-red)]/20 bg-[color-mix(in_srgb,var(--color-brand-red)_6%,transparent)] p-2 text-[var(--color-brand-red)] hover:bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete category dialog */}
      {deleteCategoryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-[var(--color-brand-red)] to-[#ff4444]" />

            <div className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-red)_10%,transparent)] flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-[var(--color-brand-red)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Xóa danh mục có sự kiện</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Danh mục <span className="font-semibold text-[var(--text-primary)]">{deleteCategoryDialog.name}</span> đang có{' '}
                <span className="font-bold text-[var(--color-brand-red)]">{deleteCategoryDialog.eventCount}</span> sự kiện.
                Vui lòng chọn danh mục nhận chuyển.
              </p>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Chuyển sự kiện sang
              </label>
              <div className="relative">
                <select
                  value={reassignCategoryId}
                  onChange={(e) => setReassignCategoryId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-[var(--border-default)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--color-brand-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-navy)]/30 transition-all"
                >
                  <option value="">Chọn danh mục</option>
                  {categories
                    .filter((item) => item.id !== deleteCategoryDialog.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteCategoryDialog(null);
                  setReassignCategoryId('');
                }}
                className="rounded-xl border border-[var(--border-default)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteCategoryWithReassign}
                disabled={deletingCategory || !reassignCategoryId}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-red)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--color-brand-red)]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingCategory ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-[2px] border-white/30 border-t-white animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Xóa và chuyển sự kiện
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete department dialog */}
      {deleteDeptDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-[var(--color-brand-red)] to-[#ff4444]" />

            <div className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-red)_10%,transparent)] flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-[var(--color-brand-red)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Xóa khoa</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Bạn có chắc muốn xóa khoa{' '}
                <span className="font-semibold text-[var(--text-primary)]">{deleteDeptDialog.name}</span>?
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteDeptDialog(null)}
                className="rounded-xl border border-[var(--border-default)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={deleteDepartment}
                disabled={deletingDept}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-red)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--color-brand-red)]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingDept ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-[2px] border-white/30 border-t-white animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
