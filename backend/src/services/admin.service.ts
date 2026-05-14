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

        const buffer = req.file!.buffer;
        const rawText = buffer.toString('utf8').trim();
        const lines = rawText.split('\n').filter((line) => line.trim().length > 0);

        if (lines.length < 2) {
            throw new Error('CSV file must have a header row and at least one data row');
        }

        const headers = lines[0].split(',').map((h) => h.trim());
        const requiredColumns = ['email', 'full_name'];
        const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
        if (missingColumns.length > 0) {
            throw new Error('Missing required columns: ' + missingColumns.join(', '));
        }

        const rawRows: string[][] = [];
        await new Promise<void>((resolve, reject) => {
            const stream = csvParser({ skipLines: 1, headers: false });
            stream.on('data', (row: Record<string, string>) => {
                rawRows.push(Object.values(row));
            });
            stream.on('end', () => resolve());
            stream.on('error', (err: Error) => reject(err));
            Readable.from(buffer).pipe(stream);
        });

        const rows: Record<string, string>[] = rawRows.map((values) => {
            const row: Record<string, string> = {};
            headers.forEach((col, i) => {
                row[col] = values[i] ?? '';
            });
            return row;
        });

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2;

            try {
                const email = row['email']?.trim();
                if (!email) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email: '', error: 'Email is required' });
                    continue;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email: email, error: 'Invalid email format' });
                    continue;
                }

                const fullName = row['full_name']?.trim();
                if (!fullName) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email: email, error: 'Full name is required' });
                    continue;
                }

                const rawStudentId = row['student_id']?.trim() || '';
                const studentId = (rawStudentId === '' || rawStudentId === '-') ? null : rawStudentId;
                const role = (row['role']?.trim()?.toLowerCase() || 'participant') as UserRole;
                const departmentId = row['department_id']?.trim()
                    ? parseInt(row['department_id'], 10)
                    : null;

                if (!['admin', 'organizer', 'participant'].includes(role)) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email: email, error: 'Invalid role: ' + role + '. Must be admin, organizer, or student' });
                    continue;
                }

                if (departmentId !== null && isNaN(departmentId)) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email: email, error: 'Invalid department_id: must be a number' });
                    continue;
                }

                const existingUser = await prisma.user.findUnique({ where: { email } });
                if (existingUser) {
                    results.failed++;
                    results.errors.push({ row: rowNumber, email: email, error: 'User with this email already exists' });
                    continue;
                }

                if (departmentId !== null) {
                    const department = await prisma.department.findUnique({ where: { id: departmentId } });
                    if (!department) {
                        results.failed++;
                        results.errors.push({ row: rowNumber, email: email, error: 'Department with id ' + departmentId + ' not found' });
                        continue;
                    }
                }

                const bcrypt = await import('bcrypt');
                const passwordHash = await bcrypt.hash(email.split('@')[0] + '123456', 10);

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

                await createAuditLog({
                    actionType: 'user_created',
                    adminId,
                    entityType: 'user',
                    entityId: 0,
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

        if (userId === adminId) {
            throw new Error('Cannot change your own role');
        }

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

    async bulkLock(userIds: number[], adminId: number, ipAddress?: string, userAgent?: string) {
        const results = {
            successCount: 0,
            failureCount: 0,
            failures: [] as Array<{ userId: number; error: string }>,
        };

        for (const userId of userIds) {
            try {
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
            participant: {
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
        const roles: UserRole[] = ['admin', 'organizer', 'participant'];

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
