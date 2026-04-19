'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DepartmentPieData {
    name: string;
    value: number;
    color: string;
}

interface DepartmentPieChartProps {
    data?: DepartmentPieData[];
}

const defaultData = [
    { name: 'CNTT', value: 45, color: '#3b82f6' },
    { name: 'Kinh tế', value: 28, color: '#8b5cf6' },
    { name: 'Ngoại ngữ', value: 18, color: '#10b981' },
    { name: 'Cơ khí', value: 15, color: '#f59e0b' },
    { name: 'Khác', value: 12, color: '#ef4444' }
];

export default function DepartmentPieChart({ data = defaultData }: DepartmentPieChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Events by Department</h2>
                    <p className="text-sm text-gray-500 mt-1">Distribution across departments</p>
                </div>
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="mt-4 space-y-3">
                {data.map((item, index) => {
                    const percentage = ((item.value / total) * 100).toFixed(1);
                    return (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500">{percentage}%</span>
                                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
