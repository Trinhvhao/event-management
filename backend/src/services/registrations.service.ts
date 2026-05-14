import prisma from '../config/database';
import QRCode from 'qrcode';
import * as notificationsService from './notifications.service';
import { eventTeamService } from './event-team.service';
import * as emailService from './email.service';
import { ticketService } from './ticket.service';
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from '../middleware/errorHandler';
import { RegistrationStatus, UserRole } from '@prisma/client';

type RequesterContext = {
    id: number;
    role: UserRole;
};

const parseRegistrationStatus = (status?: string): RegistrationStatus | undefined => {
    if (!status) {
        return undefined;
    }

    if (status === 'registered' || status === 'cancelled') {
        return status;
    }

    throw new ValidationError('Trạng thái đăng ký không hợp lệ');
};

const generateRegistrationQrCode = async (params: {
    registrationId: number;
    eventId: number;
    userId: number;
    eventEndTime: Date;
}) => {
    const qrData = {
        registration_id: params.registrationId,
        event_id: params.eventId,
        user_id: params.userId,
        issued_at: new Date().toISOString(),
        expires_at: params.eventEndTime.toISOString(),
    };

    return QRCode.toDataURL(JSON.stringify(qrData));
};

export const registerForEvent = async (
    userId: number,
    eventId: number,
    options?: { reason?: string; agreed?: boolean }
) => {
    const { reason, agreed } = options || {};

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title: true,
            status: true,
            start_time: true,
            end_time: true,
            location: true,
            capacity: true,
            training_points: true,
            event_cost: true,
            registration_deadline: true,
            deleted_at: true,
            approval_type: true,
            require_reason: true,
            require_agreement: true,
        },
    });

    if (!event || event.deleted_at) {
        throw new NotFoundError('Sự kiện không tồn tại');
    }

    // Check approval type
    if (event.approval_type === 'no_registration') {
        throw new ValidationError('Sự kiện này không yêu cầu đăng ký');
    }

    // Check if agreement is required
    if (event.require_agreement && !agreed) {
        throw new ValidationError('Bạn cần đồng ý với nội quy và cam kết của sự kiện');
    }

    // Check if reason is required
    if (event.require_reason && (!reason || reason.trim() === '')) {
        throw new ValidationError('Bạn cần nhập lý do đăng ký sự kiện này');
    }

    const now = new Date();

    if (event.status !== 'upcoming' && event.status !== 'approved') {
        throw new ValidationError('Chỉ có thể đăng ký sự kiện sắp diễn ra');
    }

    if (event.end_time <= now) {
        throw new ValidationError('Sự kiện đã kết thúc');
    }

    if (event.start_time <= now) {
        throw new ValidationError('Sự kiện đã bắt đầu, không thể đăng ký');
    }

    if (event.registration_deadline && now > event.registration_deadline) {
        throw new ValidationError('Đã quá hạn đăng ký sự kiện');
    }

    // For require_approval type, count only approved registrations
    const activeWhere: { event_id: number; status: 'registered'; approval_status?: 'approved' } = event.approval_type === 'require_approval'
        ? { event_id: eventId, status: 'registered', approval_status: 'approved' }
        : { event_id: eventId, status: 'registered' };

    const activeRegistrations = await prisma.registration.count({
        where: activeWhere,
    });

    if (activeRegistrations >= event.capacity) {
        throw new ConflictError('Sự kiện đã đầy');
    }

    const existingRegistration = await prisma.registration.findUnique({
        where: {
            user_id_event_id: {
                user_id: userId,
                event_id: eventId,
            },
        },
        select: {
            id: true,
            status: true,
            approval_status: true,
        },
    });

    if (existingRegistration?.status === 'registered' || existingRegistration?.status === 'attended') {
        throw new ConflictError('Bạn đã đăng ký sự kiện này rồi');
    }

    // Determine approval status based on event approval_type
    const approvalStatus = event.approval_type === 'require_approval' ? 'pending' : 'approved';

    let updatedRegistration;

    if (existingRegistration?.status === 'cancelled') {
        const qrCodeString = await generateRegistrationQrCode({
            registrationId: existingRegistration.id,
            eventId,
            userId,
            eventEndTime: event.end_time,
        });

        updatedRegistration = await prisma.registration.update({
            where: { id: existingRegistration.id },
            data: {
                status: 'registered',
                registered_at: now,
                qr_code: qrCodeString,
                reason: reason || null,
                agreed_at: agreed ? now : null,
                approval_status: approvalStatus,
                approved_by: approvalStatus === 'approved' ? userId : null,
                approved_at: approvalStatus === 'approved' ? now : null,
            },
            include: {
                event: true,
                user: true,
            },
        });
    } else {
        const registration = await prisma.registration.create({
            data: {
                user_id: userId,
                event_id: eventId,
                status: 'registered',
                qr_code: `qr${userId}${eventId}${Date.now()}`,
                reason: reason || null,
                agreed_at: agreed ? now : null,
                approval_status: approvalStatus,
                approved_by: approvalStatus === 'approved' ? userId : null,
                approved_at: approvalStatus === 'approved' ? now : null,
            },
            include: {
                event: true,
                user: true,
            },
        });

        const qrCodeString = await generateRegistrationQrCode({
            registrationId: registration.id,
            eventId,
            userId,
            eventEndTime: event.end_time,
        });

        updatedRegistration = await prisma.registration.update({
            where: { id: registration.id },
            data: { qr_code: qrCodeString },
            include: {
                event: true,
                user: true,
            },
        });
    }

    await prisma.eventWaitlist.updateMany({
        where: {
            event_id: eventId,
            user_id: userId,
            status: 'waiting',
        },
        data: {
            status: 'promoted',
        },
    });

    // Create notification
    try {
        if (approvalStatus === 'approved') {
            // Auto approved - send confirmation
            await notificationsService.notifyRegistrationConfirm(
                userId,
                eventId,
                event.title,
                event.location,
                event.start_time,
                event.end_time,
                event.training_points,
                updatedRegistration.qr_code,
                event.event_cost ? Number(event.event_cost) : undefined
            );

            // Create ticket and send email
            const ticket = await ticketService.createTicket({
                registration_id: updatedRegistration.id,
                event_id: eventId,
                user_id: userId,
            });

            const pdfPath = await emailService.generateTicketPDF(ticket);
            await emailService.sendTicketEmail(ticket, pdfPath);
            await ticketService.markTicketSent(ticket.id);

            updatedRegistration = {
                ...updatedRegistration,
                ticket,
            };
        } else {
            // Pending approval - notify organizer
            const organizers = await prisma.user.findMany({
                where: {
                    role: { in: ['organizer', 'admin'] },
                    is_active: true,
                },
                select: { id: true },
            });

            for (const org of organizers) {
                await prisma.notification.create({
                    data: {
                        user_id: org.id,
                        event_id: eventId,
                        type: 'registration_confirm',
                        title: 'Yêu cầu duyệt đăng ký',
                        message: `Sinh viên ${updatedRegistration.user.full_name} đã đăng ký tham gia sự kiện "${event.title}". Vui lòng xem xét và duyệt.`,
                    },
                });
            }

            // Notify student
            await prisma.notification.create({
                data: {
                    user_id: userId,
                    event_id: eventId,
                    type: 'registration_confirm',
                    title: 'Đăng ký đang chờ duyệt',
                    message: `Đăng ký của bạn tham gia sự kiện "${event.title}" đang được chờ duyệt. Bạn sẽ được thông báo khi được duyệt.`,
                },
            });
        }
    } catch (notifError) {
        console.error('Failed to create notification:', notifError);
    }

    return {
        ...updatedRegistration,
        is_pending_approval: approvalStatus === 'pending',
    };
};

