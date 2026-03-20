'use client';

import { TrendingUp, TrendingDown, Users, Calendar, CheckCircle, Award } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface QuickStat {
    label: string;
    value: string;
    change: number;
    isPositive: boolean;
    icon: React.ReactNode;
    color: string;
    data: number[];
}

export default function QuickStatsGrid() {
    const stats: QuickStat[] = [
        {
            label: 'Tổng sự kiện',
            value: '234',
            change: 8.5,
            isPositive: true,
            icon: <Calendar className="w-5 h-5" />,
            color: '#3b82f6',
            data: [20, 35, 25, 45, 30, 50, 40, 55, 45, 60]
        },
        {
            label: 'Lượt đăng ký',
            value: '13,876',
            change: 12.3,
            isPositive: true,
            icon: <Users className="w-5 h-5" />,
            color: '#10b981',
            data: [30, 40, 35, 50, 45, 60, 55, 70, 65, 75]
        },
        {
            label: 'Check-in',
            value: '9,876',
            change: 6.7,
            isPositive: true,
            icon: <CheckCircle className="w-5 h-5" />,
            color: '#8b5cf6',
            data: [25, 30, 28, 40, 35, 45, 42, 50, 48, 55]
        },
        {
            label: 'Điểm rèn luyện',
            value: '19,752',
            change: 15.2,
            isPositive: true,
            icon: <Award className="w-5 h-5" />,
            color: '#f59e0b',
            data: [15, 25, 20, 35, 30, 40, 38, 45, 42, 50]
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => {
                const chartData = stat.data.map((value, idx) => ({ value, idx }));

                return (
                    <div
                        key={index}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: `${stat.color}15` }}
                            >
                                <div style={{ color: stat.color }}>
                                    {stat.icon}
                                </div>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${stat.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {stat.isPositive ? (
                                    <TrendingUp className="w-3 h-3" />
                                ) : (
                                    <TrendingDown className="w-3 h-3" />
                                )}
                                {Math.abs(stat.change)}%
                            </div>
                        </div>

                        <div className="mb-2">
                            <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>

                        {/* Mini Sparkline */}
                        <div className="h-10 -mx-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id={`mini-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={stat.color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={stat.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={stat.color}
                                        strokeWidth={2}
                                        fill={`url(#mini-gradient-${index})`}
                                        animationDuration={1000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
