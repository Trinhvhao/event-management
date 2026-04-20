'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Search, Users, Calendar, Trophy, Download, FileJson } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card, { CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import {
    trainingPointsService,
    AwardTrainingPointsPayload,
    ExportTrainingPointsQuery,
    ExportTrainingPointsResponse,
    TrainingPointsStatistics,
    UserTrainingPointsResponse,
} from '@/services/trainingPointsService';
import { toast } from 'sonner';

export default function AdminTrainingPointsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const canManageTrainingPoints = user?.role === 'admin' || user?.role === 'organizer';

    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingUser, setLoadingUser] = useState(false);
    const [stats, setStats] = useState<TrainingPointsStatistics | null>(null);
    const [selectedUserPoints, setSelectedUserPoints] = useState<UserTrainingPointsResponse | null>(null);
    const [userIdInput, setUserIdInput] = useState('');
    const [awarding, setAwarding] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [previewingJson, setPreviewingJson] = useState(false);
    const [exportPreview, setExportPreview] = useState<ExportTrainingPointsResponse | null>(null);
    const [awardForm, setAwardForm] = useState({
        user_id: '',
        event_id: '',
        points: '',
        semester: '',
    });
    const [exportFilter, setExportFilter] = useState({
        semester: '',
        event_id: '',
        user_id: '',
    });

    const loadStats = useCallback(async () => {
        if (!isAdmin) {
            setLoadingStats(false);
            return;
        }

        try {
            setLoadingStats(true);
            const data = await trainingPointsService.getStatistics();
            setStats(data);
        } catch {
            toast.error('Không thể tải thống kê điểm rèn luyện');
        } finally {
            setLoadingStats(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (user?.role && !canManageTrainingPoints) {
            router.push('/dashboard');
            return;
        }

        void loadStats();
    }, [canManageTrainingPoints, loadStats, router, user?.role]);

    const fetchUserPoints = async (userId: number) => {
        if (!isAdmin) {
            return;
        }

        try {
            setLoadingUser(true);
            const data = await trainingPointsService.getUserPoints(userId);
            setSelectedUserPoints(data);
            setUserIdInput(String(userId));
        } catch {
            toast.error('Không thể tải điểm của người dùng này');
        } finally {
            setLoadingUser(false);
        }
    };

    const semesterRows = useMemo(() => stats?.semester_statistics || [], [stats]);

    const buildExportParams = (): ExportTrainingPointsQuery | null => {
        const parseOptionalPositiveInt = (value: string, fieldLabel: string) => {
            const trimmed = value.trim();
            if (!trimmed) {
                return undefined;
            }

            const parsed = Number.parseInt(trimmed, 10);
            if (!Number.isInteger(parsed) || parsed <= 0) {
                throw new Error(`${fieldLabel} phải là số nguyên dương`);
            }

            return parsed;
        };

        try {
            return {
                semester: exportFilter.semester.trim() || undefined,
                event_id: parseOptionalPositiveInt(exportFilter.event_id, 'Event ID'),
                user_id: parseOptionalPositiveInt(exportFilter.user_id, 'User ID'),
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Bộ lọc export không hợp lệ';
            toast.error(message);
            return null;
        }
    };

    const handleAwardPoints = async () => {
        const userId = Number.parseInt(awardForm.user_id, 10);
        const eventId = Number.parseInt(awardForm.event_id, 10);
        const points = awardForm.points ? Number.parseInt(awardForm.points, 10) : undefined;

        if (!Number.isInteger(userId) || userId <= 0) {
            toast.error('User ID không hợp lệ');
            return;
        }

        if (!Number.isInteger(eventId) || eventId <= 0) {
            toast.error('Event ID không hợp lệ');
            return;
        }

        if (points !== undefined && (!Number.isInteger(points) || points <= 0)) {
            toast.error('Points phải là số nguyên dương');
            return;
        }

        const payload: AwardTrainingPointsPayload = {
            user_id: userId,
            event_id: eventId,
            points,
            semester: awardForm.semester.trim() || undefined,
        };

        try {
            setAwarding(true);
            const result = await trainingPointsService.awardPoints(payload);
            toast.success(`Đã cộng ${result.points} điểm cho ${result.user.full_name}`);
            setAwardForm({ user_id: '', event_id: '', points: '', semester: '' });

            if (isAdmin) {
                await loadStats();
                await fetchUserPoints(result.user_id);
            }
        } catch {
            toast.error('Không thể cộng điểm rèn luyện');
        } finally {
            setAwarding(false);
        }
    };

    const handleExportCsv = async () => {
        const params = buildExportParams();
        if (params === null) {
            return;
        }

        try {
            setExporting(true);
            const blob = await trainingPointsService.exportPointsCsv(params);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `training-points-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('Đã xuất báo cáo CSV');
        } catch {
            toast.error('Không thể xuất báo cáo CSV');
        } finally {
            setExporting(false);
        }
    };

    const handlePreviewJson = async () => {
        const params = buildExportParams();
        if (params === null) {
            return;
        }

        try {
            setPreviewingJson(true);
            const data = await trainingPointsService.exportPoints(params);
            setExportPreview(data);
            toast.success('Đã tải dữ liệu JSON để xem nhanh');
        } catch {
            toast.error('Không thể tải dữ liệu JSON export');
        } finally {
            setPreviewingJson(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">
                            {isAdmin ? 'Điểm rèn luyện quản trị' : 'Quản lý điểm rèn luyện sự kiện'}
                        </h1>
                        <p className="page-subtitle">
                            {isAdmin
                                ? 'Theo doi tong diem, tra cuu theo tung nguoi dung va xuat bao cao theo bo loc.'
                                : 'Cong diem va xuat bao cao cho cac su kien duoc phan quyen.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={handlePreviewJson} isLoading={previewingJson} variant="outline" icon={<FileJson size={16} />}>
                            Xem JSON
                        </Button>
                        <Button onClick={handleExportCsv} isLoading={exporting} icon={<Download size={16} />}>
                            Xuất CSV
                        </Button>
                    </div>
                </div>

                {isAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card variant="glass" padding="lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Tổng điểm đã cấp</p>
                                    <p className="text-2xl font-semibold text-gray-900">{(stats?.total_points_awarded || 0).toLocaleString('vi-VN')}</p>
                                </div>
                                <Award className="w-6 h-6 text-secondary" />
                            </div>
                        </Card>
                        <Card variant="glass" padding="lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Người dùng có điểm</p>
                                    <p className="text-2xl font-semibold text-gray-900">{(stats?.total_users_with_points || 0).toLocaleString('vi-VN')}</p>
                                </div>
                                <Users className="w-6 h-6 text-brandBlue" />
                            </div>
                        </Card>
                        <Card variant="glass" padding="lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Số học kỳ có dữ liệu</p>
                                    <p className="text-2xl font-semibold text-gray-900">{semesterRows.length}</p>
                                </div>
                                <Calendar className="w-6 h-6 text-green-600" />
                            </div>
                        </Card>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Card variant="glass" padding="lg">
                        <CardHeader title="Cộng điểm thủ công" subtitle="Yêu cầu user đã check-in sự kiện" />
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Input
                                    placeholder="User ID"
                                    value={awardForm.user_id}
                                    onChange={(e) => setAwardForm((prev) => ({ ...prev, user_id: e.target.value }))}
                                />
                                <Input
                                    placeholder="Event ID"
                                    value={awardForm.event_id}
                                    onChange={(e) => setAwardForm((prev) => ({ ...prev, event_id: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Input
                                    placeholder="Points (optional)"
                                    value={awardForm.points}
                                    onChange={(e) => setAwardForm((prev) => ({ ...prev, points: e.target.value }))}
                                />
                                <Input
                                    placeholder="Semester (optional)"
                                    value={awardForm.semester}
                                    onChange={(e) => setAwardForm((prev) => ({ ...prev, semester: e.target.value }))}
                                />
                            </div>
                            <Button onClick={handleAwardPoints} isLoading={awarding}>
                                Cộng điểm
                            </Button>
                        </div>
                    </Card>

                    <Card variant="glass" padding="lg">
                        <CardHeader title="Bộ lọc xuất dữ liệu" subtitle="Lọc theo học kỳ, sự kiện hoặc user trước khi export" />
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input
                                    placeholder="Semester (optional)"
                                    value={exportFilter.semester}
                                    onChange={(e) => setExportFilter((prev) => ({ ...prev, semester: e.target.value }))}
                                />
                                <Input
                                    placeholder="Event ID (optional)"
                                    value={exportFilter.event_id}
                                    onChange={(e) => setExportFilter((prev) => ({ ...prev, event_id: e.target.value }))}
                                />
                                <Input
                                    placeholder="User ID (optional)"
                                    value={exportFilter.user_id}
                                    onChange={(e) => setExportFilter((prev) => ({ ...prev, user_id: e.target.value }))}
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                {isAdmin
                                    ? 'Admin co the xuat theo moi bo loc. Organizer chi nhin thay du lieu thuoc su kien cua minh.'
                                    : 'Du lieu export duoc backend gioi han theo cac su kien ban duoc quan ly.'}
                            </p>
                        </div>
                    </Card>

                    {isAdmin && (
                        <Card variant="glass" padding="lg">
                            <CardHeader title="Top sinh viên theo điểm" subtitle={loadingStats ? 'Đang tải...' : 'Top 10 hiện tại'} />
                            <div className="space-y-2">
                                {(stats?.top_users || []).map((row, index) => {
                                    const userInfo = row.user;
                                    return (
                                        <button
                                            key={`${userInfo?.id || index}`}
                                            onClick={() => userInfo?.id && fetchUserPoints(userInfo.id)}
                                            disabled={!userInfo?.id}
                                            className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <div className="text-left">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {index + 1}. {userInfo?.full_name || 'Không xác định'}
                                                </p>
                                                <p className="text-xs text-gray-500">{userInfo?.student_id || userInfo?.email || 'N/A'}</p>
                                            </div>
                                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                                                <Trophy className="w-4 h-4" />
                                                {row.total_points}
                                            </span>
                                        </button>
                                    );
                                })}
                                {!loadingStats && (!stats || stats.top_users.length === 0) && (
                                    <p className="text-sm text-gray-500">Chưa có dữ liệu top users.</p>
                                )}
                            </div>
                        </Card>
                    )}

                    {isAdmin && (
                        <Card variant="glass" padding="lg">
                            <CardHeader title="Tra cứu theo user ID" subtitle="Nhập user id hoặc click từ danh sách top" />
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Ví dụ: 12"
                                    iconLeft={<Search size={16} />}
                                    value={userIdInput}
                                    onChange={(e) => setUserIdInput(e.target.value)}
                                />
                                <Button
                                    onClick={() => {
                                        const parsed = Number.parseInt(userIdInput, 10);
                                        if (!Number.isInteger(parsed) || parsed <= 0) {
                                            toast.error('User ID không hợp lệ');
                                            return;
                                        }
                                        fetchUserPoints(parsed);
                                    }}
                                    isLoading={loadingUser}
                                >
                                    Tải
                                </Button>
                            </div>

                            <div className="mt-4 border border-gray-100 rounded-lg p-4 bg-gray-50">
                                {!selectedUserPoints ? (
                                    <p className="text-sm text-gray-500">Chưa chọn người dùng để xem chi tiết.</p>
                                ) : (
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{selectedUserPoints.user.full_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {selectedUserPoints.user.student_id || selectedUserPoints.user.email}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="rounded-md bg-white p-3 border border-gray-100">
                                                <p className="text-gray-500">Tổng điểm</p>
                                                <p className="font-semibold text-gray-900">{selectedUserPoints.grand_total}</p>
                                            </div>
                                            <div className="rounded-md bg-white p-3 border border-gray-100">
                                                <p className="text-gray-500">Số sự kiện</p>
                                                <p className="font-semibold text-gray-900">{selectedUserPoints.total_events}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedUserPoints.semesters.map((semester) => (
                                                <div key={semester.semester} className="flex items-center justify-between rounded-md bg-white px-3 py-2 border border-gray-100">
                                                    <span className="text-xs text-gray-600">{semester.semester}</span>
                                                    <span className="text-xs font-semibold text-gray-900">{semester.total_points} điểm</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                <Card variant="glass" padding="lg">
                    <CardHeader title="Xem nhanh dữ liệu JSON export" subtitle="Kiem tra du lieu theo bo loc truoc khi tai CSV" />
                    {!exportPreview ? (
                        <p className="text-sm text-gray-500">Chưa có dữ liệu preview. Hãy chọn bộ lọc và bấm Xem JSON.</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="rounded-lg border border-gray-200 bg-white p-3">
                                    <p className="text-gray-500">Tổng bản ghi</p>
                                    <p className="font-semibold text-gray-900">{exportPreview.total_records}</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-3">
                                    <p className="text-gray-500">Tổng điểm</p>
                                    <p className="font-semibold text-gray-900">{exportPreview.total_points}</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-3">
                                    <p className="text-gray-500">Scope</p>
                                    <p className="font-semibold text-gray-900">{exportPreview.filters.scope}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-semibold">User</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-semibold">Sự kiện</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-semibold">Điểm</th>
                                            <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-semibold">Học kỳ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {exportPreview.records.slice(0, 10).map((row) => (
                                            <tr key={row.id}>
                                                <td className="px-4 py-3 text-gray-700">{row.full_name}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.event_title}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{row.points}</td>
                                                <td className="px-4 py-3 text-gray-700">{row.semester}</td>
                                            </tr>
                                        ))}
                                        {exportPreview.records.length === 0 && (
                                            <tr>
                                                <td className="px-4 py-6 text-gray-500" colSpan={4}>
                                                    Bộ lọc hiện tại không có dữ liệu.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Card>

                {isAdmin && (
                    <Card variant="glass" padding="lg">
                        <CardHeader title="Điểm theo học kỳ" />
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-semibold">Học kỳ</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-semibold">Tổng điểm</th>
                                        <th className="px-4 py-3 text-left text-xs uppercase text-gray-500 font-semibold">Số sự kiện</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {semesterRows.map((row) => (
                                        <tr key={row.semester}>
                                            <td className="px-4 py-3 text-gray-700">{row.semester}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{row.total_points}</td>
                                            <td className="px-4 py-3 text-gray-700">{row.events_count}</td>
                                        </tr>
                                    ))}
                                    {!loadingStats && semesterRows.length === 0 && (
                                        <tr>
                                            <td className="px-4 py-6 text-gray-500" colSpan={3}>
                                                Không có dữ liệu học kỳ.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
