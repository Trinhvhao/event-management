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

    // Get admin user
    const adminUser = await prisma.user.findFirst({
        where: { role: 'admin' }
    });

    if (!adminUser) {
        console.log('⚠️ No admin user found, skipping admin notifications');
    }

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

    // ============================================
    // ADMIN NOTIFICATIONS
    // ============================================
    if (adminUser) {
        console.log('📢 Creating admin notifications...');

        // 1. System alerts
        const systemAlerts = [
            {
                type: 'system_alert',
                title: '🔔 Hệ thống hoạt động bình thường',
                message: 'Tất cả các dịch vụ đang hoạt động ổn định. Database backup đã được thực hiện thành công.',
                is_read: true,
            },
            {
                type: 'system_alert',
                title: '⚠️ Cảnh báo dung lượng',
                message: 'Dung lượng lưu trữ đã sử dụng 75%. Vui lòng kiểm tra và dọn dẹp dữ liệu không cần thiết.',
                is_read: false,
            },
            {
                type: 'system_alert',
                title: '🔄 Cập nhật hệ thống',
                message: 'Phiên bản mới v2.1.0 đã sẵn sàng. Bao gồm cải tiến hiệu suất và sửa lỗi bảo mật.',
                is_read: false,
            },
        ];

        for (const alert of systemAlerts) {
            const notif = await prisma.notification.create({
                data: {
                    user_id: adminUser.id,
                    ...alert,
                },
            });
            notifications.push(notif);
        }

        // 2. Event management notifications
        const eventNotifs = [
            {
                type: 'event_created',
                title: '✨ Sự kiện mới được tạo',
                message: `Organizer đã tạo sự kiện mới "Hội thảo AI & Machine Learning". Vui lòng xem xét và phê duyệt.`,
                event_id: upcomingEvent1.id,
                is_read: false,
            },
            {
                type: 'event_updated',
                title: '📝 Sự kiện được cập nhật',
                message: `Sự kiện "${completedEvent.title}" đã được cập nhật thông tin. Vui lòng kiểm tra lại.`,
                event_id: completedEvent.id,
                is_read: true,
            },
            {
                type: 'event_cancelled',
                title: '❌ Sự kiện bị hủy',
                message: 'Sự kiện "Workshop Python" đã bị hủy do không đủ số lượng đăng ký. 15 sinh viên đã được thông báo.',
                is_read: true,
            },
        ];

        for (const notif of eventNotifs) {
            const created = await prisma.notification.create({
                data: {
                    user_id: adminUser.id,
                    ...notif,
                },
            });
            notifications.push(created);
        }

        // 3. User management notifications
        const userNotifs = [
            {
                type: 'user_registered',
                title: '👤 Người dùng mới đăng ký',
                message: `${students[0].full_name} (${students[0].email}) vừa đăng ký tài khoản mới. Tổng số người dùng: ${students.length + 1}.`,
                is_read: true,
            },
            {
                type: 'role_change_request',
                title: '🔐 Yêu cầu thay đổi quyền',
                message: `${students[1].full_name} yêu cầu nâng cấp lên vai trò Organizer. Vui lòng xem xét hồ sơ.`,
                is_read: false,
            },
            {
                type: 'suspicious_activity',
                title: '⚠️ Hoạt động bất thường',
                message: 'Phát hiện 5 lần đăng nhập thất bại từ IP 192.168.1.100 trong 10 phút. Tài khoản đã bị khóa tạm thời.',
                is_read: false,
            },
        ];

        for (const notif of userNotifs) {
            const created = await prisma.notification.create({
                data: {
                    user_id: adminUser.id,
                    ...notif,
                },
            });
            notifications.push(created);
        }

        // 4. Statistics & Reports
        const statsNotifs = [
            {
                type: 'report_ready',
                title: '📊 Báo cáo tháng đã sẵn sàng',
                message: 'Báo cáo thống kê tháng 4/2026 đã được tạo. Tổng: 45 sự kiện, 1,234 lượt tham gia, 89% tỷ lệ check-in.',
                is_read: false,
            },
            {
                type: 'milestone_reached',
                title: '🎉 Đạt mốc quan trọng',
                message: 'Chúc mừng! Hệ thống đã đạt 10,000 lượt đăng ký sự kiện. Tỷ lệ hài lòng trung bình: 4.5/5.',
                is_read: true,
            },
            {
                type: 'low_attendance',
                title: '📉 Cảnh báo tỷ lệ tham dự thấp',
                message: `Sự kiện "${upcomingEvent1.title}" chỉ có 12 đăng ký trong khi sức chứa là 100. Cần có biện pháp quảng bá.`,
                event_id: upcomingEvent1.id,
                is_read: false,
            },
        ];

        for (const notif of statsNotifs) {
            const created = await prisma.notification.create({
                data: {
                    user_id: adminUser.id,
                    ...notif,
                },
            });
            notifications.push(created);
        }

        // 5. Feedback & Quality
        const feedbackNotifs = [
            {
                type: 'negative_feedback',
                title: '⭐ Đánh giá tiêu cực',
                message: `Sự kiện "${completedEvent.title}" nhận được 3 đánh giá 1 sao. Vui lòng xem xét và cải thiện.`,
                event_id: completedEvent.id,
                is_read: false,
            },
            {
                type: 'feedback_summary',
                title: '📝 Tổng hợp phản hồi',
                message: 'Tuần này có 45 đánh giá mới. Điểm trung bình: 4.2/5. Chủ đề phổ biến: "Cần cải thiện âm thanh".',
                is_read: true,
            },
        ];

        for (const notif of feedbackNotifs) {
            const created = await prisma.notification.create({
                data: {
                    user_id: adminUser.id,
                    ...notif,
                },
            });
            notifications.push(created);
        }

        // 6. Organizer activities
        const organizerNotifs = [
            {
                type: 'organizer_granted',
                title: '✅ Cấp quyền Organizer',
                message: `Đã cấp quyền Organizer cho ${students[2].full_name}. Họ có thể tạo và quản lý sự kiện.`,
                is_read: true,
            },
            {
                type: 'organizer_revoked',
                title: '🚫 Thu hồi quyền Organizer',
                message: `Đã thu hồi quyền Organizer của ${students[3].full_name} do vi phạm quy định.`,
                is_read: true,
            },
        ];

        for (const notif of organizerNotifs) {
            const created = await prisma.notification.create({
                data: {
                    user_id: adminUser.id,
                    ...notif,
                },
            });
            notifications.push(created);
        }

        console.log(`✅ Created ${notifications.length - (registrations.length + attendances.length + trainingPoints.length + 3)} admin notifications`);
    }

    console.log(`✅ Created total ${notifications.length} notifications`);
    return notifications;
}
