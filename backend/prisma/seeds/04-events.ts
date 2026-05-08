import { PrismaClient, Category, Department, User } from '@prisma/client';

export async function seedEvents(
    prisma: PrismaClient,
    categories: Category[],
    departments: Department[],
    organizers: User[]
) {
    console.log('📅 Seeding events...');

    const now = new Date();

    // Completed event (2 months ago)
    const completedEventDate = new Date(now);
    completedEventDate.setMonth(completedEventDate.getMonth() - 2);

    const completedEvent = await prisma.event.create({
        data: {
            title: 'Workshop: Lập trình Web với React',
            description: 'Workshop thực hành xây dựng ứng dụng web hiện đại với React và TypeScript',
            start_time: new Date(completedEventDate.setHours(14, 0, 0)),
            end_time: new Date(completedEventDate.setHours(17, 0, 0)),
            location: 'Phòng Lab A301',
            category_id: categories[0].id,
            department_id: departments[0].id,
            organizer_id: organizers[0].id,
            capacity: 50,
            training_points: 3,
            event_cost: 150000,
            status: 'completed',
            registration_deadline: new Date(completedEventDate.setDate(completedEventDate.getDate() - 3)),
            image_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
        },
    });

    // Completed event (1 month ago)
    const completedEventDate2 = new Date(now);
    completedEventDate2.setMonth(completedEventDate2.getMonth() - 1);

    const completedEvent2 = await prisma.event.create({
        data: {
            title: 'Hội thảo: Khởi nghiệp trong thời đại số',
            description: 'Chia sẻ kinh nghiệm khởi nghiệp từ các founder thành công',
            start_time: new Date(completedEventDate2.setHours(9, 0, 0)),
            end_time: new Date(completedEventDate2.setHours(12, 0, 0)),
            location: 'Hội trường A',
            category_id: categories[0].id,
            department_id: departments[1].id,
            organizer_id: organizers[1].id,
            capacity: 200,
            training_points: 5,
            event_cost: 0,
            status: 'completed',
            is_featured: true,
            registration_deadline: new Date(completedEventDate2.setDate(completedEventDate2.getDate() - 5)),
            image_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
        },
    });

    // Ongoing event (today)
    const ongoingEventDate = new Date(now);

    const ongoingEvent = await prisma.event.create({
        data: {
            title: 'Ngày hội việc làm 2026',
            description: 'Kết nối sinh viên với các doanh nghiệp hàng đầu',
            start_time: new Date(ongoingEventDate.setHours(8, 0, 0)),
            end_time: new Date(ongoingEventDate.setHours(17, 0, 0)),
            location: 'Sân vận động trường',
            category_id: categories[2].id,
            department_id: departments[0].id,
            organizer_id: organizers[0].id,
            capacity: 500,
            training_points: 4,
            event_cost: 0,
            status: 'ongoing',
            is_featured: true,
            registration_deadline: new Date(ongoingEventDate.setDate(ongoingEventDate.getDate() - 7)),
            image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
        },
    });

    // Upcoming events
    const upcomingEventDate1 = new Date(now);
    upcomingEventDate1.setDate(upcomingEventDate1.getDate() + 7);

    const upcomingEvent1 = await prisma.event.create({
        data: {
            title: 'Cuộc thi Hackathon 2026',
            description: '48 giờ coding marathon - Xây dựng giải pháp công nghệ cho cộng đồng',
            start_time: new Date(upcomingEventDate1.setHours(8, 0, 0)),
            end_time: new Date(upcomingEventDate1.setHours(17, 0, 0)),
            location: 'Tòa nhà Innovation Hub',
            category_id: categories[0].id,
            department_id: departments[0].id,
            organizer_id: organizers[0].id,
            capacity: 100,
            training_points: 10,
            event_cost: 50000,
            status: 'upcoming',
            is_featured: true,
            registration_deadline: new Date(upcomingEventDate1.setDate(upcomingEventDate1.getDate() - 3)),
            image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
        },
    });

    const upcomingEventDate2 = new Date(now);
    upcomingEventDate2.setDate(upcomingEventDate2.getDate() + 14);

    await prisma.event.create({
        data: {
            title: 'Workshop: Kỹ năng thuyết trình hiệu quả',
            description: 'Học cách thuyết trình tự tin và chuyên nghiệp',
            start_time: new Date(upcomingEventDate2.setHours(14, 0, 0)),
            end_time: new Date(upcomingEventDate2.setHours(17, 0, 0)),
            location: 'Phòng B201',
            category_id: categories[5].id,
            department_id: departments[4].id,
            organizer_id: organizers[0].id,
            capacity: 40,
            training_points: 2,
            event_cost: 100000,
            status: 'upcoming',
            registration_deadline: new Date(upcomingEventDate2.setDate(upcomingEventDate2.getDate() - 2)),
            image_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80',
        },
    });

    const upcomingEventDate3 = new Date(now);
    upcomingEventDate3.setDate(upcomingEventDate3.getDate() + 21);

    await prisma.event.create({
        data: {
            title: 'Đêm nhạc từ thiện',
            description: 'Đêm nhạc gây quỹ ủng hộ sinh viên có hoàn cảnh khó khăn',
            start_time: new Date(upcomingEventDate3.setHours(18, 0, 0)),
            end_time: new Date(upcomingEventDate3.setHours(21, 0, 0)),
            location: 'Hội trường lớn',
            category_id: categories[3].id,
            department_id: departments[4].id,
            organizer_id: organizers[2].id,
            capacity: 300,
            training_points: 3,
            event_cost: 200000,
            status: 'upcoming',
            is_featured: true,
            registration_deadline: new Date(upcomingEventDate3.setDate(upcomingEventDate3.getDate() - 5)),
            image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
        },
    });

    const upcomingEventDate4 = new Date(now);
    upcomingEventDate4.setMonth(upcomingEventDate4.getMonth() + 1);

    await prisma.event.create({
        data: {
            title: 'Giải bóng đá sinh viên',
            description: 'Giải bóng đá giao hữu giữa các khoa',
            start_time: new Date(upcomingEventDate4.setHours(7, 0, 0)),
            end_time: new Date(upcomingEventDate4.setHours(12, 0, 0)),
            location: 'Sân bóng trường',
            category_id: categories[4].id,
            department_id: departments[0].id,
            organizer_id: organizers[0].id,
            capacity: 150,
            training_points: 2,
            event_cost: 0,
            status: 'upcoming',
            registration_deadline: new Date(upcomingEventDate4.setDate(upcomingEventDate4.getDate() - 10)),
            image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
        },
    });

    console.log(`✅ Created 7 events (2 completed, 1 ongoing, 4 upcoming)`);
    return { completedEvent, completedEvent2, ongoingEvent, upcomingEvent1 };
}