export const getMyRegistrations = async (userId: number, status?: string, approvalStatus?: string) => {
    const where: any = { user_id: userId };
    const parsedStatus = parseRegistrationStatus(status);

    if (parsedStatus) {
        where.status = parsedStatus;
    }

    if (approvalStatus) {
        where.approval_status = approvalStatus;
    }

    const registrations = await prisma.registration.findMany({
        where,
        include: {
            event: {
                include: {
                    organizer: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true
                        }
                    }
                }
            },
            // Include payment if exists
            payment: {
                select: {
                    id: true,
                    status: true,
                    amount: true,
                }
            }
        },
        orderBy: {
            registered_at: 'desc'
        }
    });

    // Map payment status to registration
    return registrations.map(reg => ({
        ...reg,
        payment_status: reg.payment?.status || null,
    }));
};

export const cancelRegistration = async (userId: number, registrationId: number) => {
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            event: {
                select: {
                    id: true,
                    capacity: true,
                    start_time: true,
                    end_time: true,
                    status: true,
                    auto_promote_waitlist: true,
                    approval_type: true,
                    training_points: true,
                    event_cost: true,
                    location: true,
                },
            },
        },
    });

    if (!registration) {
        throw new NotFoundError('Registration');
    }

    if (registration.user_id !== userId) {
        throw new ForbiddenError('Bạn không có quyền hủy đăng ký này');
    }

    if (registration.status === 'cancelled') {
        throw new ConflictError('Đăng ký đã bị hủy trước đó');
    }

    const now = new Date();

    if (registration.event.status === 'cancelled' || registration.event.status === 'completed') {
        throw new ConflictError('Không thể hủy đăng ký của sự kiện đã kết thúc hoặc đã bị hủy');
    }

    if (registration.event.start_time <= now) {
        throw new ConflictError('Không thể hủy đăng ký sau khi sự kiện đã bắt đầu');
    }

    // Check if can cancel (24 hours before event)
    const hoursUntilEvent =
        (registration.event.start_time.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilEvent < 24) {
        throw new ConflictError('Không thể hủy đăng ký trong vòng 24 giờ trước sự kiện');
    }

    // Update status to cancelled
    await prisma.registration.update({
        where: { id: registrationId },
        data: { status: 'cancelled' }
    });

    // Cancel associated ticket
    try {
        await ticketService.cancelTicket(registrationId);
    } catch (ticketError) {
        console.error('Failed to cancel ticket:', ticketError);
    }

    // Auto-promote from waitlist if enabled
    if (registration.event.auto_promote_waitlist) {
        await promoteFromWaitlist(registration.event_id, registration.event.capacity);
    }

    // Log cancellation
    await prisma.eventTeamActivity.create({
        data: {
            event_id: registration.event_id,
            actor_id: userId,
            action_type: 'registration_cancelled',
            target_user_id: userId,
            metadata: { registration_id: registrationId },
        },
    }).catch(() => {});

    return true;
};

