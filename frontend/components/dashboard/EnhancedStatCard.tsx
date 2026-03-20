'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface EnhancedStatCardProps {
    title: string;
    value: string | number;
    change: number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'orange';
    sparklineData?: number[];
}

const colorConfig = {
    blue: {
        bg: 'bg-blue-50',
        icon: 'bg-blue-500',
        text: 'text-blue-600',
        gradient: '#3b82f6',
        light: '#93c5fd'
    },
    green: {
        bg: 'bg-green-50',
        icon: 'bg-green-500',
        text: 'text-green-600',
        gradient: '#10b981',
        light: '#86efac'
    },
    purple: {
        bg: 'bg-purple-50',
        icon: 'bg-purple-500',
        text: 'text-purple-600',
        gradient: '#8b5cf6',
        light: '#c4b5fd'
    },
    orange: {
        bg: 'bg-orange-50',
        icon: 'bg-orange-500',
        text: 'text-orange-600',
        gradient: '#f97316',
        light: '#fdba74'
    }
};

export default function EnhancedStatCard({
    title,
    value,
    change,
    icon,
    color,
    sparklineData = [20, 35, 25, 45, 30, 50, 40]
}: EnhancedStatCardProps) {
    const config = colorConfig[color];
    const isPositive = change >= 0;

    const chartData = sparklineData.map((value, index) => ({ value, index }));

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={`${config.icon} p-3 rounded-lg`}>
                    <div className="text-white">{icon}</div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                    ) : (
                        <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(change)}%
                </div>
            </div>

            <div className="mb-1">
                <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>

            <div className="text-xs text-gray-500 mb-3">
                Compared to last Month
            </div>

            {/* Sparkline Chart */}
            <div className="h-12 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={config.gradient} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={config.gradient} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={config.gradient}
                            strokeWidth={2}
                            fill={`url(#gradient-${color})`}
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
