'use client';

import {
    CheckCircleIcon,
    ChatBubbleLeftIcon,
    UserPlusIcon,
    CalendarIcon,
    TrophyIcon
} from '@heroicons/react/24/outline';

interface Activity {
    id: number;
    type: 'task' | 'comment' | 'user' | 'event' | 'achievement';
    title: string;
    description: string;
    time: string;
    project?: string;
}

const activities: Activity[] = [
    {
        id: 1,
        type: 'task',
        title: 'Task Finished',
        description: 'Jessica Enrico Finished task on Project Management',
        time: '25 June 2025',
        project: 'Project Management'
    },
    {
        id: 2,
        type: 'comment',
        title: 'New Comment',
        description: 'Elizabeth Rosa Posted new comment on Service Management',
        time: '25 June 2025',
        project: 'Service Management'
    },
    {
        id: 3,
        type: 'task',
        title: 'Target Completed',
        description: 'Jessica Enrico Finished task on BRD month Sales',
        time: '21 June 2025'
    },
    {
        id: 4,
        type: 'achievement',
        title: 'Revenue Sources',
        description: 'Diana Saris Opened new report on Generated',
        time: '18 May 2025',
        project: 'Generated'
    },
    {
        id: 5,
        type: 'event',
        title: 'Dispatched Order',
        description: 'B.J Lucinda Placed order delivery on Senio Management',
        time: '22 May 2025',
        project: 'Senio Management'
    },
    {
        id: 6,
        type: 'user',
        title: 'New User Added',
        description: 'Moana Please visit the site on Membership allocated',
        time: '19 May 2025',
        project: 'Membership allocated'
    }
];

const iconMap = {
    task: CheckCircleIcon,
    comment: ChatBubbleLeftIcon,
    user: UserPlusIcon,
    event: CalendarIcon,
    achievement: TrophyIcon
};

const colorMap = {
    task: 'bg-green-100 text-green-600',
    comment: 'bg-blue-100 text-blue-600',
    user: 'bg-purple-100 text-purple-600',
    event: 'bg-orange-100 text-orange-600',
    achievement: 'bg-yellow-100 text-yellow-600'
};

export default function RecentActivityFeed() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                    <p className="text-sm text-gray-500 mt-1">Latest updates and events</p>
                </div>
                <button className="text-sm text-gray-500 hover:text-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                </button>
            </div>

            <div className="space-y-4">
                {activities.map((activity) => {
                    const Icon = iconMap[activity.type];
                    const colorClass = colorMap[activity.type];

                    return (
                        <div key={activity.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center`}>
                                <Icon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                                {activity.project && (
                                    <p className="text-xs text-blue-600 mt-1">{activity.project}</p>
                                )}
                            </div>

                            <div className="flex-shrink-0 text-xs text-gray-500">
                                {activity.time}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