export const getEventRegistrations = async (
    eventId: number,
    status: string | undefined,
    approvalStatus: string | undefined,
    requester: RequesterContext
) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            organizer_id: true,
            deleted_at: true,
        },
    });

    if (!event || event.deleted_at) {
        throw new NotFoundError('Sự kiện không tồn tại');
    }

    if (requester.role === 'organizer' && !(await eventTeamService.canUserPerformAction(eventId, requester.id, requester.role, 'manage_registrations'))) {
        throw new ForbiddenError('Bạn không có quyền xem danh sách đăng ký của sự kiện này');
    }

    const where: any = { event_id: eventId };
    const parsedStatus = parseRegistrationStatus(status);

    if (parsedStatus) {
        where.status = parsedStatus;
    }

    if (approvalStatus) {
        where.approval_status = approvalStatus;
    }

    const registrations = await prisma.registration.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    student_id: true,
                    department_id: true
                }
            },
            approver: {
                select: {
                    id: true,
                    full_name: true
                }
            }
        },
        orderBy: {
            registered_at: 'desc'
        }
    });

    return registrations;
};

/**
 * Export event registrations as CSV string
 */
export const exportEventRegistrationsCsv = async (
    eventId: number,
    requester: RequesterContext,
    options: { status?: string; approvalStatus?: string } = {}
): Promise<string> => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, organizer_id: true, deleted_at: true },
    });

    if (!event || event.deleted_at) {
        throw new NotFoundError('Sự kiện không tồn tại');
    }

    if (requester.role === 'organizer' && !(await eventTeamService.canUserPerformAction(eventId, requester.id, requester.role, 'manage_registrations'))) {
        throw new ForbiddenError('Bạn không có quyền xuất danh sách đăng ký');
    }

    const where: any = { event_id: eventId };
    const parsedStatus = parseRegistrationStatus(options.status);
    if (parsedStatus) where.status = parsedStatus;
    if (options.approvalStatus) where.approval_status = options.approvalStatus;

    const registrations = await prisma.registration.findMany({
        where,
        include: {
            user: {
                select: {
                    full_name: true,
                    student_id: true,
                    email: true,
                    department: { select: { name: true } },
                },
            },
            approver: {
                select: { full_name: true },
            },
        },
        orderBy: { registered_at: 'asc' },
    });

    const headers = ['STT', 'Họ tên', 'MSSV', 'Email', 'Khoa', 'Ngày đăng ký', 'Trạng thái', 'Phê duyệt', 'Người duyệt', 'Ghi chú'];
    const rows: string[][] = [];

    for (let i = 0; i < registrations.length; i++) {
        const r = registrations[i];
        const statusLabels: Record<string, string> = {
            registered: 'Đã đăng ký',
            cancelled: 'Đã hủy',
            attended: 'Đã tham dự',
        };
        const approvalLabels: Record<string, string> = {
            pending: 'Chờ duyệt',
            approved: 'Đã duyệt',
            rejected: 'Từ chối',
        };
        rows.push([
            String(i + 1),
            r.user.full_name,
            r.user.student_id || '',
            r.user.email,
            r.user.department?.name || '',
            new Date(r.registered_at).toLocaleString('vi-VN'),
            statusLabels[r.status] || r.status,
            approvalLabels[r.approval_status] || r.approval_status,
            r.approver?.full_name || '',
            r.approval_note || '',
        ]);
    }

    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

    return [
        headers.map(escape).join(','),
        ...rows.map((row) => row.map(escape).join(',')),
    ].join('\n');
};

