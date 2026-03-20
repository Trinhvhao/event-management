'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface EventsChartProps {
    data: Array<{
        status: string;
        count: number;
    }>;
}

export default function EventsChart({ data }: EventsChartProps) {
    const statusLabels: Record<string, string> = {
        upcoming: 'Sắp diễn ra',
        ongoing: 'Đang diễn ra',
        completed: 'Đã hoàn thành',
        cancelled: 'Đã hủy',
    };

    const chartData = data.map(item => ({
        name: statusLabels[item.status] || item.status,
        'Số lượng': item.count,
    }));

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Phân bố sự kiện theo trạng thái</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                    />
                    <Legend />
                    <Bar dataKey="Số lượng" fill="#002D72" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
