import { motion } from 'framer-motion';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface StatCardProps {
    icon: LucideIcon;
    label: string;
    value: number | string;
    color: string;
    href: string;
    index: number;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    subtitle?: string;
    sparklineData?: number[];
}

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: 'easeOut' as const },
    },
};

export default function StatCard({
    icon: Icon,
    label,
    value,
    color,
    href,
    index,
    trend,
    subtitle,
    sparklineData = [20, 35, 25, 45, 30, 50, 40]
}: StatCardProps) {
    const chartData = sparklineData.map((value, index) => ({ value, index }));

    // Extract color from Tailwind class
    const getColorHex = (colorClass: string) => {
        if (colorClass.includes('brandBlue')) return '#2563eb';
        if (colorClass.includes('secondary')) return '#10b981';
        if (colorClass.includes('22c55e')) return '#22c55e';
        if (colorClass.includes('8b5cf6')) return '#8b5cf6';
        return '#3b82f6';
    };

    const colorHex = getColorHex(color);
    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.1 }}
        >
            <Link href={href} className="block group">
                <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg hover:border-brandBlue/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Icon className="w-24 h-24 transform translate-x-4 -translate-y-4" />
                    </div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-500 mb-2">{label}</p>
                            <p className="text-3xl font-bold text-primary tracking-tight">{value}</p>
                            {subtitle && (
                                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                            )}
                            {trend && (
                                <div className="flex items-center gap-1 mt-3">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {trend.isPositive ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                        {Math.abs(trend.value)}%
                                    </span>
                                    <span className="text-xs text-gray-500">so với tháng trước</span>
                                </div>
                            )}

                            {/* Sparkline Chart */}
                            {sparklineData && (
                                <div className="h-12 -mx-2 mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={colorHex} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={colorHex} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke={colorHex}
                                                strokeWidth={2}
                                                fill={`url(#gradient-${index})`}
                                                animationDuration={1000}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${color}`}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