// =====================
// Approval Functions
// =====================

export const getPendingRegistrations = async (requester: RequesterContext, eventId?: number) => {
    if (requester.role !== 'organizer' && requester.role !== 'admin') {
        throw new ForbiddenError('Bạn không có quyền xem danh sách đăng ký chờ duyệt');
    }

    const where: any = { approval_status: 'pending', status: 'registered' };

    if (eventId) {
        where.event_id = eventId;
    }

    // For organizers, only show events they manage
    if (requester.role === 'organizer') {
        const managedEvents = await prisma.event.findMany({
            where: {
                OR: [
                    { organizer_id: requester.id },
                    { team_members: { some: { user_id: requester.id } } }
                ]
            },
            select: { id: true }
        });
        where.event_id = { in: managedEvents.map(e => e.id) };
    }

    const pending = await prisma.registration.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    student_id: true,
                    department: {
                        select: { id: true, name: true }
                    }
                }
            },
            event: {
                select: {
                    id: true,
                    title: true,
                    start_time: true,
                    end_time: true,
                    location: true,
                    organizer_id: true
                }
            }
        },
        orderBy: {
            registered_at: 'asc'
        }
    });

    return pending;
};

export const approveRegistration = async (
    registrationId: number,
    requester: RequesterContext,
    note?: string
) => {
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    capacity: true,
                    start_time: true,
                    end_time: true,
                    location: true,
                    training_points: true,
                    event_cost: true,
                    organizer_id: true,
                    approval_type: true
                }
            },
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true
                }
            }
        }
    });

    if (!registration) {
        throw new NotFoundError('Đăng ký không tồn tại');
    }

    if (registration.approval_status !== 'pending') {
        throw new ConflictError('Đăng ký đã được xử lý');
    }

    // Check permission
    if (requester.role === 'organizer') {
        const canManage = await eventTeamService.canUserPerformAction(
            registration.event_id,
            requester.id,
            requester.role,
            'manage_registrations'
        );
        if (!canManage) {
            throw new ForbiddenError('Bạn không có quyền duyệt đăng ký này');
        }
    }

    // Update registration
    const updated = await prisma.registration.update({
        where: { id: registrationId },
        data: {
            approval_status: 'approved',
            approval_note: note || null,
            approved_by: requester.id,
            approved_at: new Date()
        },
        include: {
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    student_id: true,
                    department: {
                        select: { name: true }
                    }
                }
            },
            event: true
        }
    });

    // Notify student
    try {
        await notificationsService.notifyRegistrationConfirm(
            registration.user_id,
            registration.event_id,
            registration.event.title,
            registration.event.location,
            registration.event.start_time,
            registration.event.end_time,
            registration.event.training_points,
            registration.qr_code,
            registration.event.event_cost ? Number(registration.event.event_cost) : undefined
        );

        // Create ticket and send email
        const ticket = await ticketService.createTicket({
            registration_id: registration.id,
            event_id: registration.event_id,
            user_id: registration.user_id
        });

        const pdfPath = await emailService.generateTicketPDF(ticket);
        await emailService.sendTicketEmail(ticket, pdfPath);
        await ticketService.markTicketSent(ticket.id);
    } catch (notifError) {
        console.error('Failed to send notification:', notifError);
    }

    // Log activity
    await prisma.eventTeamActivity.create({
        data: {
            event_id: registration.event_id,
            actor_id: requester.id,
            action_type: 'registration_approved',
            target_user_id: registration.user_id,
            metadata: {
                registration_id: registrationId,
                user_name: registration.user.full_name,
                event_title: registration.event.title,
                note,
            },
        },
    }).catch(() => {});

    return updated;
};

