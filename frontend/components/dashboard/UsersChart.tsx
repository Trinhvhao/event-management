'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface UsersChartProps {
    data: Array<{
        role: string;
        count: number;
    }>;
}

const COLORS = {
    student: '#22c55e',
    organizer: '#3b82f6',
    admin: '#ef4444',
};

const ROLE_LABELS: Record<string, string> = {
    student: 'Sinh viên',
    organizer: 'Ban tổ chức',
    admin: 'Quản trị viên',
};

export default function UsersChart({ data }: UsersChartProps) {
    const chartData = data.map(item => ({
        name: ROLE_LABELS[item.role] || item.role,
        value: item.count,
        color: COLORS[item.role as keyof typeof COLORS] || '#6b7280',
    }));

    const renderLabel = (entry: { name?: string; value?: number }) => {
        return `${entry.name || ''}: ${entry.value || 0}`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Phân bố người dùng theo vai trò</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
