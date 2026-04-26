'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useCategories, useDepartments } from '@/hooks/useEvents';
import { eventService } from '@/services/eventService';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/ui/ImageUpload';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, ArrowRight, Calendar, MapPin, Users, Award,
    Send, CheckCircle, Sparkles, Clock, Tag, Building2,
    Image as ImageIcon, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { clsx } from 'clsx';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }
    return fallback;
};

const createEventSchema = z.object({
    title: z.string().min(5, 'Tiêu đề tối thiểu 5 ký tự').max(255),
    description: z.string().max(5000).optional(),
    start_time: z.string().min(1, 'Vui lòng chọn thời gian bắt đầu'),
    end_time: z.string().min(1, 'Vui lòng chọn thời gian kết thúc'),
    location: z.string().min(1, 'Vui lòng nhập địa điểm').max(255),
    category_id: z.string().min(1, 'Vui lòng chọn danh mục'),
    department_id: z.string().min(1, 'Vui lòng chọn khoa'),
    capacity: z.string().min(1, 'Vui lòng nhập số lượng'),
    training_points: z.string().optional(),
    event_cost: z.string().optional(),
    registration_deadline: z.string().optional(),
});

type CreateEventForm = z.infer<typeof createEventSchema>;

const steps = [
    { id: 1, title: 'Thông tin cơ bản', subtitle: 'Tiêu đề & mô tả', icon: Sparkles },
    { id: 2, title: 'Thời gian & Địa điểm', subtitle: 'Lịch trình sự kiện', icon: Clock },
    { id: 3, title: 'Cài đặt', subtitle: 'Tham số sự kiện', icon: Tag },
    { id: 4, title: 'Xem trước', subtitle: 'Xác nhận thông tin', icon: CheckCircle },
];

const stepVariants = {
    container: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
    },
    item: {
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
    },
};

