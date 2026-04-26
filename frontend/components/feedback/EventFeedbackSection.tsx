'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Star, MessageSquare, Send, User as UserIcon } from 'lucide-react';
import { feedbackService, FeedbackSummary } from '@/services/feedbackService';
import { Feedback } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const FEEDBACK_PAGE_SIZE = 10;

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (
            error as { response?: { data?: { message?: string; error?: { message?: string } } } }
        ).response;

        if (response?.data?.message) {
            return response.data.message;
        }

        if (response?.data?.error?.message) {
            return response.data.error.message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

interface EventFeedbackSectionProps {
    eventId: number;
    eventStatus: string;
}

function StarRating({
    rating,
    onRate,
    size = 'md',
    interactive = false,
}: {
    rating: number;
    onRate?: (r: number) => void;
    size?: 'sm' | 'md' | 'lg';
    interactive?: boolean;
}) {
    const [hover, setHover] = useState(0);
    const sizeMap = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' };
    const sz = sizeMap[size];

    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    onClick={() => onRate?.(star)}
                    onMouseEnter={() => interactive && setHover(star)}
                    onMouseLeave={() => interactive && setHover(0)}
                    className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
                >
                    <Star
                        className={`${sz} transition-colors ${
                            star <= (hover || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-gray-200 text-gray-200'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
}

function RatingDistribution({ distribution, total }: { distribution: Record<number, number>; total: number }) {
    return (
        <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star] || 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="w-3 text-gray-500 font-medium">{star}</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className="w-6 text-right text-gray-500 text-xs">{count}</span>
                    </div>
                );
            })}
        </div>
    );
}

export default function EventFeedbackSection({ eventId, eventStatus }: EventFeedbackSectionProps) {
    const { user } = useAuthStore();
    const [summary, setSummary] = useState<FeedbackSummary | null>(null);
    const [feedbacks, setFeedbacks] = useState<(Feedback & { user?: { id: number | null; full_name: string; student_id: string | null } })[]>([]);
    const [totalFeedbacks, setTotalFeedbacks] = useState(0);
    const [feedbackOffset, setFeedbackOffset] = useState(0);
    const [hasMoreFeedbacks, setHasMoreFeedbacks] = useState(false);
    const [myFeedback, setMyFeedback] = useState<Feedback | null | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [suggestions, setSuggestions] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const canViewSummary = user?.role === 'organizer' || user?.role === 'admin';

    const loadFeedbackData = useCallback(async () => {
        try {
            setLoading(true);

            const feedbackData = await feedbackService.getEventFeedbacks(eventId, {
                limit: FEEDBACK_PAGE_SIZE,
                offset: 0,
            });

            setFeedbacks(feedbackData.feedbacks);
            setTotalFeedbacks(feedbackData.total);
            setFeedbackOffset(feedbackData.feedbacks.length);
            setHasMoreFeedbacks(feedbackData.has_more);

            if (canViewSummary) {
                try {
                    const summaryData = await feedbackService.getFeedbackSummary(eventId);
                    setSummary(summaryData);
                } catch (error) {
                    console.error('Error loading feedback summary:', error);
                    setSummary(null);
                }
            } else {
                setSummary(null);
            }

            // Check if current user has already submitted
            if (user) {
                try {
                    const myFb = await feedbackService.getMyFeedback(eventId);
                    setMyFeedback(myFb);
                } catch (error) {
                    console.error('Error loading my feedback:', error);
                    setMyFeedback(undefined);
                }
            }
        } catch (error) {
            const msg = getErrorMessage(error, 'Không thể tải dữ liệu đánh giá');
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [canViewSummary, eventId, user]);

    useEffect(() => {
        loadFeedbackData();
    }, [loadFeedbackData]);

    const loadMoreFeedbacks = async () => {
        if (!hasMoreFeedbacks || loadingMore) {
            return;
        }

        try {
            setLoadingMore(true);

            const nextPage = await feedbackService.getEventFeedbacks(eventId, {
                limit: FEEDBACK_PAGE_SIZE,
                offset: feedbackOffset,
            });

            setFeedbacks((prev) => [...prev, ...nextPage.feedbacks]);
            setFeedbackOffset((prev) => prev + nextPage.feedbacks.length);
            setHasMoreFeedbacks(nextPage.has_more);
            setTotalFeedbacks(nextPage.total);
        } catch (error) {
            const msg = getErrorMessage(error, 'Không thể tải thêm đánh giá');
            toast.error(msg);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error('Vui lòng chọn số sao đánh giá');
            return;
        }

        try {
            setSubmitting(true);
            await feedbackService.submitFeedback({
                event_id: eventId,
                rating,
                comment: comment.trim() || undefined,
                suggestions: suggestions.trim() || undefined,
                is_anonymous: isAnonymous,
            });
            toast.success('Gửi đánh giá thành công!');
            setRating(0);
            setComment('');
            setSuggestions('');
            setIsAnonymous(false);
            await loadFeedbackData();
        } catch (error: unknown) {
            const msg = getErrorMessage(error, 'Gửi đánh giá thất bại');
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-40" />
                    <div className="h-20 bg-gray-100 rounded-xl" />
                </div>
            </div>
        );
    }

    const canSubmitFeedback = eventStatus === 'completed' && user?.role === 'student' && myFeedback === null;
    const hasSubmitted = myFeedback !== null && myFeedback !== undefined;

    return (
        <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brandBlue" />
                Đánh giá sự kiện
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-5">
                    {summary && summary.total_feedbacks > 0 ? (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-primary">{summary.average_rating}</div>
                                <StarRating rating={Math.round(summary.average_rating)} size="md" />
                                <p className="text-sm text-gray-500 mt-1">
                                    {summary.total_feedbacks} đánh giá
                                </p>
                            </div>
                            <RatingDistribution
                                distribution={summary.rating_distribution}
                                total={summary.total_feedbacks}
                            />
                        </div>
                    ) : !canViewSummary && totalFeedbacks > 0 ? (
                        <div className="space-y-3 py-2">
                            <p className="text-sm font-semibold text-primary">Tổng quan đánh giá</p>
                            <p className="text-3xl font-bold text-primary">{totalFeedbacks}</p>
                            <p className="text-xs text-gray-500">đánh giá đã gửi cho sự kiện này</p>
                            <p className="text-xs text-gray-500">
                                Thống kê chi tiết chỉ hiển thị cho ban tổ chức hoặc quản trị viên.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Chưa có đánh giá nào</p>
                        </div>
                    )}
                </div>

                {/* Feedback List + Form */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Submit Form */}
                    {canSubmitFeedback && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl border border-brandBlue/20 p-5 shadow-sm"
                        >
                            <h4 className="font-semibold text-primary mb-3">Gửi đánh giá của bạn</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-gray-600 mb-1 block">Đánh giá *</label>
                                    <StarRating rating={rating} onRate={setRating} size="lg" interactive />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600 mb-1 block">Nhận xét</label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Chia sẻ trải nghiệm của bạn..."
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-brandBlue focus:ring-1 focus:ring-brandBlue/20 outline-none resize-none min-h-[80px] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600 mb-1 block">Góp ý cải thiện</label>
                                    <textarea
                                        value={suggestions}
                                        onChange={(e) => setSuggestions(e.target.value)}
                                        placeholder="Bạn muốn cải thiện điều gì?"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-brandBlue focus:ring-1 focus:ring-brandBlue/20 outline-none resize-none min-h-[60px] text-sm"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAnonymous}
                                            onChange={(e) => setIsAnonymous(e.target.checked)}
                                            className="rounded border-gray-300 text-brandBlue focus:ring-brandBlue/20"
                                        />
                                        Đánh giá ẩn danh
                                    </label>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting || rating === 0}
                                        className="px-5 py-2 bg-gradient-to-r from-brandBlue to-secondary text-white rounded-lg font-medium text-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Already submitted notice */}
                    {hasSubmitted && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                            <Star className="w-5 h-5 fill-green-500 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-green-800 text-sm">Bạn đã đánh giá sự kiện này</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <StarRating rating={myFeedback!.rating} size="sm" />
                                    <span className="text-sm text-green-700">({myFeedback!.rating}/5)</span>
                                </div>
                                {myFeedback!.comment && (
                                    <p className="text-sm text-green-700 mt-1">{myFeedback!.comment}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Feedback List */}
                    <AnimatePresence>
                        {feedbacks.length > 0 ? (
                            <div className="space-y-3">
                                {feedbacks.map((fb, idx) => (
                                    <motion.div
                                        key={fb.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-gray-50 rounded-xl p-4"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-brandBlue/10 flex items-center justify-center">
                                                    <UserIcon className="w-4 h-4 text-brandBlue" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-primary text-sm">
                                                        {fb.user?.full_name || 'Ẩn danh'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {format(new Date(fb.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                                    </p>
                                                </div>
                                            </div>
                                            <StarRating rating={fb.rating} size="sm" />
                                        </div>
                                        {fb.comment && (
                                            <p className="text-sm text-gray-700 ml-10">{fb.comment}</p>
                                        )}
                                        {fb.suggestions && (
                                            <p className="text-sm text-gray-500 ml-10 mt-1 italic">
                                                💡 {fb.suggestions}
                                            </p>
                                        )}
                                    </motion.div>
                                ))}

                                {hasMoreFeedbacks && (
                                    <div className="flex justify-center pt-2">
                                        <button
                                            type="button"
                                            onClick={loadMoreFeedbacks}
                                            disabled={loadingMore}
                                            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                        >
                                            {loadingMore ? 'Đang tải...' : 'Tải thêm đánh giá'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            !canSubmitFeedback && totalFeedbacks > 0 && (
                                <div className="text-center py-6 text-gray-500 text-sm">
                                    Chưa có đánh giá nào cho sự kiện này
                                </div>
                            )
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
