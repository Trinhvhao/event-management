import { motion } from 'framer-motion';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface QuickAction {
    href: string;
    icon: LucideIcon;
    label: string;
    color: string;
}

interface QuickActionsProps {
    actions: QuickAction[];
    title?: string;
    delay?: number;
}

export default function QuickActions({
    actions,
    title = 'Thao tác nhanh',
    delay = 0.9
}: QuickActionsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
        >
            <h2 className="text-lg font-bold text-primary tracking-tight mb-6">{title}</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {actions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                        <Link
                            key={index}
                            href={action.href}
                            className="group flex flex-col items-center p-6 rounded-xl border border-gray-200 bg-offWhite hover:bg-white hover:border-brandBlue/30 hover:shadow-md transition-all duration-300"
                        >
                            <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-brandBlue transition-colors text-center">
                                {action.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </motion.div>
    );
}