export const rejectRegistration = async (
    registrationId: number,
    requester: RequesterContext,
    note?: string
) => {
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            event: {
                select: {
                    id: true,
                    title: true
                }
            },
            user: {
                select: {
                    id: true,
                    full_name: true
                }
            }
        }
    });

    if (!registration) {
        throw new NotFoundError('Đăng ký không tồn tại');
    }

    if (registration.approval_status !== 'pending') {
        throw new ConflictError('Đăng ký đã được xử lý');
    }

    // Check permission
    if (requester.role === 'organizer') {
        const canManage = await eventTeamService.canUserPerformAction(
            registration.event_id,
            requester.id,
            requester.role,
            'manage_registrations'
        );
        if (!canManage) {
            throw new ForbiddenError('Bạn không có quyền từ chối đăng ký này');
        }
    }

    // Update registration
    const updated = await prisma.registration.update({
        where: { id: registrationId },
        data: {
            approval_status: 'rejected',
            approval_note: note || null,
            approved_by: requester.id,
            approved_at: new Date()
        }
    });

    // Cancel the registration
    await prisma.registration.update({
        where: { id: registrationId },
        data: { status: 'cancelled' }
    });

    // Notify student
    try {
        await prisma.notification.create({
            data: {
                user_id: registration.user_id,
                event_id: registration.event_id,
                type: 'event_update',
                title: 'Đăng ký bị từ chối',
                message: `Đăng ký tham gia sự kiện "${registration.event.title}" đã bị từ chối. ${note ? 'Lý do: ' + note : ''}`
            }
        });
    } catch (notifError) {
        console.error('Failed to send notification:', notifError);
    }

    // Log activity
    await prisma.eventTeamActivity.create({
        data: {
            event_id: registration.event_id,
            actor_id: requester.id,
            action_type: 'registration_rejected',
            target_user_id: registration.user_id,
            metadata: {
                registration_id: registrationId,
                user_name: registration.user.full_name,
                event_title: registration.event.title,
                note,
            },
        },
    }).catch(() => {});

    return updated;
};

export interface BulkRegistrationResult {
    registrationId: number;
    success: boolean;
    error?: string;
}

export const bulkApproveRegistrations = async (
    registrationIds: number[],
    requester: RequesterContext,
    note?: string
): Promise<BulkRegistrationResult[]> => {
    const results: BulkRegistrationResult[] = [];

    for (const id of registrationIds) {
        try {
            await approveRegistration(id, requester, note);
            results.push({ registrationId: id, success: true });
        } catch (error: any) {
            results.push({
                registrationId: id,
                success: false,
                error: error.message || 'Lỗi không xác định',
            });
        }
    }

    return results;
};

export const bulkRejectRegistrations = async (
    registrationIds: number[],
    requester: RequesterContext,
    note?: string
): Promise<BulkRegistrationResult[]> => {
    const results: BulkRegistrationResult[] = [];

    for (const id of registrationIds) {
        try {
            await rejectRegistration(id, requester, note);
            results.push({ registrationId: id, success: true });
        } catch (error: any) {
            results.push({
                registrationId: id,
                success: false,
                error: error.message || 'Lỗi không xác định',
            });
        }
    }

    return results;
};

export const getRegistrationById = async (registrationId: number) => {
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            event: true,
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    student_id: true
                }
            }
        }
    });

    if (!registration) {
        throw new NotFoundError('Registration');
    }

    return registration;
};

export const getRegistrationByIdWithAccess = async (
    registrationId: number,
    requester: RequesterContext
) => {
    const registration = await getRegistrationById(registrationId);

    if (requester.role === 'participant' && registration.user_id !== requester.id) {
        throw new ForbiddenError('Bạn không có quyền xem đăng ký này');
    }

    if (
        requester.role === 'organizer' &&
        !(await eventTeamService.canUserPerformAction(registration.event_id, requester.id, requester.role, 'manage_registrations'))
    ) {
        throw new ForbiddenError('Bạn không có quyền xem đăng ký này');
    }

    return registration;
};

