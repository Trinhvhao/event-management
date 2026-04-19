import prisma from '../config/database';

export interface CreateAuditLogParams {
    actionType: string;
    adminId: number;
    userId?: number | null;
    entityType: string;
    entityId: number;
    oldValue?: any;
    newValue?: any;
    metadata?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
}

/**
 * Create an audit log entry
 * Used to track all admin actions for compliance and security
 */
export const createAuditLog = async (params: CreateAuditLogParams) => {
    try {
        const auditLog = await prisma.auditLog.create({
            data: {
                action_type: params.actionType,
                admin_id: params.adminId,
                user_id: params.userId || null,
                entity_type: params.entityType,
                entity_id: params.entityId,
                old_value: params.oldValue || null,
                new_value: params.newValue || null,
                metadata: params.metadata || null,
                ip_address: params.ipAddress || null,
                user_agent: params.userAgent || null,
            },
        });

        return auditLog;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error - audit logging should not break the main operation
        return null;
    }
};

/**
 * Get audit logs for a specific user
 */
export const getUserAuditLogs = async (
    userId: number,
    options: {
        page?: number;
        limit?: number;
        actionType?: string;
    } = {}
) => {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
        user_id: userId,
    };

    if (options.actionType) {
        where.action_type = options.actionType;
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                created_at: 'desc',
            },
            include: {
                admin: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
        }),
        prisma.auditLog.count({ where }),
    ]);

    return {
        data: logs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get all audit logs with filters
 */
export const getAuditLogs = async (options: {
    page?: number;
    limit?: number;
    adminId?: number;
    userId?: number;
    actionType?: string;
    entityType?: string;
    dateFrom?: Date;
    dateTo?: Date;
} = {}) => {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.adminId) where.admin_id = options.adminId;
    if (options.userId) where.user_id = options.userId;
    if (options.actionType) where.action_type = options.actionType;
    if (options.entityType) where.entity_type = options.entityType;

    if (options.dateFrom || options.dateTo) {
        where.created_at = {};
        if (options.dateFrom) where.created_at.gte = options.dateFrom;
        if (options.dateTo) where.created_at.lte = options.dateTo;
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                created_at: 'desc',
            },
            include: {
                admin: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
        }),
        prisma.auditLog.count({ where }),
    ]);

    return {
        data: logs,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
