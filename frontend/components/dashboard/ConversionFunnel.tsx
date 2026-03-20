'use client';

import { Users, UserPlus, UserCheck, Trophy } from 'lucide-react';

interface FunnelStage {
    label: string;
    value: number;
    percentage: number;
    icon: React.ReactNode;
    color: string;
}

export default function ConversionFunnel() {
    const stages: FunnelStage[] = [
        {
            label: 'Lượt xem sự kiện',
            value: 10000,
            percentage: 100,
            icon: <Users className="w-5 h-5" />,
            color: 'from-blue-500 to-blue-600'
        },
        {
            label: 'Đăng ký tham gia',
            value: 5000,
            percentage: 50,
            icon: <UserPlus className="w-5 h-5" />,
            color: 'from-purple-500 to-purple-600'
        },
        {
            label: 'Check-in thành công',
            value: 4000,
            percentage: 40,
            icon: <UserCheck className="w-5 h-5" />,
            color: 'from-green-500 to-green-600'
        },
        {
            label: 'Nhận điểm rèn luyện',
            value: 3800,
            percentage: 38,
            icon: <Trophy className="w-5 h-5" />,
            color: 'from-orange-500 to-orange-600'
        }
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Phễu chuyển đổi</h3>
                    <p className="text-sm text-gray-500 mt-1">Hành trình của sinh viên</p>
                </div>
            </div>

            <div className="space-y-4">
                {stages.map((stage, index) => {
                    const dropRate = index > 0
                        ? ((stages[index - 1].value - stage.value) / stages[index - 1].value * 100).toFixed(1)
                        : 0;

                    return (
                        <div key={index} className="relative">
                            {/* Stage Card */}
                            <div className="relative overflow-hidden rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                                {/* Background gradient */}
                                <div
                                    className={`absolute inset-0 bg-gradient-to-r ${stage.color} opacity-5`}
                                    style={{ width: `${stage.percentage}%` }}
                                />

                                {/* Content */}
                                <div className="relative p-4 flex items-center gap-4">
                                    {/* Icon */}
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stage.color} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                                        {stage.icon}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {stage.label}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-gray-900">
                                                    {stage.value.toLocaleString()}
                                                </span>
                                                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                    {stage.percentage}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full bg-gradient-to-r ${stage.color} transition-all duration-500 rounded-full`}
                                                style={{ width: `${stage.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Drop Rate Indicator */}
                            {index > 0 && dropRate !== '0.0' && (
                                <div className="flex items-center justify-center my-2">
                                    <div className="bg-red-50 text-red-600 text-xs font-medium px-3 py-1 rounded-full border border-red-200">
                                        ↓ {dropRate}% rời bỏ
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Tỷ lệ chuyển đổi</p>
                        <p className="text-xl font-bold text-green-600">
                            {((stages[stages.length - 1].value / stages[0].value) * 100).toFixed(1)}%
                        </p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Tỷ lệ check-in</p>
                        <p className="text-xl font-bold text-blue-600">
                            {((stages[2].value / stages[1].value) * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