export const getRegistrationQRCodeWithAccess = async (
    registrationId: number,
    requester: RequesterContext
) => {
    const registration = await getRegistrationByIdWithAccess(registrationId, requester);

    if (registration.status === 'cancelled') {
        throw new ConflictError('Đăng ký đã bị hủy, không thể lấy QR code');
    }

    return {
        registration_id: registration.id,
        event_id: registration.event_id,
        status: registration.status,
        registered_at: registration.registered_at,
        qr_code: registration.qr_code,
    };
};

// =====================
// Waitlist Functions
// =====================

/**
 * Promote the next person from the waitlist to registered status
 */
const promoteFromWaitlist = async (eventId: number, capacity: number) => {
    const activeCount = await prisma.registration.count({
        where: { event_id: eventId, status: 'registered' },
    });

    if (activeCount >= capacity) return; // No slots available

    const nextInWaitlist = await prisma.eventWaitlist.findFirst({
        where: { event_id: eventId, status: 'waiting' },
        orderBy: { position: 'asc' },
        include: {
            user: { select: { id: true, email: true, full_name: true } },
            event: { select: { title: true, location: true, start_time: true, end_time: true, training_points: true, event_cost: true } },
        },
    });

    if (!nextInWaitlist) return;

    // Mark as promoted
    await prisma.eventWaitlist.update({
        where: { id: nextInWaitlist.id },
        data: { status: 'promoted' },
    });

    // Remove old cancelled/attended registration if exists
    await prisma.registration.deleteMany({
        where: {
            user_id: nextInWaitlist.user_id,
            event_id: eventId,
            status: { in: ['cancelled', 'attended'] },
        },
    });

    // Create new approved registration
    await prisma.registration.create({
        data: {
            user_id: nextInWaitlist.user_id,
            event_id: eventId,
            status: 'registered',
            approval_status: 'approved',
            qr_code: `REG-${eventId}-${nextInWaitlist.user_id}-${Date.now()}`,
            agreed_at: new Date(),
        },
    });

    // Reorder waitlist
    await prisma.eventWaitlist.updateMany({
        where: {
            event_id: eventId,
            status: 'waiting',
            position: { gt: nextInWaitlist.position },
        },
        data: { position: { decrement: 1 } },
    });

    // Notify promoted user
    try {
        await notificationsService.notifyRegistrationConfirm(
            nextInWaitlist.user_id,
            eventId,
            nextInWaitlist.event.title,
            nextInWaitlist.event.location,
            nextInWaitlist.event.start_time,
            nextInWaitlist.event.end_time,
            nextInWaitlist.event.training_points,
            undefined,
            nextInWaitlist.event.event_cost ? Number(nextInWaitlist.event.event_cost) : undefined
        );
    } catch (e) {
        console.error('Failed to notify promoted user:', e);
    }
};

