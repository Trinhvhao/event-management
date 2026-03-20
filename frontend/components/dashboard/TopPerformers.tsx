'use client';

import { Trophy, TrendingUp } from 'lucide-react';
import Image from 'next/image';

interface Performer {
    id: number;
    name: string;
    department: string;
    points: number;
    eventsAttended: number;
    avatar?: string;
    rank: number;
}

export default function TopPerformers() {
    const performers: Performer[] = [
        {
            id: 1,
            name: 'Nguyễn Văn A',
            department: 'CNTT',
            points: 156,
            eventsAttended: 78,
            rank: 1
        },
        {
            id: 2,
            name: 'Trần Thị B',
            department: 'Kinh tế',
            points: 142,
            eventsAttended: 71,
            rank: 2
        },
        {
            id: 3,
            name: 'Lê Văn C',
            department: 'Ngoại ngữ',
            points: 138,
            eventsAttended: 69,
            rank: 3
        },
        {
            id: 4,
            name: 'Phạm Thị D',
            department: 'CNTT',
            points: 125,
            eventsAttended: 62,
            rank: 4
        },
        {
            id: 5,
            name: 'Hoàng Văn E',
            department: 'Cơ khí',
            points: 118,
            eventsAttended: 59,
            rank: 5
        }
    ];

    const getRankBadge = (rank: number) => {
        const badges = {
            1: { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', icon: '🥇' },
            2: { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', icon: '🥈' },
            3: { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', icon: '🥉' }
        };
        return badges[rank as keyof typeof badges] || { bg: 'bg-gray-200', icon: `#${rank}` };
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
                    <p className="text-sm text-gray-500 mt-1">Sinh viên tích cực nhất</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                </div>
            </div>

            <div className="space-y-4">
                {performers.map((performer) => {
                    const badge = getRankBadge(performer.rank);
                    return (
                        <div
                            key={performer.id}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {/* Rank Badge */}
                            <div className={`w-10 h-10 rounded-full ${badge.bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}>
                                {badge.icon}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {performer.name}
                                </p>
                                <p className="text-xs text-gray-500">{performer.department}</p>
                            </div>

                            {/* Stats */}
                            <div className="text-right">
                                <div className="flex items-center gap-1 text-sm font-bold text-blue-600">
                                    <Trophy className="w-4 h-4" />
                                    {performer.points}
                                </div>
                                <p className="text-xs text-gray-500">{performer.eventsAttended} sự kiện</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2">
                    Xem bảng xếp hạng đầy đủ
                    <TrendingUp className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
