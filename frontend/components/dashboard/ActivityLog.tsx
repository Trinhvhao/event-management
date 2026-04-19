'use client';

import { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';

interface Activity {
    id: string;
    type: 'approval' | 'creation' | 'registration' | 'system';
    user: string;
    action: string;
    target: string;
    time: string;
}

const MOCK_ACTIVITIES: Activity[] = [
    {
        id: '1',
        type: 'approval',
        user: 'Admin A',
        action: 'vừa duyệt sự kiện',
        target: 'Giải bóng đá sinh viên',
        time: '10:05 AM'
    },
    {
        id: '2',
        type: 'creation',
        user: 'Khoa CNTT',
        action: 'vừa tạo sự kiện',
        target: 'Workshop Kỹ năng thuyết trình',
        time: '09:30 AM'
    },
    {
        id: '3',
        type: 'registration',
        user: '25 sinh viên',
        action: 'vừa đăng ký',
        target: 'Hội thảo AI & Machine Learning',
        time: '09:15 AM'
    },
    {
        id: '4',
        type: 'system',
        user: 'Hệ thống',
        action: 'đã gửi email nhắc nhở',
        target: '150 sinh viên về sự kiện sắp diễn ra',
        time: '08:00 AM'
    }
];

export default function ActivityLog() {
    const [activities] = useState<Activity[]>(MOCK_ACTIVITIES);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'approval':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'creation':
                return <FileText className="w-5 h-5 text-blue-500" />;
            case 'registration':
                return <Clock className="w-5 h-5 text-purple-500" />;
            case 'system':
                return <AlertCircle className="w-5 h-5 text-orange-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Hoạt động hệ thống</h3>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-6">
                    {activities.map((activity) => (
                        <div key={activity.id} className="relative flex gap-4">
                            {/* Icon */}
                            <div className="relative z-10 flex-shrink-0 w-12 h-12 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center">
                                {getActivityIcon(activity.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-2">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900">
                                            <span className="font-medium">{activity.user}</span>
                                            {' '}{activity.action}{' '}
                                            <span className="font-medium text-blue-600">{activity.target}</span>
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">{activity.time}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Xem tất cả hoạt động →
                </button>
            </div>
        </div>
    );
}
