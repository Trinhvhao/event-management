'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card, { CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, Users, TrendingUp, CheckCircle } from 'lucide-react';
import { statisticsService } from '@/services/statisticsService';
import { toast } from 'sonner';

// Card thống kê
function StatBox({ label, value, icon, color, loading }: {
    label: string; value: string; icon: React.ReactNode; color: string; loading?: boolean;
}) {
    return (
        <Card variant="glass" padding="none">
            <div className="stat-card">
                <div className="flex items-center justify-between mb-3">
                    <span className="stat-card-label">{label}</span>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>{icon}</div>
                </div>
                {loading ? (
                    <Skeleton style={{ width: 60, height: 28, borderRadius: 6 }} />
                ) : (
                    <p className="stat-card-value">{value}</p>
                )}
            </div>
        </Card>
    );
}

// Biểu đồ cột đơn giản bằng CSS
function SimpleBarChart({ data, loading }: { data: { label: string; value: number; color: string }[]; loading?: boolean }) {
    if (loading) {
        return (
            <div className="flex items-end gap-3 h-40">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                        <Skeleton style={{ width: '100%', height: 60 + Math.random() * 60, borderRadius: 4 }} />
                    </div>
                ))}
            </div>
        );
    }

    const maxVal = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-3 h-40">
            {data.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1">
                    <span className="text-xs font-semibold text-[var(--dash-text-primary)] mb-1">{item.value}</span>
                    <div
                        className="w-full rounded-t-md transition-all"
                        style={{ height: `${(item.value / maxVal) * 100}%`, background: item.color, minHeight: 4 }}
                    />
                    <span className="text-[10px] text-[var(--dash-text-muted)] mt-2 truncate w-full text-center">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

// Map trạng thái → nhãn tiếng Việt
const statusLabels: Record<string, string> = {
    upcoming: 'Sắp diễn ra',
    ongoing: 'Đang diễn ra',
    completed: 'Đã kết thúc',
    cancelled: 'Đã hủy',
};

const roleLabels: Record<string, string> = {
    student: 'Sinh viên',
    organizer: 'Ban tổ chức',
    admin: 'Admin',
};

export default function StatisticsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await statisticsService.getDashboard();
            setStats(data);
        } catch {
            toast.error('Không thể tải thống kê');
        } finally {
            setLoading(false);
        }
    };

    // Chuyển đổi dữ liệu cho biểu đồ
    const statusChartData = (stats?.eventsByStatus || []).map((item: any) => ({
        label: statusLabels[item.status] || item.status,
        value: item.count,
        color: item.status === 'upcoming' ? '#3b82f6' : item.status === 'ongoing' ? '#22c55e' : item.status === 'completed' ? '#8b5cf6' : '#ef4444',
    }));

    const roleChartData = (stats?.usersByRole || []).map((item: any) => ({
        label: roleLabels[item.role] || item.role,
        value: item.count,
        color: item.role === 'student' ? '#3b82f6' : item.role === 'organizer' ? '#f97316' : '#ef4444',
    }));

    return (
        <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Thống kê</h1>
                    <p className="page-subtitle">Tổng quan hoạt động sự kiện</p>
                </div>
            </div>

            {/* Stats overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatBox loading={loading} label="Tổng sự kiện" value={String(stats?.totalEvents || 0)} icon={<Calendar size={20} />} color="#3b82f6" />
                <StatBox loading={loading} label="Tổng đăng ký" value={String(stats?.totalRegistrations || 0)} icon={<Users size={20} />} color="#22c55e" />
                <StatBox loading={loading} label="Đã check-in" value={String(stats?.totalAttendances || 0)} icon={<CheckCircle size={20} />} color="#f97316" />
                <StatBox loading={loading} label="Check-in rate" value={`${stats?.checkInRate || 0}%`} icon={<BarChart3 size={20} />} color="#8b5cf6" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card variant="glass" padding="lg">
                    <CardHeader title="Sự kiện theo trạng thái" subtitle="Phân loại theo status" />
                    <SimpleBarChart data={statusChartData} loading={loading} />
                </Card>
                <Card variant="glass" padding="lg">
                    <CardHeader title="Người dùng theo vai trò" subtitle="Phân loại theo role" />
                    <SimpleBarChart data={roleChartData} loading={loading} />
                </Card>
            </div>
        </motion.div>
        </DashboardLayout>
    );
}
