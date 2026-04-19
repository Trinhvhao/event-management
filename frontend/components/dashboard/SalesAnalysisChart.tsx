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
    ResponsiveContainer
} from 'recharts';

interface SalesAnalysisDataPoint {
    month: string;
    events: number;
    checkins: number;
    registrations: number;
}

interface SalesAnalysisChartProps {
    data?: SalesAnalysisDataPoint[];
}

const defaultData = [
    { month: 'Jan', events: 12, checkins: 450, registrations: 520 },
    { month: 'Feb', events: 19, checkins: 680, registrations: 750 },
    { month: 'Mar', events: 15, checkins: 520, registrations: 600 },
    { month: 'Apr', events: 22, checkins: 820, registrations: 900 },
    { month: 'May', events: 18, checkins: 650, registrations: 720 },
    { month: 'Jun', events: 25, checkins: 920, registrations: 1050 },
    { month: 'Jul', events: 20, checkins: 750, registrations: 850 },
    { month: 'Aug', events: 16, checkins: 580, registrations: 650 },
    { month: 'Sep', events: 23, checkins: 880, registrations: 980 },
    { month: 'Oct', events: 21, checkins: 790, registrations: 870 },
    { month: 'Nov', events: 24, checkins: 910, registrations: 1020 },
    { month: 'Dec', events: 19, checkins: 720, registrations: 800 }
];

export default function SalesAnalysisChart({ data = defaultData }: SalesAnalysisChartProps) {
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

    const stats = [
        { label: 'Total Events', value: '234', change: '+8.5%', color: 'text-blue-600' },
        { label: 'Total Registrations', value: '13,876', change: '+5.2%', color: 'text-purple-600' },
        { label: 'Total Check-ins', value: '9,876', change: '+6.1%', color: 'text-green-600' },
        { label: 'Avg Attendance', value: '71%', change: '+2.3%', color: 'text-orange-600' }
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Event Analytics</h2>
                    <p className="text-sm text-gray-500 mt-1">Overview of events and participation</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {(['week', 'month', 'year'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeRange === range
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                        <p className="text-sm text-gray-600">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
                        <p className="text-xs text-green-600 mt-1">{stat.change} this month</p>
                    </div>
                ))}
            </div>

            {/* Combo Chart */}
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />
                        <Bar
                            yAxisId="left"
                            dataKey="events"
                            fill="url(#colorEvents)"
                            radius={[8, 8, 0, 0]}
                            name="Total Events"
                            barSize={40}
                        />
                        <Bar
                            yAxisId="left"
                            dataKey="registrations"
                            fill="url(#colorRegistrations)"
                            radius={[8, 8, 0, 0]}
                            name="Registrations"
                            barSize={40}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="checkins"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: '#10b981', r: 4 }}
                            name="Check-ins"
                            activeDot={{ r: 6 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
