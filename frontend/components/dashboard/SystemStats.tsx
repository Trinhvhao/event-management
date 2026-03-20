import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, UserCheck, Building2 } from 'lucide-react';

interface SystemStatsProps {
    totalStudents: number;
    totalOrganizers: number;
    totalDepartments: number;
    delay?: number;
}

export default function SystemStats({
    totalStudents,
    totalOrganizers,
    totalDepartments,
    delay = 0.8
}: SystemStatsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-primary tracking-tight">Thống kê hệ thống</h2>
                <Link
                    href="/dashboard/statistics"
                    className="text-sm font-medium text-brandBlue hover:text-brandBlue/80 transition-colors"
                >
                    Chi tiết →
                </Link>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-700">Sinh viên</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600">{totalStudents}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50">
                    <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-orange-600" />
                        <span className="font-medium text-gray-700">Ban tổ chức</span>
                    </div>
                    <span className="text-xl font-bold text-orange-600">{totalOrganizers}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-purple-50">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-gray-700">Khoa</span>
                    </div>
                    <span className="text-xl font-bold text-purple-600">{totalDepartments}</span>
                </div>
            </div>
        </motion.div>
    );
}
