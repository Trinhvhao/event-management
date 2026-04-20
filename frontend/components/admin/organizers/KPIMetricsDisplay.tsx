'use client';

import React from 'react';
import { TrendingUp, Users, Calendar, Star } from 'lucide-react';

interface Metrics {
    eventsCreated: number;
    totalAttendees: number;
    averageRating: number;
    upcomingEvents: number;
    completedEvents: number;
}

interface KPIMetricsDisplayProps {
    metrics: Metrics;
}

export function KPIMetricsDisplay({ metrics }: KPIMetricsDisplayProps) {
    const getPerformanceLevel = (rating: number) => {
        if (rating >= 4.5) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Excellent' };
        if (rating >= 4.0) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Good' };
        if (rating >= 3.5) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Average' };
        return { color: 'text-red-600', bg: 'bg-red-100', label: 'Poor' };
    };

    const performance = getPerformanceLevel(metrics.averageRating);

    return (
        <div className="grid grid-cols-4 gap-3">
            {/* Events Created */}
            <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                    <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-gray-500">Events</p>
                    <p className="text-sm font-semibold text-gray-900">{metrics.eventsCreated}</p>
                </div>
            </div>

            {/* Total Attendees */}
            <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                    <Users className="h-4 w-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-gray-500">Attendees</p>
                    <p className="text-sm font-semibold text-gray-900">{metrics.totalAttendees}</p>
                </div>
            </div>

            {/* Average Rating */}
            <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                    <Star className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-gray-500">Rating</p>
                    <div className="flex items-center gap-1">
                        <p className="text-sm font-semibold text-gray-900">
                            {metrics.averageRating.toFixed(1)}
                        </p>
                        <span className={`text-xs ${performance.color}`}>
                            {performance.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Upcoming Events */}
            <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-gray-500">Upcoming</p>
                    <p className="text-sm font-semibold text-gray-900">{metrics.upcomingEvents}</p>
                </div>
            </div>
        </div>
    );
}
