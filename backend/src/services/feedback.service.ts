import prisma from '../config/database';
import { NotFoundError, ForbiddenError, ConflictError } from '../middleware/errorHandler';

interface SubmitFeedbackData {
    event_id: number;
    rating: number;
    comment?: string;
    suggestions?: string;
    is_anonymous?: boolean;
}

export const submitFeedback = async (userId: number, data: SubmitFeedbackData) => {
    // Check if event exists
    const event = await prisma.event.findUnique({
        where: { id: data.event_id },
    });

    if (!event) {
        throw new NotFoundError('Sự kiện không tồn tại');
    }

    if (event.status !== 'completed') {
        throw new ForbiddenError('Chỉ có thể đánh giá sự kiện đã hoàn thành');
    }

    // Check if user attended the event
    const attendance = await prisma.attendance.findFirst({
        where: {
            registration: {
                user_id: userId,
                event_id: data.event_id,
            },
        },
    });

    if (!attendance) {
        throw new ForbiddenError('Bạn chưa tham dự sự kiện này');
    }

    // Check if already submitted feedback
    const existingFeedback = await prisma.feedback.findFirst({
        where: {
            user_id: userId,
            event_id: data.event_id,
        },
    });

    if (existingFeedback) {
        throw new ConflictError('Bạn đã đánh giá sự kiện này rồi');
    }

    // Create feedback
    const feedback = await prisma.feedback.create({
        data: {
            user_id: userId,
            event_id: data.event_id,
            rating: data.rating,
            comment: data.comment,
            suggestions: data.suggestions,
            is_anonymous: data.is_anonymous || false,
        },
        include: {
            user: {
                select: {
                    id: true,
                    full_name: true,
                    student_id: true,
                },
            },
            event: {
                select: {
                    id: true,
                    title: true,
                },
            },
        },
    });

    return feedback;
};

export const getEventFeedbacks = async (
    eventId: number,
    limit: number = 20,
    offset: number = 0
) => {
    const [feedbacks, total] = await Promise.all([
        prisma.feedback.findMany({
            where: { event_id: eventId },
            include: {
                user: {
                    select: {
                        id: true,
                        full_name: true,
                        student_id: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
            take: limit,
            skip: offset,
        }),
        prisma.feedback.count({ where: { event_id: eventId } }),
    ]);

    // Hide user info for anonymous feedbacks
    const processedFeedbacks = feedbacks.map((feedback) => {
        if (feedback.is_anonymous) {
            return {
                ...feedback,
                user: {
                    id: null,
                    full_name: 'Ẩn danh',
                    student_id: null,
                },
            };
        }
        return feedback;
    });

    return {
        feedbacks: processedFeedbacks,
        total,
        limit,
        offset,
        has_more: offset + limit < total,
    };
};

export const getMyFeedback = async (userId: number, eventId: number) => {
    const feedback = await prisma.feedback.findFirst({
        where: {
            user_id: userId,
            event_id: eventId,
        },
        include: {
            event: {
                select: {
                    id: true,
                    title: true,
                    start_time: true,
                },
            },
        },
    });

    return feedback;
};

export const getFeedbackSummary = async (eventId: number) => {
    // Get all feedbacks for the event
    const feedbacks = await prisma.feedback.findMany({
        where: { event_id: eventId },
    });

    if (feedbacks.length === 0) {
        return {
            event_id: eventId,
            total_feedbacks: 0,
            average_rating: 0,
            rating_distribution: {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
            },
            anonymous_count: 0,
            with_comment_count: 0,
            with_suggestions_count: 0,
        };
    }

    // Calculate statistics
    const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = Math.round((totalRating / feedbacks.length) * 10) / 10;

    // Rating distribution
    const ratingDistribution = feedbacks.reduce(
        (acc, f) => {
            acc[f.rating] = (acc[f.rating] || 0) + 1;
            return acc;
        },
        { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
    );

    // Other counts
    const anonymousCount = feedbacks.filter((f) => f.is_anonymous).length;
    const withCommentCount = feedbacks.filter((f) => f.comment && f.comment.length > 0)
        .length;
    const withSuggestionsCount = feedbacks.filter(
        (f) => f.suggestions && f.suggestions.length > 0
    ).length;

    return {
        event_id: eventId,
        total_feedbacks: feedbacks.length,
        average_rating: averageRating,
        rating_distribution: ratingDistribution,
        anonymous_count: anonymousCount,
        with_comment_count: withCommentCount,
        with_suggestions_count: withSuggestionsCount,
    };
};

export const getTopRatedEvents = async (limit: number = 10) => {
    // Get events with their average ratings
    const events = await prisma.event.findMany({
        where: {
            status: 'completed',
        },
        include: {
            feedback: {
                select: {
                    rating: true,
                },
            },
            _count: {
                select: {
                    feedback: true,
                },
            },
        },
    });

    // Calculate average rating for each event
    const eventsWithRating = events
        .map((event) => {
            if (event.feedback.length === 0) {
                return null;
            }

            const totalRating = event.feedback.reduce((sum: number, f: { rating: number }) => sum + f.rating, 0);
            const averageRating = totalRating / event.feedback.length;

            return {
                id: event.id,
                title: event.title,
                start_time: event.start_time,
                average_rating: Math.round(averageRating * 10) / 10,
                feedback_count: event._count.feedback,
            };
        })
        .filter((e) => e !== null);

    // Sort by average rating (desc) and feedback count (desc)
    eventsWithRating.sort((a, b) => {
        if (b!.average_rating !== a!.average_rating) {
            return b!.average_rating - a!.average_rating;
        }
        return b!.feedback_count - a!.feedback_count;
    });

    return eventsWithRating.slice(0, limit);
};
