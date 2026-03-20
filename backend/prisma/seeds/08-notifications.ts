import { PrismaClient, Registration, Attendance, TrainingPoint, Event, User } from '@prisma/client';

export async function seedNotifications(
    prisma: PrismaClient,
    registrations: Registration[],
    attendances: Attendance[],
    trainingPoints: TrainingPoint[],
    events: { completedEvent: Event; upcomingEvent1: Event },
    students: User[]
) {
    console.log('🔔 Seeding notifications...');

    const { completedEvent, upcomingEvent1 } = events;
    const notifications = [];

    // Registration confirmations for all registrations
    for (const reg of registrations) {
        const event = await prisma.event.findUnique({ where: { id: reg.event_id } });
        const notif = await prisma.notification.create({
            data: {
                user_id: reg.user_id,
                event_id: reg.event_id,
                type: 'registration_confirm',
                title: 'Đăng ký sự kiện thành công',
                message: `Bạn đã đăng ký thành công sự kiện "${event?.title}". Vui lòng đến đúng giờ!`,
                is_read: true,
            },
        });
        notifications.push(notif);
    }

    // Check-in success notifications for attendances
    for (let i = 0; i < attendances.length; i++) {
        const attendance = attendances[i];
        const registration = await prisma.registration.findUnique({
            where: { id: attendance.registration_id },
            include: { event: true },
        });

        const notif = await prisma.notification.create({
            data: {
                user_id: registration!.user_id,
                event_id: registration!.event_id,
                type: 'checkin_success',
                title: 'Check-in thành công',
                message: `Bạn đã check-in thành công sự kiện "${registration!.event.title}"`,
                is_read: true,
            },
        });
        notifications.push(notif);
    }

    // Points awarded notifications
    for (let i = 0; i < trainingPoints.length; i++) {
        const tp = trainingPoints[i];
        const event = await prisma.event.findUnique({ where: { id: tp.event_id } });
        const notif = await prisma.notification.create({
            data: {
                user_id: tp.user_id,
                event_id: tp.event_id,
                type: 'points_awarded',
                title: 'Nhận điểm rèn luyện',
                message: `Bạn đã nhận ${tp.points} điểm rèn luyện từ sự kiện "${event?.title}"`,
                is_read: i < 5,
            },
        });
        notifications.push(notif);
    }

    // Event reminders for upcoming events
    for (const student of students.slice(0, 2)) {
        const notif = await prisma.notification.create({
            data: {
                user_id: student.id,
                event_id: upcomingEvent1.id,
                type: 'event_reminder',
                title: 'Nhắc nhở sự kiện',
                message: `Sự kiện "Cuộc thi Hackathon 2026" sẽ diễn ra trong 7 ngày nữa. Đừng quên tham gia!`,
                is_read: false,
            },
        });
        notifications.push(notif);
    }

    // Feedback request for completed events
    for (const student of [students[4]]) {
        const notif = await prisma.notification.create({
            data: {
                user_id: student.id,
                event_id: completedEvent.id,
                type: 'feedback_request',
                title: 'Yêu cầu đánh giá',
                message: `Vui lòng đánh giá sự kiện "Workshop: Lập trình Web với React" để giúp chúng tôi cải thiện chất lượng`,
                is_read: false,
            },
        });
        notifications.push(notif);
    }

    console.log(`✅ Created ${notifications.length} notifications`);
    return notifications;
}