export default function CreateEventPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const { categories } = useCategories();
    const { departments } = useDepartments();

    const { register, handleSubmit, formState: { errors }, watch, trigger, setValue } = useForm<CreateEventForm>({
        resolver: zodResolver(createEventSchema),
        defaultValues: { training_points: '0', event_cost: '0' },
    });

    const watchAll = watch();

    const categoryOptions = categories.map(c => ({ value: c.id.toString(), label: c.name }));
    const departmentOptions = departments.map(d => ({ value: d.id.toString(), label: d.name }));

    const nextStep = async () => {
        let fields: (keyof CreateEventForm)[] = [];
        if (currentStep === 1) fields = ['title', 'description', 'category_id', 'department_id'];
        if (currentStep === 2) fields = ['start_time', 'end_time', 'location'];
        if (currentStep === 3) fields = ['capacity'];

        const valid = await trigger(fields);
        if (valid) setCurrentStep(prev => Math.min(prev + 1, 4));
    };

    const onSubmit = async (data: CreateEventForm) => {
        setIsSubmitting(true);
        try {
            const payload = {
                title: data.title,
                description: data.description || undefined,
                start_time: new Date(data.start_time).toISOString(),
                end_time: new Date(data.end_time).toISOString(),
                location: data.location,
                category_id: Number(data.category_id),
                department_id: Number(data.department_id),
                capacity: Number(data.capacity),
                training_points: Number(data.training_points || 0),
                event_cost: Number(data.event_cost || 0),
                image_url: imageUrl || undefined,
                registration_deadline: data.registration_deadline
                    ? new Date(data.registration_deadline).toISOString()
                    : undefined,
            };
            await eventService.createEvent(payload);
            toast.success('Tạo sự kiện thành công!');
            router.push('/dashboard/events');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Có lỗi xảy ra'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCategoryName = (id: string) => categories.find(c => c.id.toString() === id)?.name || '';
    const getDepartmentName = (id: string) => departments.find(d => d.id.toString() === id)?.name || '';

    const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto">
                {/* ─── Page Header ─── */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-8"
                >
                    <Link href="/dashboard/events" className="group inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--color-brand-navy)] transition-colors duration-200 mb-5">
                        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
                        <span className="font-medium">Quay lại danh sách sự kiện</span>
                    </Link>

                    <div className="relative bg-white rounded-2xl border border-[var(--border-default)] overflow-hidden shadow-[var(--shadow-sm)]">
                        {/* Gradient accent bar */}
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-brand-navy)] via-[var(--color-brand-orange)] to-[var(--color-brand-gold)]" />

                        <div className="px-7 pt-6 pb-5">
                            <div className="flex items-start gap-4">
                                {/* Decorative icon */}
                                <div className="hidden sm:flex w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--color-brand-navy)] to-[#1a5fc8] items-center justify-center shrink-0 shadow-[var(--shadow-brand)]">
                                    <Sparkles size={20} className="text-white" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h1 className="text-[1.6rem] font-extrabold text-[var(--text-primary)] tracking-tight leading-tight">
                                        Tạo sự kiện mới
                                    </h1>
                                    <p className="text-sm text-[var(--text-muted)] font-medium mt-1.5">
                                        Điền đầy đủ thông tin để tạo sự kiện cho sinh viên tham gia
                                    </p>
                                </div>

                                {/* Step counter badge */}
                                <div className="shrink-0 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-page)] border border-[var(--border-default)]">
                                    <span className="text-xs font-bold text-[var(--color-brand-navy)]">Bước</span>
                                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                                        {currentStep}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">/</span>
                                    <span className="text-sm font-bold text-[var(--text-muted)]">{steps.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ─── Step Progress Indicator ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-8"
                >
                    <div className="relative">
                        {/* Progress bar background */}
                        <div className="absolute top-4 left-0 right-0 h-0.5 bg-[var(--border-default)]" />
                        {/* Progress bar fill */}
                        <motion.div
                            className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-[var(--color-brand-navy)] to-[var(--color-brand-orange)]"
                            initial={{ width: '0%' }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        />

                        <div className="relative flex items-start justify-between">
                            {steps.map((step) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.id;
                                const isCompleted = currentStep > step.id;

                                return (
                                    <div key={step.id} className="flex flex-col items-center gap-2" style={{ maxWidth: '120px' }}>
                                        {/* Circle indicator */}
                                        <motion.div
                                            initial={{ scale: 0.8 }}
                                            animate={{ scale: isActive ? 1.1 : 1 }}
                                            className={clsx(
                                                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300',
                                                isCompleted && 'bg-[var(--color-brand-navy)] text-white shadow-[var(--shadow-brand)]',
                                                isActive && 'bg-white border-2 border-[var(--color-brand-navy)] text-[var(--color-brand-navy)] shadow-[var(--shadow-brand)]',
                                                !isActive && !isCompleted && 'bg-white border-2 border-[var(--border-default)] text-[var(--text-muted)]'
                                            )}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle size={15} strokeWidth={2.5} />
                                            ) : (
                                                <Icon size={13} strokeWidth={2.5} />
                                            )}
                                        </motion.div>

                                        {/* Label */}
                                        <div className="text-center hidden sm:block">
                                            <p className={clsx(
                                                'text-xs font-bold leading-tight transition-colors duration-200',
                                                isActive ? 'text-[var(--color-brand-navy)]' : isCompleted ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                                            )}>
                                                {step.title}
                                            </p>
                                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                                                {step.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>

                {/* ─── Form Card ─── */}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="relative"
                    >
                        {/* Card background with subtle gradient */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white to-[var(--bg-page)] opacity-60" />
                        <div className="relative bg-white/95 backdrop-blur-md rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">

                            <AnimatePresence mode="wait">
                                {/* ────────── STEP 1: Basic Info ────────── */}
                                {currentStep === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 24 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -24 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        className="p-7"
                                    >
                                        <motion.div variants={stepVariants} initial="hidden" animate="visible" className="space-y-6">
                                            {/* Section header */}
                                            <motion.div variants={stepVariants.item} className="flex items-center gap-3 pb-4 border-b border-[var(--border-light)]">
                                                <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)] flex items-center justify-center shrink-0">
                                                    <Sparkles size={17} className="text-[var(--color-brand-navy)]" />
                                                </div>
                                                <div>
                                                    <h2 className="text-base font-extrabold text-[var(--text-primary)]">Thông tin cơ bản</h2>
                                                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Tiêu đề, mô tả và phân loại sự kiện</p>
                                                </div>
                                            </motion.div>

                                            <motion.div variants={stepVariants.item}>
                                                <Input
                                                    label="Tiêu đề sự kiện"
                                                    placeholder="VD: Hội thảo AI & Machine Learning 2026"
                                                    error={errors.title?.message}
                                                    {...register('title')}
                                                />
                                                <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">Tối thiểu 5 ký tự, tối đa 255 ký tự</p>
                                            </motion.div>

                                            <motion.div variants={stepVariants.item}>
                                                <RichTextEditor
                                                    value={watchAll.description || ''}
                                                    onChange={(val) => setValue('description', val)}
                                                    placeholder="Mô tả chi tiết về sự kiện: nội dung, lịch trình, đối tượng tham gia..."
                                                    minHeight="140px"
                                                    label="Mô tả sự kiện"
                                                />
                                            </motion.div>

                                            <motion.div variants={stepVariants.item} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                <Select
                                                    label="Danh mục"
                                                    options={categoryOptions}
                                                    value={watchAll.category_id}
                                                    onChange={(v) => setValue('category_id', v)}
                                                    placeholder="Chọn danh mục"
                                                    error={errors.category_id?.message}
                                                />
                                                <Select
                                                    label="Khoa / Phòng ban"
                                                    options={departmentOptions}
                                                    value={watchAll.department_id}
                                                    onChange={(v) => setValue('department_id', v)}
                                                    placeholder="Chọn khoa"
                                                    error={errors.department_id?.message}
                                                />
                                            </motion.div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* ────────── STEP 2: Time & Location ────────── */}
                                {currentStep === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 24 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -24 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        className="p-7"
                                    >
                                        <motion.div variants={stepVariants} initial="hidden" animate="visible" className="space-y-6">
                                            <motion.div variants={stepVariants.item} className="flex items-center gap-3 pb-4 border-b border-[var(--border-light)]">
                                                <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-orange)_12%,transparent)] flex items-center justify-center shrink-0">
                                                    <Calendar size={17} className="text-[var(--color-brand-orange)]" />
                                                </div>
                                                <div>
                                                    <h2 className="text-base font-extrabold text-[var(--text-primary)]">Thời gian & Địa điểm</h2>
                                                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Xác định lịch trình và không gian tổ chức</p>
                                                </div>
                                            </motion.div>

                                            <motion.div variants={stepVariants.item} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                <Input
                                                    label="Thời gian bắt đầu"
                                                    type="datetime-local"
                                                    error={errors.start_time?.message}
                                                    iconLeft={<Clock size={15} />}
                                                    {...register('start_time')}
                                                />
                                                <Input
                                                    label="Thời gian kết thúc"
                                                    type="datetime-local"
                                                    error={errors.end_time?.message}
                                                    iconLeft={<Clock size={15} />}
                                                    {...register('end_time')}
                                                />
                                            </motion.div>

                                            <motion.div variants={stepVariants.item}>
                                                <Input
                                                    label="Địa điểm tổ chức"
                                                    placeholder="VD: Hội trường A1, Tầng 5, Trường ĐH Đại Nam"
                                                    error={errors.location?.message}
                                                    iconLeft={<MapPin size={15} />}
                                                    {...register('location')}
                                                />
                                            </motion.div>

                                            {/* Visual schedule card */}
                                            {watchAll.start_time && watchAll.end_time && (
                                                <motion.div
                                                    variants={stepVariants.item}
                                                    className="relative rounded-xl border border-[var(--border-light)] bg-[var(--bg-page)] overflow-hidden"
                                                >
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-brand-navy)] to-[var(--color-brand-orange)]" />
                                                    <div className="px-5 py-4 pl-6">
                                                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Lịch trình</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Bắt đầu</p>
                                                                <p className="text-sm font-extrabold text-[var(--text-primary)]">
                                                                    {new Date(watchAll.start_time).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                                </p>
                                                                <p className="text-xs font-medium text-[var(--color-brand-navy)] mt-0.5">
                                                                    {new Date(watchAll.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">Kết thúc</p>
                                                                <p className="text-sm font-extrabold text-[var(--text-primary)]">
                                                                    {new Date(watchAll.end_time).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                                </p>
                                                                <p className="text-xs font-medium text-[var(--color-brand-orange)] mt-0.5">
                                                                    {new Date(watchAll.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* ────────── STEP 3: Settings ────────── */}
                                {currentStep === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 24 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -24 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        className="p-7"
                                    >
                                        <motion.div variants={stepVariants} initial="hidden" animate="visible" className="space-y-6">
                                            <motion.div variants={stepVariants.item} className="flex items-center gap-3 pb-4 border-b border-[var(--border-light)]">
                                                <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-gold)_15%,transparent)] flex items-center justify-center shrink-0">
                                                    <Tag size={17} className="text-[#92700c]" />
                                                </div>
                                                <div>
                                                    <h2 className="text-base font-extrabold text-[var(--text-primary)]">Cài đặt sự kiện</h2>
                                                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Sức chứa, phí tham gia và hạn đăng ký</p>
                                                </div>
                                            </motion.div>

                                            <motion.div variants={stepVariants.item} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                <Input
                                                    label="Số lượng tối đa"
                                                    type="number"
                                                    placeholder="100"
                                                    error={errors.capacity?.message}
                                                    iconLeft={<Users size={15} />}
                                                    helperText="0 = không giới hạn"
                                                    {...register('capacity')}
                                                />
                                                <Input
                                                    label="Điểm rèn luyện"
                                                    type="number"
                                                    placeholder="0"
                                                    iconLeft={<Award size={15} />}
                                                    helperText="Số điểm RL cộng khi check-in"
                                                    {...register('training_points')}
                                                />
                                            </motion.div>

                                            <motion.div variants={stepVariants.item} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                <Input
                                                    label="Phí tham gia (VNĐ)"
                                                    type="number"
                                                    placeholder="0"
                                                    helperText="0 = miễn phí tham gia"
                                                    {...register('event_cost')}
                                                />
                                                <Input
                                                    label="Hạn đăng ký"
                                                    type="datetime-local"
                                                    helperText="Để trống = không giới hạn"
                                                    error={errors.registration_deadline?.message}
                                                    {...register('registration_deadline')}
                                                />
                                            </motion.div>

                                            <motion.div variants={stepVariants.item}>
                                                <ImageUpload
                                                    value={imageUrl || undefined}
                                                    onChange={(url) => setImageUrl(url)}
                                                    helperText="Ảnh bìa sự kiện (JPG, PNG, WebP, GIF - tối đa 5MB). Khuyến nghị kích thước 1200x630px"
                                                />
                                            </motion.div>

                                            {/* Tips card */}
                                            <motion.div
                                                variants={stepVariants.item}
                                                className="relative rounded-xl border border-[var(--color-brand-light)] bg-[color-mix(in_srgb,var(--color-brand-light)_20%,transparent)] p-4 overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[var(--color-brand-light)] to-transparent opacity-40" />
                                                <div className="relative flex items-start gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-[color-mix(in_srgb,var(--color-brand-navy)_15%,transparent)] flex items-center justify-center shrink-0 mt-0.5">
                                                        <ImageIcon size={14} className="text-[var(--color-brand-navy)]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-[var(--text-primary)] mb-1">Mẹo chọn ảnh bìa</p>
                                                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                                                            Chọn ảnh có độ phân giải cao, nội dung rõ ràng và liên quan đến chủ đề sự kiện. Ảnh landscape (ngang) sẽ hiển thị tốt nhất.
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* ────────── STEP 4: Preview ────────── */}
                                {currentStep === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, x: 24 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -24 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        className="p-7"
                                    >
                                        <motion.div variants={stepVariants} initial="hidden" animate="visible" className="space-y-5">
                                            <motion.div variants={stepVariants.item} className="flex items-center gap-3 pb-4 border-b border-[var(--border-light)]">
                                                <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--color-brand-green)_12%,transparent)] flex items-center justify-center shrink-0">
                                                    <CheckCircle size={17} className="text-[var(--color-brand-green)]" />
                                                </div>
                                                <div>
                                                    <h2 className="text-base font-extrabold text-[var(--text-primary)]">Xem trước sự kiện</h2>
                                                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Kiểm tra thông tin trước khi tạo sự kiện</p>
                                                </div>
                                            </motion.div>

                                            {/* Cover image */}
                                            <motion.div variants={stepVariants.item}>
                                                {imageUrl ? (
                                                    <div className="relative rounded-xl overflow-hidden border border-[var(--border-light)] aspect-video bg-[var(--bg-page)]">
                                                        <img
                                                            src={imageUrl}
                                                            alt="Event cover"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                    </div>
                                                ) : (
                                                    <div className="relative rounded-xl border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-page)] aspect-video flex items-center justify-center">
                                                        <div className="text-center">
                                                            <div className="w-12 h-12 rounded-full bg-[var(--border-default)] flex items-center justify-center mx-auto mb-2">
                                                                <ImageIcon size={20} className="text-[var(--text-muted)]" />
                                                            </div>
                                                            <p className="text-sm font-medium text-[var(--text-muted)]">Chưa có ảnh bìa</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>

                                            {/* Event title highlight */}
                                            <motion.div variants={stepVariants.item} className="bg-gradient-to-r from-[var(--color-brand-navy)] to-[#1a5fc8] rounded-xl p-5 text-white">
                                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Tiêu đề sự kiện</p>
                                                <h3 className="text-lg font-extrabold leading-tight">
                                                    {watchAll.title || '— Chưa nhập tiêu đề —'}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20">
                                                    {watchAll.category_id && (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full">
                                                            <Tag size={11} />
                                                            {getCategoryName(watchAll.category_id)}
                                                        </span>
                                                    )}
                                                    {watchAll.department_id && (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full">
                                                            <Building2 size={11} />
                                                            {getDepartmentName(watchAll.department_id)}
                                                        </span>
                                                    )}
                                                </div>
                                            </motion.div>

                                            {/* Info grid */}
                                            <motion.div variants={stepVariants.item} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-page)] overflow-hidden">
                                                {[
                                                    { icon: <Calendar size={14} />, label: 'Thời gian bắt đầu', value: watchAll.start_time ? new Date(watchAll.start_time).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' }) : '—', color: 'text-[var(--color-brand-navy)]' },
                                                    { icon: <Calendar size={14} />, label: 'Thời gian kết thúc', value: watchAll.end_time ? new Date(watchAll.end_time).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' }) : '—', color: 'text-[var(--color-brand-orange)]' },
                                                    { icon: <MapPin size={14} />, label: 'Địa điểm', value: watchAll.location || '—', color: 'text-[var(--text-secondary)]' },
                                                    { icon: <Users size={14} />, label: 'Sức chứa', value: watchAll.capacity ? `${Number(watchAll.capacity).toLocaleString('vi-VN')} người` : '—', color: 'text-[var(--text-secondary)]' },
                                                    { icon: <Award size={14} />, label: 'Điểm rèn luyện', value: watchAll.training_points ? `+${watchAll.training_points} điểm` : 'Không có', color: 'text-[#92700c]' },
                                                    { icon: <Tag size={14} />, label: 'Phí tham gia', value: Number(watchAll.event_cost || 0) > 0 ? `${Number(watchAll.event_cost).toLocaleString('vi-VN')} VNĐ` : 'Miễn phí', color: 'text-[var(--color-brand-green)]' },
                                                    { icon: <Clock size={14} />, label: 'Hạn đăng ký', value: watchAll.registration_deadline ? new Date(watchAll.registration_deadline).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Không giới hạn', color: 'text-[var(--text-muted)]' },
                                                ].map((item, idx, arr) => (
                                                    <div
                                                        key={item.label}
                                                        className={clsx(
                                                            'flex items-start gap-3 px-5 py-3.5',
                                                            idx < arr.length - 1 && 'border-b border-[var(--border-light)]'
                                                        )}
                                                    >
                                                        <div className={clsx('mt-0.5 shrink-0', item.color)}>
                                                            {item.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{item.label}</p>
                                                            <p className={clsx('text-sm font-semibold mt-0.5 leading-snug', item.color.replace('text-', 'text-[var(--text-primary)]'))}>
                                                                {item.value}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>

                                            {/* Description */}
                                            {watchAll.description && (
                                                <motion.div variants={stepVariants.item} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-page)] p-5">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Mô tả sự kiện</p>
                                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                                        {watchAll.description}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* ─── Navigation Buttons ─── */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center gap-3 mt-6"
                    >
                        {currentStep > 1 ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCurrentStep(prev => prev - 1)}
                                icon={<ArrowLeft size={16} />}
                            >
                                Quay lại
                            </Button>
                        ) : (
                            <div />
                        )}

                        <div className="flex-1" />

                        {currentStep < 4 ? (
                            <Button
                                type="button"
                                variant="primary"
                                onClick={nextStep}
                                icon={<ArrowRight size={16} />}
                                iconPosition="right"
                                className="group"
                            >
                                Tiếp tục
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isSubmitting}
                                icon={<Send size={16} />}
                                className="!py-3 !px-8 shadow-[var(--shadow-brand)] hover:shadow-[var(--shadow-md)] hover:-translate-y-px active:scale-[0.98]"
                            >
                                Tạo sự kiện
                            </Button>
                        )}
                    </motion.div>
                </form>
            </div>
        </DashboardLayout>
    );
}
