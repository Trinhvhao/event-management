import prisma from '../config/database';
import { createAuditLog } from './audit.service';

export const categoryService = {
    /**
     * Get all categories with event count
     */
    async getCategories() {
        const categories = await prisma.category.findMany({
            include: {
                _count: {
                    select: { events: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return categories.map(cat => ({
            ...cat,
            event_count: cat._count.events
        }));
    },

    /**
     * Create new category
     */
    async createCategory(
        data: {
            name: string;
            description?: string;
        },
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        // Check if name already exists
        const existing = await prisma.category.findFirst({
            where: { name: data.name }
        });

        if (existing) {
            throw new Error('Category name already exists');
        }

        const category = await prisma.category.create({
            data: {
                name: data.name,
                description: data.description
            }
        });

        // Create audit log
        await createAuditLog({
            actionType: 'category_created',
            adminId,
            entityType: 'category',
            entityId: category.id,
            newValue: category,
            ipAddress,
            userAgent
        });

        return category;
    },

    /**
     * Update category
     */
    async updateCategory(
        id: number,
        data: {
            name?: string;
            description?: string;
        },
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        const category = await prisma.category.findUnique({
            where: { id }
        });

        if (!category) {
            throw new Error('Category not found');
        }

        // Check if new name already exists (excluding current category)
        if (data.name && data.name !== category.name) {
            const existing = await prisma.category.findFirst({
                where: {
                    name: data.name,
                    id: { not: id }
                }
            });

            if (existing) {
                throw new Error('Category name already exists');
            }
        }

        const updated = await prisma.category.update({
            where: { id },
            data
        });

        // Create audit log
        await createAuditLog({
            actionType: 'category_updated',
            adminId,
            entityType: 'category',
            entityId: id,
            oldValue: category,
            newValue: updated,
            ipAddress,
            userAgent
        });

        return updated;
    },

    /**
     * Delete category (conflict-safe)
     */
    async deleteCategory(
        id: number,
        reassignTo: number | undefined,
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { events: true }
                }
            }
        });

        if (!category) {
            throw new Error('Category not found');
        }

        const eventCount = category._count.events;

        // If has events and no reassignTo, return conflict
        if (eventCount > 0 && !reassignTo) {
            const error = new Error('Category has associated events') as any;
            error.statusCode = 409;
            error.eventCount = eventCount;
            throw error;
        }

        let reassignedCount = 0;

        // If has events and reassignTo provided, reassign events
        if (eventCount > 0 && reassignTo) {
            // Verify reassignTo category exists
            const targetCategory = await prisma.category.findUnique({
                where: { id: reassignTo }
            });

            if (!targetCategory) {
                throw new Error('Target category not found');
            }

            // Reassign all events to new category
            await prisma.event.updateMany({
                where: { category_id: id },
                data: { category_id: reassignTo }
            });

            reassignedCount = eventCount;
        }

        // Delete category
        await prisma.category.delete({
            where: { id }
        });

        // Create audit log
        await createAuditLog({
            actionType: 'category_deleted',
            adminId,
            entityType: 'category',
            entityId: id,
            oldValue: category,
            metadata: { reassignedCount, reassignTo },
            ipAddress,
            userAgent
        });

        return { success: true, reassignedCount };
    },

    /**
     * Get all departments with user count
     */
    async getDepartments() {
        const departments = await prisma.department.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        return departments.map(dept => ({
            ...dept,
            user_count: dept._count.users
        }));
    },

    /**
     * Create new department
     */
    async createDepartment(
        data: {
            name: string;
            code: string;
            description?: string;
        },
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        // Validate code format
        if (!/^[A-Z0-9]{2,10}$/.test(data.code)) {
            throw new Error('Department code must be 2-10 uppercase alphanumeric characters');
        }

        // Check if name or code already exists
        const existing = await prisma.department.findFirst({
            where: {
                OR: [
                    { name: data.name },
                    { code: data.code }
                ]
            }
        });

        if (existing) {
            if (existing.name === data.name) {
                throw new Error('Department name already exists');
            }
            if (existing.code === data.code) {
                throw new Error('Department code already exists');
            }
        }

        const department = await prisma.department.create({
            data: {
                name: data.name,
                code: data.code,
                description: data.description
            }
        });

        // Create audit log
        await createAuditLog({
            actionType: 'department_created',
            adminId,
            entityType: 'department',
            entityId: department.id,
            newValue: department,
            ipAddress,
            userAgent
        });

        return department;
    },

    /**
     * Update department
     */
    async updateDepartment(
        id: number,
        data: {
            name?: string;
            code?: string;
            description?: string;
        },
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        const department = await prisma.department.findUnique({
            where: { id }
        });

        if (!department) {
            throw new Error('Department not found');
        }

        // Validate code format if provided
        if (data.code && !/^[A-Z0-9]{2,10}$/.test(data.code)) {
            throw new Error('Department code must be 2-10 uppercase alphanumeric characters');
        }

        // Check if new name or code already exists (excluding current department)
        if (data.name || data.code) {
            const conditions = [];
            if (data.name && data.name !== department.name) {
                conditions.push({ name: data.name });
            }
            if (data.code && data.code !== department.code) {
                conditions.push({ code: data.code });
            }

            if (conditions.length > 0) {
                const existing = await prisma.department.findFirst({
                    where: {
                        AND: [
                            { id: { not: id } },
                            { OR: conditions }
                        ]
                    }
                });

                if (existing) {
                    if (data.name && existing.name === data.name) {
                        throw new Error('Department name already exists');
                    }
                    if (data.code && existing.code === data.code) {
                        throw new Error('Department code already exists');
                    }
                }
            }
        }

        const updated = await prisma.department.update({
            where: { id },
            data
        });

        // Create audit log
        await createAuditLog({
            actionType: 'department_updated',
            adminId,
            entityType: 'department',
            entityId: id,
            oldValue: department,
            newValue: updated,
            ipAddress,
            userAgent
        });

        return updated;
    },

    /**
     * Delete department (conflict-safe)
     */
    async deleteDepartment(
        id: number,
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        const department = await prisma.department.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { users: true }
                }
            }
        });

        if (!department) {
            throw new Error('Department not found');
        }

        const userCount = department._count.users;

        // If has users, return conflict
        if (userCount > 0) {
            const error = new Error('Department has associated users') as any;
            error.statusCode = 409;
            error.userCount = userCount;
            throw error;
        }

        // Delete department
        await prisma.department.delete({
            where: { id }
        });

        // Create audit log
        await createAuditLog({
            actionType: 'department_deleted',
            adminId,
            entityType: 'department',
            entityId: id,
            oldValue: department,
            ipAddress,
            userAgent
        });

        return { success: true };
    }
};
