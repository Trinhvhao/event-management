'use client';

import { useState } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Calendar } from 'lucide-react';

export default function DashboardCharts() {
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

    // Data for combo chart
    const monthlyData = [
        { month: 'T1', events: 12, registrations: 520, checkins: 450 },
        { month: 'T2', events: 19, registrations: 750, checkins: 680 },
        { month: 'T3', events: 15, registrations: 600, checkins: 520 },
        { month: 'T4', events: 22, registrations: 900, checkins: 820 },
        { month: 'T5', events: 18, registrations: 720, checkins: 650 },
        { month: 'T6', events: 25, registrations: 1050, checkins: 920 }
    ];

    // Data for pie chart
    const departmentData = [
        { name: 'CNTT', value: 45, color: '#3b82f6' },
        { name: 'Kinh tế', value: 28, color: '#8b5cf6' },
        { name: 'Ngoại ngữ', value: 18, color: '#10b981' },
        { name: 'Cơ khí', value: 15, color: '#f59e0b' },
        { name: 'Khác', value: 12, color: '#ef4444' }
    ];

    const totalDept = departmentData.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Combo Chart - Events & Participation (2 columns) */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Event Analytics</h3>
                        <p className="text-sm text-gray-500 mt-1">Overview of events and participation</p>
                    </div>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {(['week', 'month', 'year'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeRange === range
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3} />
                                </linearGradient>
                                <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                            />
                            <YAxis
                                yAxisId="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                            <Bar
                                yAxisId="left"
                                dataKey="events"
                                fill="url(#colorEvents)"
                                radius={[8, 8, 0, 0]}
                                name="Sự kiện"
                                barSize={30}
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="registrations"
                                fill="url(#colorRegistrations)"
                                radius={[8, 8, 0, 0]}
                                name="Đăng ký"
                                barSize={30}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="checkins"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={{ fill: '#10b981', r: 4 }}
                                name="Check-in"
                                activeDot={{ r: 6 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Pie Chart - Events by Department (1 column) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Theo đơn vị</h3>
                        <p className="text-sm text-gray-500 mt-1">Phân bố sự kiện</p>
                    </div>
                    <Calendar className="w-5 h-5 text-blue-500" />
                </div>

                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={departmentData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {departmentData.map((entry, index) => (
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

                <div className="space-y-3 mt-4">
                    {departmentData.map((item, index) => {
                        const percentage = ((item.value / totalDept) * 100).toFixed(1);
                        return (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-sm text-gray-700">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">{percentage}%</span>
                                    <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
