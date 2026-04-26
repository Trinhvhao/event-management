import prisma from '../config/database';
import { Prisma, UserRole } from '@prisma/client';
import { createAuditLog } from './audit.service';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { Request } from 'express';

interface GetUsersParams {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    department_id?: number;
    is_active?: boolean;
    sortBy?: 'created_at' | 'last_login' | 'full_name' | 'email';
    sortOrder?: Prisma.SortOrder;
}

export const adminService = {
    /**
     * Import users from CSV file
     */
    async importUsers(
        req: Request,
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        const results = {
            success: 0,
            failed: 0,
            errors: [] as Array<{ row: number; email: string; error: string }>,
        };

        if (!req.file) {
            throw new Error('No CSV file provided');
        }

        const rows: Record<string, string>[] = [];

        // Parse CSV using csv-parser
        await new Promise<void>((resolve, reject) => {
            const buffer = req.file!.buffer;

            const stream = csvParser({
                headers: true,
                skipLines: 0,
            });

            stream.on('data', (row: Record<string, string>) => {
                rows.push(row);
            });

            stream.on('end', () => resolve());
            stream.on('error', (err: Error) => reject(err));

            // Convert buffer to readable stream
            const readable = new Readable();
            readable.push(buffer);
            readable.push(null);
            readable.pipe(stream);
        });

        if (rows.length === 0) {
            throw new Error('CSV file is empty or has no valid data rows');
        }

        // Validate required columns
        const requiredColumns = ['email', 'full_name'];
        const headers = Object.keys(rows[0] || {});
        const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

        if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        // Validate and create users
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2; // +2 because row 1 is headers and rows are 0-indexed

            try {
                // Validate email (required)
                const email = row['email']?.trim();
                if (!email) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email: '', error: 'Email is required' });
                    continue;
                }

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email, error: 'Invalid email format' });
                    continue;
                }

                // Validate full_name (required)
                const fullName = row['full_name']?.trim();
                if (!fullName) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email, error: 'Full name is required' });
                    continue;
                }

                // Get optional fields
                const studentId = row['student_id']?.trim() || null;
                const role = (row['role']?.trim()?.toLowerCase() || 'student') as UserRole;
                const departmentId = row['department_id']?.trim()
                    ? parseInt(row['department_id'], 10)
                    : null;

                // Validate role
                if (!['admin', 'organizer', 'student'].includes(role)) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email, error: `Invalid role: ${role}. Must be admin, organizer, or student` });
                    continue;
                }

                // Validate department_id if provided
                if (departmentId !== null && isNaN(departmentId)) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email, error: 'Invalid department_id: must be a number' });
                    continue;
                }

                // Check if user already exists
                const existingUser = await prisma.user.findUnique({
                    where: { email },
                });

                if (existingUser) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email, error: 'User with this email already exists' });
                    continue;
                }

                // Validate department exists if provided
                if (departmentId !== null) {
                    const department = await prisma.department.findUnique({
                        where: { id: departmentId },
                    });
                    if (!department) {
                        results.failed++;
                        results.errors.push({ row: rowNumber, email, error: `Department with id ${departmentId} not found` });
                        continue;
                    }
                }

                // Generate temporary password (in production, you might want to send reset links instead)
                const bcrypt = await import('bcrypt');
                const passwordHash = await bcrypt.hash(email.split('@')[0] + '123456', 10);

                // Create user
                await prisma.user.create({
                    data: {
                        email,
                        full_name: fullName,
                        student_id: studentId,
                        role,
                        department_id: departmentId,
                        is_active: true,
                        password_hash: passwordHash,
                    },
                });

                results.success++;

                // Create audit log
                await createAuditLog({
                    actionType: 'user_created',
                    adminId,
                    entityType: 'user',
                    entityId: 0, // Will be updated with actual user id
                    oldValue: null,
                    newValue: { email, full_name: fullName, role },
                    ipAddress,
                    userAgent,
                });
            } catch (error) {
                results.failed++;
                results.errors.push({
                    row: rowNumber,
                    email: row['email'] || '',
                    error: (error as Error).message,
                });
            }
        }

        return results;
    },

    /**
     * Get users with filters, sorting, and pagination
     */
    async getUsers(params: GetUsersParams) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        const sortBy = params.sortBy || 'created_at';
        const sortOrder = params.sortOrder || 'desc';
        let orderBy: Prisma.UserOrderByWithRelationInput;

        switch (sortBy) {
            case 'last_login':
                orderBy = { last_login: sortOrder };
                break;
            case 'full_name':
                orderBy = { full_name: sortOrder };
                break;
            case 'email':
                orderBy = { email: sortOrder };
                break;
            default:
                orderBy = { created_at: sortOrder };
        }

        // Build where clause
        const where: Prisma.UserWhereInput = {};

        if (params.search) {
            where.OR = [
                { full_name: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        if (params.role) {
            where.role = params.role;
        }

        if (params.department_id !== undefined) {
            where.department_id = params.department_id;
        }

        if (params.is_active !== undefined) {
            where.is_active = params.is_active;
        }

        // Execute query
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    department: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            }),
            prisma.user.count({ where }),
        ]);

        return {
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Lock a user account
     */
    async lockUser(userId: number, adminId: number, ipAddress?: string, userAgent?: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.is_active) {
            throw new Error('User is already locked');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { is_active: false },
            include: {
                department: true,
            },
        });

        // Create audit log
        await createAuditLog({
            actionType: 'user_locked',
            adminId,
            userId,
            entityType: 'user',
            entityId: userId,
            oldValue: { is_active: true },
            newValue: { is_active: false },
            ipAddress,
            userAgent,
        });

        return updatedUser;
    },

    /**
     * Unlock a user account
     */
    async unlockUser(userId: number, adminId: number, ipAddress?: string, userAgent?: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        if (user.is_active) {
            throw new Error('User is already active');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { is_active: true },
            include: {
                department: true,
            },
        });

        // Create audit log
        await createAuditLog({
            actionType: 'user_unlocked',
            adminId,
            userId,
            entityType: 'user',
            entityId: userId,
            oldValue: { is_active: false },
            newValue: { is_active: true },
            ipAddress,
            userAgent,
        });

        return updatedUser;
    },

    /**
     * Change user role
     */
    async changeUserRole(
        userId: number,
        newRole: UserRole,
        adminId: number,
        ipAddress?: string,
        userAgent?: string
    ) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        // Business rule: cannot change own role
        if (userId === adminId) {
            throw new Error('Cannot change your own role');
        }

        // Business rule: cannot remove last admin
        if (user.role === 'admin' && newRole !== 'admin') {
            const adminCount = await prisma.user.count({
                where: { role: 'admin', is_active: true },
            });
            if (adminCount <= 1) {
                throw new Error('Cannot remove the last admin');
            }
        }

        const oldRole = user.role;
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: newRole },
            include: {
                department: true,
            },
        });

        // Create audit log
        await createAuditLog({
            actionType: 'role_changed',
            adminId,
            userId,
            entityType: 'user',
            entityId: userId,
            oldValue: { role: oldRole },
            newValue: { role: newRole },
            ipAddress,
            userAgent,
        });

        return updatedUser;
    },

    /**
     * Bulk lock users
     */
    async bulkLock(userIds: number[], adminId: number, ipAddress?: string, userAgent?: string) {
        const results = {
            successCount: 0,
            failureCount: 0,
            failures: [] as Array<{ userId: number; error: string }>,
        };

        for (const userId of userIds) {
            try {
                // Skip current admin
                if (userId === adminId) {
                    results.failureCount++;
                    results.failures.push({
                        userId,
                        error: 'Cannot lock your own account',
                    });
                    continue;
                }

                await this.lockUser(userId, adminId, ipAddress, userAgent);
                results.successCount++;
            } catch (error) {
                results.failureCount++;
                results.failures.push({
                    userId,
                    error: (error as Error).message,
                });
            }
        }

        return results;
    },

    /**
     * Bulk unlock users
     */
    async bulkUnlock(userIds: number[], adminId: number, ipAddress?: string, userAgent?: string) {
        const results = {
            successCount: 0,
            failureCount: 0,
            failures: [] as Array<{ userId: number; error: string }>,
        };

        for (const userId of userIds) {
            try {
                await this.unlockUser(userId, adminId, ipAddress, userAgent);
                results.successCount++;
            } catch (error) {
                results.failureCount++;
                results.failures.push({
                    userId,
                    error: (error as Error).message,
                });
            }
        }

        return results;
    },

    /**
     * Get role permission matrix
     */
    async getRoleMatrix() {
        return {
            admin: {
                permissions: [
                    'users:read',
                    'users:write',
                    'roles:write',
                    'events:approve',
                    'events:manage',
                    'categories:manage',
                    'departments:manage',
                    'statistics:read',
                    'audit:read',
                ],
            },
            organizer: {
                permissions: [
                    'events:create',
                    'events:manage_own',
                    'registrations:read_own_events',
                    'attendance:manage_own_events',
                    'statistics:read_own',
                ],
            },
            student: {
                permissions: [
                    'events:read',
                    'registrations:create',
                    'registrations:read_own',
                    'attendance:read_own',
                    'feedback:create',
                    'profile:manage_own',
                ],
            },
        };
    },

    /**
     * Get role distribution statistics
     */
    async getRoleStatistics() {
        const [totalUsers, roleTotals, activeRoleTotals] = await Promise.all([
            prisma.user.count(),
            prisma.user.groupBy({
                by: ['role'],
                _count: { _all: true },
            }),
            prisma.user.groupBy({
                by: ['role'],
                where: { is_active: true },
                _count: { _all: true },
            }),
        ]);

        const totalsMap = new Map(roleTotals.map((row) => [row.role, row._count._all]));
        const activeMap = new Map(activeRoleTotals.map((row) => [row.role, row._count._all]));
        const roles: UserRole[] = ['admin', 'organizer', 'student'];

        const byRole = roles.map((role) => {
            const total = totalsMap.get(role) || 0;
            const active = activeMap.get(role) || 0;

            return {
                role,
                total,
                active,
                inactive: Math.max(total - active, 0),
                percentage: totalUsers > 0 ? Number(((total / totalUsers) * 100).toFixed(2)) : 0,
            };
        });

        return {
            totalUsers,
            byRole,
        };
    },
};