export const joinWaitlist = async (userId: number, eventId: number) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title: true,
            status: true,
            start_time: true,
            end_time: true,
            capacity: true,
            registration_deadline: true,
            deleted_at: true,
            waitlist_enabled: true,
            waitlist_capacity: true,
        },
    });

    if (!event || event.deleted_at) {
        throw new NotFoundError('Sự kiện không tồn tại');
    }

    if (!event.waitlist_enabled) {
        throw new ValidationError('Sự kiện này không bật danh sách chờ');
    }

    if (event.status !== 'upcoming' && event.status !== 'approved') {
        throw new ValidationError('Chỉ có thể vào danh sách chờ sự kiện sắp diễn ra');
    }

    if (event.end_time <= new Date()) {
        throw new ValidationError('Sự kiện đã kết thúc');
    }

    if (event.registration_deadline && new Date() > event.registration_deadline) {
        throw new ValidationError('Đã quá hạn đăng ký sự kiện');
    }

    const activeRegistrations = await prisma.registration.count({
        where: {
            event_id: eventId,
            status: 'registered',
        },
    });

    if (activeRegistrations < event.capacity) {
        throw new ConflictError('Sự kiện vẫn còn chỗ trống, không thể vào danh sách chờ');
    }

    // Check waitlist capacity
    if (event.waitlist_capacity > 0) {
        const currentWaitlist = await prisma.eventWaitlist.count({
            where: {
                event_id: eventId,
                status: 'waiting',
            },
        });
        if (currentWaitlist >= event.waitlist_capacity) {
            throw new ConflictError(`Danh sách chờ đã đầy (tối đa ${event.waitlist_capacity} người)`);
        }
    }

    // Check if already registered
    const existingRegistration = await prisma.registration.findUnique({
        where: {
            user_id_event_id: {
                user_id: userId,
                event_id: eventId,
            },
        },
    });

    if (existingRegistration?.status === 'registered') {
        throw new ConflictError('Bạn đã đăng ký sự kiện này rồi');
    }

    if (existingRegistration?.status === 'attended') {
        throw new ConflictError('Bạn đã tham dự sự kiện này rồi');
    }

    // Check if already in waitlist
    const existingWaitlist = await prisma.eventWaitlist.findUnique({
        where: {
            event_id_user_id: {
                event_id: eventId,
                user_id: userId,
            },
        },
    });

    if (existingWaitlist && existingWaitlist.status === 'waiting') {
        throw new ConflictError('Bạn đã có trong danh sách chờ của sự kiện này');
    }

    // Get next position
    const lastInWaitlist = await prisma.eventWaitlist.findFirst({
        where: {
            event_id: eventId,
            status: 'waiting',
        },
        orderBy: {
            position: 'desc',
        },
    });

    const nextPosition = (lastInWaitlist?.position ?? 0) + 1;

    // Create waitlist entry
    const waitlistEntry = await prisma.eventWaitlist.upsert({
        where: {
            event_id_user_id: {
                event_id: eventId,
                user_id: userId,
            },
        },
        update: {
            position: nextPosition,
            status: 'waiting',
        },
        create: {
            event_id: eventId,
            user_id: userId,
            position: nextPosition,
            status: 'waiting',
        },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    start_time: true,
                    end_time: true,
                    location: true,
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
    });

    return waitlistEntry;
};

export const leaveWaitlist = async (userId: number, eventId: number) => {
    const waitlistEntry = await prisma.eventWaitlist.findUnique({
        where: {
            event_id_user_id: {
                event_id: eventId,
                user_id: userId,
            },
        },
    });

    if (!waitlistEntry) {
        throw new NotFoundError('Bạn không có trong danh sách chờ của sự kiện này');
    }

    if (waitlistEntry.status !== 'waiting') {
        throw new ConflictError('Yêu cầu không hợp lệ');
    }

    // Update status to cancelled
    await prisma.eventWaitlist.update({
        where: { id: waitlistEntry.id },
        data: { status: 'cancelled' },
    });

    // Reorder remaining waitlist positions
    await prisma.eventWaitlist.updateMany({
        where: {
            event_id: eventId,
            status: 'waiting',
            position: {
                gt: waitlistEntry.position,
            },
        },
        data: {
            position: {
                decrement: 1,
            },
        },
    });

    return true;
};

export const getWaitlistPosition = async (userId: number, eventId: number) => {
    const waitlistEntry = await prisma.eventWaitlist.findUnique({
        where: {
            event_id_user_id: {
                event_id: eventId,
                user_id: userId,
            },
        },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    capacity: true,
                },
            },
        },
    });

    if (!waitlistEntry || waitlistEntry.status !== 'waiting') {
        return null;
    }

    // Count total waitlist size
    const totalWaitlist = await prisma.eventWaitlist.count({
        where: {
            event_id: eventId,
            status: 'waiting',
        },
    });

    return {
        position: waitlistEntry.position,
        status: waitlistEntry.status,
        total_waitlist: totalWaitlist,
        event_id: eventId,
        event_title: waitlistEntry.event.title,
    };
};

export const getEventWaitlist = async (
    eventId: number,
    requester: RequesterContext
) => {
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            organizer_id: true,
            deleted_at: true,
        },
    });

    if (!event || event.deleted_at) {
        throw new NotFoundError('Sự kiện không tồn tại');
    }

    if (requester.role === 'organizer' && !(await eventTeamService.canUserPerformAction(eventId, requester.id, requester.role, 'manage_registrations'))) {
        throw new ForbiddenError('Bạn không có quyền xem danh sách chờ của sự kiện này');
    }

    const waitlist = await prisma.eventWaitlist.findMany({
        where: {
            event_id: eventId,
            status: 'waiting',
        },
        include: {
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    student_id: true,
                    department_id: true,
                },
            },
        },
        orderBy: {
            position: 'asc',
        },
    });

    return waitlist;
};
