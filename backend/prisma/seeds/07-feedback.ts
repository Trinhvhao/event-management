import { PrismaClient, Event, User } from '@prisma/client';

export async function seedFeedback(
    prisma: PrismaClient,
    events: { completedEvent: Event; completedEvent2: Event },
    students: User[]
) {
    console.log('💬 Seeding feedback...');

    const { completedEvent, completedEvent2 } = events;
    const feedbacks = [];

    // Completed Event 1 - 4 out of 5 students gave feedback
    const feedbackData1 = [
        {
            rating: 5,
            comment: 'Workshop rất bổ ích, giảng viên nhiệt tình!',
            suggestions: 'Nên tổ chức thêm nhiều workshop thực hành',
            is_anonymous: false,
        },
        {
            rating: 4,
            comment: 'Nội dung hay nhưng thời gian hơi ngắn',
            suggestions: 'Tăng thời gian thực hành',
            is_anonymous: false,
        },
        {
            rating: 5,
            comment: 'Tuyệt vời, học được nhiều kiến thức mới',
            suggestions: null,
            is_anonymous: true,
        },
        {
            rating: 4,
            comment: 'Tốt, nhưng phòng lab hơi chật',
            suggestions: 'Chọn phòng rộng hơn',
            is_anonymous: false,
        },
    ];

    for (let i = 0; i < 4; i++) {
        const fb = await prisma.feedback.create({
            data: {
                user_id: students[i].id,
                event_id: completedEvent.id,
                ...feedbackData1[i],
            },
        });
        feedbacks.push(fb);
    }

    // Completed Event 2 - 2 students gave feedback
    const feedbackData2 = [
        {
            rating: 5,
            comment: 'Diễn giả chia sẻ rất thực tế và truyền cảm hứng',
            suggestions: 'Mời thêm nhiều founder khác',
            is_anonymous: false,
        },
        {
            rating: 5,
            comment: 'Sự kiện tổ chức chuyên nghiệp, nội dung chất lượng',
            suggestions: null,
            is_anonymous: true,
        },
    ];

    for (let i = 0; i < 2; i++) {
        const fb = await prisma.feedback.create({
            data: {
                user_id: students[i].id,
                event_id: completedEvent2.id,
                ...feedbackData2[i],
            },
        });
        feedbacks.push(fb);
    }

    console.log(`✅ Created ${feedbacks.length} feedback entries`);
    return feedbacks;
}
