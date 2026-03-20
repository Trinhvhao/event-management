'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Award, TrendingUp, Calendar, BookOpen, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { trainingPointsService } from '@/services/trainingPointsService';
import { toast } from 'sonner';

interface TrainingPoint {
    id: number;
    event: {
        id: number;
        title: string;
        start_time: string;
    };
    points: number;
    semester: string;
    earned_at: string;
}

export default function TrainingPointsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [points, setPoints] = useState<TrainingPoint[]>([]);
    const [totalPoints, setTotalPoints] = useState(0);
    const [currentSemesterPoints, setCurrentSemesterPoints] = useState(0);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchTrainingPoints();
    }, [router]);

    const fetchTrainingPoints = async () => {
        try {
            const data = await trainingPointsService.getMyPoints();

            // Flatten all points from all semesters
            const allPoints: TrainingPoint[] = [];
            data.semesters.forEach(semester => {
                allPoints.push(...semester.points);
            });

            setPoints(allPoints);
            setTotalPoints(data.grand_total);

            // Get current semester points (first semester in array)
            const currentSemester = data.semesters[0];
            setCurrentSemesterPoints(currentSemester?.total_points || 0);
        } catch (error) {
            console.error('Error fetching training points:', error);
            toast.error('Không thể tải điểm rèn luyện');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-2">Điểm rèn luyện</h1>
                    <p className="text-gray-600">Theo dõi và quản lý điểm rèn luyện của bạn</p>
                </div>

                {/* Total Points Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden bg-gradient-to-br from-brandBlue via-[#0041a8] to-secondary rounded-2xl p-8 text-white shadow-xl"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-brandLightBlue/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                <Award className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-white/80 text-sm font-medium">Tổng điểm rèn luyện</p>
                                <p className="text-5xl font-bold">{totalPoints}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/20">
                            <div>
                                <p className="text-white/70 text-sm mb-1">Học kỳ hiện tại</p>
                                <p className="text-3xl font-bold">{currentSemesterPoints}</p>
                                <p className="text-white/60 text-xs mt-1">HK2 2025-2026</p>
                            </div>
                            <div>
                                <p className="text-white/70 text-sm mb-1">Tổng tất cả học kỳ</p>
                                <p className="text-3xl font-bold">{totalPoints}</p>
                                <p className="text-white/60 text-xs mt-1">Từ khi nhập học</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { icon: TrendingUp, label: 'Xu hướng', value: `+${currentSemesterPoints}`, color: 'text-green-600', bg: 'bg-green-50' },
                        { icon: Calendar, label: 'Sự kiện tham gia', value: points.length.toString(), color: 'text-blue-600', bg: 'bg-blue-50' },
                        { icon: BookOpen, label: 'Học kỳ', value: 'HK2', color: 'text-purple-600', bg: 'bg-purple-50' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * (i + 1) }}
                            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                                    <p className="text-3xl font-bold text-primary">{stat.value}</p>
                                </div>
                                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Points History */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-primary">Lịch sử điểm rèn luyện</h2>
                        <p className="text-gray-500 text-sm mt-1">Chi tiết điểm từ các sự kiện đã tham gia</p>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {points.length === 0 ? (
                            <div className="p-12 text-center">
                                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium mb-2">Chưa có điểm rèn luyện</p>
                                <p className="text-gray-400 text-sm mb-6">Tham gia sự kiện để tích lũy điểm rèn luyện</p>
                                <button
                                    onClick={() => router.push('/dashboard/events')}
                                    className="px-6 py-2.5 bg-gradient-to-r from-brandBlue to-secondary text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                                >
                                    Khám phá sự kiện
                                </button>
                            </div>
                        ) : (
                            points.map((point, index) => (
                                <motion.div
                                    key={point.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * index }}
                                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                                    onClick={() => router.push(`/dashboard/events/${point.event.id}`)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-primary mb-1 group-hover:text-brandBlue transition-colors">
                                                {point.event.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(point.event.start_time).toLocaleDateString('vi-VN')}
                                                </span>
                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                                    {point.semester}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-secondary">+{point.points}</p>
                                                <p className="text-xs text-gray-500">điểm</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brandBlue transition-colors" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
