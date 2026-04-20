'use client';

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

// Map Tailwind color classes to brand-aligned hex values
const getColorHex = (colorClass: string): string => {
    if (colorClass.includes('brandBlue')) return '#00358F';
    if (colorClass.includes('secondary')) return '#F26600';
    if (colorClass.includes('22c55e')) return '#00A651';
    if (colorClass.includes('8b5cf6')) return '#8b5cf6';
    if (colorClass.includes('brandRed')) return '#FF4000';
    if (colorClass.includes('brandGreen')) return '#00A651';
    if (colorClass.includes('brandGold')) return '#FFB800';
    return '#00358F';
};

const getGradientId = (colorClass: string): string => {
    return colorClass.replace(/[^a-zA-Z0-9]/g, '_') + '_gradient';
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
    sparklineData = [20, 35, 25, 45, 30, 50, 40],
}: StatCardProps) {
    const chartData = sparklineData.map((v, i) => ({ value: v, index: i }));
    const colorHex = getColorHex(color);
    const gradientId = `sg_${index}_${getGradientId(color)}`;

    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.08 }}
        >
            <Link href={href} className="block group">
                <div className="relative bg-white rounded-2xl border border-[var(--border-default)] p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">

                    {/* Subtle brand-colored top accent line */}
                    <div
                        className="absolute top-0 left-0 right-0 h-[3px] transition-all duration-300"
                        style={{ background: colorHex }}
                    />

                    {/* Large watermark icon — bottom right */}
                    <div className="absolute bottom-2 right-2 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-300 select-none pointer-events-none">
                        <Icon className="w-32 h-32 translate-x-6 translate-y-6" />
                    </div>

                    <div className="flex items-start justify-between gap-4 relative z-10">
                        {/* Left: label + value */}
                        <div className="flex-1 min-w-0">
                            {/* Label */}
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">
                                {label}
                            </p>

                            {/* Value */}
                            <p className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-none">
                                {value}
                            </p>

                            {/* Subtitle */}
                            {subtitle && (
                                <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium">{subtitle}</p>
                            )}

                            {/* Trend badge */}
                            {trend && (
                                <div className="flex items-center gap-1.5 mt-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                                        trend.isPositive
                                            ? 'bg-[color-mix(in_srgb,var(--color-brand-green)_12%,transparent)] text-[var(--color-brand-green)]'
                                            : 'bg-[color-mix(in_srgb,var(--color-brand-red)_12%,transparent)] text-[var(--color-brand-red)]'
                                    }`}>
                                        {trend.isPositive
                                            ? <TrendingUp size={11} />
                                            : <TrendingDown size={11} />
                                        }
                                        {Math.abs(trend.value)}%
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">so với tháng trước</span>
                                </div>
                            )}

                            {/* Sparkline */}
                            {sparklineData && (
                                <div className="h-14 mt-3 -mx-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={colorHex} stopOpacity={0.18} />
                                                    <stop offset="95%" stopColor={colorHex} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke={colorHex}
                                                strokeWidth={2.5}
                                                fill={`url(#${gradientId})`}
                                                dot={false}
                                                activeDot={{ r: 4, fill: colorHex, strokeWidth: 0 }}
                                                animationDuration={1200}
                                                animationEasing="ease-out"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Right: icon badge */}
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                            style={{ background: colorHex }}
                        >
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
