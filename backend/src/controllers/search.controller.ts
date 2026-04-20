import { Request, Response } from 'express';
import prisma from '../config/database';
import { getAuthenticatedUser } from '../utils/request.util';

export const globalSearch = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        const query = q as string;
        const currentUser = getAuthenticatedUser(req);

        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Query must be at least 2 characters'
            });
        }

        // Search events
        const events = await prisma.event.findMany({
            where: {
                deleted_at: null,
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { location: { contains: query, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                title: true,
                location: true,
                status: true
            },
            take: 5
        });

        const canSearchUsers = currentUser.role === 'admin' || currentUser.role === 'organizer';
        const users = canSearchUsers
            ? await prisma.user.findMany({
                where: {
                    OR: [
                        { full_name: { contains: query, mode: 'insensitive' } },
                        { student_id: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } }
                    ],
                    is_active: true,
                    ...(currentUser.role === 'organizer' ? { role: 'student' } : {}),
                },
                select: {
                    id: true,
                    full_name: true,
                    student_id: true,
                    email: true,
                    role: true
                },
                take: 5
            })
            : [];

        const results = [
            ...events.map(event => ({
                type: 'event',
                id: event.id,
                title: event.title,
                subtitle: event.location,
                status: event.status
            })),
            ...users.map(user => ({
                type: user.role === 'student' ? 'student' : 'user',
                id: user.id,
                title: user.full_name,
                subtitle: user.student_id || user.email,
                role: user.role
            }))
        ];

        return res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Global search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tìm kiếm'
        });
    }
};
