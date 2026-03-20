'use client';

import { UsersIcon } from '@heroicons/react/24/outline';

export default function UserStatsWidget() {
    const totalUsers = 12789;
    const lastMonthUsers = 10876;
    const growth = ((totalUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1);
    const lastMonthGrowth = 10.8;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Total Users</h2>
                    <p className="text-sm text-gray-500 mt-1">Active students and organizers</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                    <UsersIcon className="w-6 h-6 text-purple-600" />
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-4xl font-bold text-gray-900">{totalUsers.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mt-2">
                        <span className="text-green-600 font-medium">+{growth}%</span> this month
                    </p>
                </div>

                <div className="text-right">
                    <div className="bg-purple-50 rounded-full px-4 py-8 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-purple-600">98%</p>
                                <p className="text-xs text-gray-600 mt-1">Active</p>
                            </div>
                        </div>
                        <svg className="w-24 h-24 transform -rotate-90">
                            <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="#e9d5ff"
                                strokeWidth="8"
                                fill="none"
                            />
                            <circle
                                cx="48"
                                cy="48"
                                r="40"
                                stroke="#8b5cf6"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 40 * 0.98} ${2 * Math.PI * 40}`}
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                    <p className="text-sm text-gray-600">Last Month</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{lastMonthUsers.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        <span className="text-green-600">+{lastMonthGrowth}%</span>
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Last Year</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">83,345</p>
                    <p className="text-xs text-gray-500 mt-1">
                        <span className="text-green-600">+53.2%</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
