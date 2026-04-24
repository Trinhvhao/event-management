'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useCategories, useDepartments } from '@/hooks/useEvents';
import { eventService } from '@/services/eventService';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Users, Award, Image as ImageIcon, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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
    image_url: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
});

type CreateEventForm = z.infer<typeof createEventSchema>;

const steps = [
    { id: 1, title: 'Thông tin cơ bản', icon: Calendar },
    { id: 2, title: 'Thời gian & Địa điểm', icon: MapPin },
    { id: 3, title: 'Cài đặt', icon: Users },
    { id: 4, title: 'Xem trước', icon: CheckCircle },
];

export default function CreateEventPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
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
                image_url: data.image_url || undefined,
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

    return (
        <DashboardLayout>
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link href="/dashboard/events">
                    <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} className="mb-3">Quay lại</Button>
                </Link>
                <h1 className="page-title">Tạo sự kiện mới</h1>
                <p className="page-subtitle">Điền thông tin để tạo sự kiện</p>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center gap-1 mb-8">
                {steps.map((step, idx) => (
                    <React.Fragment key={step.id}>
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${currentStep >= step.id ? 'bg-[var(--dash-accent)] text-white' : 'bg-[var(--dash-border)] text-[var(--dash-text-muted)]'
                                }`}>
                                {currentStep > step.id ? <CheckCircle size={16} /> : step.id}
                            </div>
                            <span className={`text-sm font-medium hidden sm:block ${currentStep >= step.id ? 'text-[var(--dash-text-primary)]' : 'text-[var(--dash-text-muted)]'
                                }`}>{step.title}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 rounded ${currentStep > step.id ? 'bg-[var(--dash-accent)]' : 'bg-[var(--dash-border)]'
                                }`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card variant="glass" padding="lg">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Basic info */}
                        {currentStep === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <Input label="Tiêu đề sự kiện *" placeholder="VD: Hội thảo AI & Machine Learning 2026" error={errors.title?.message} {...register('title')} />
                                <div>
                                    <label className="input-label">Mô tả</label>
                                    <textarea
                                        className="input-field min-h-[120px] resize-y"
                                        placeholder="Mô tả chi tiết về sự kiện..."
                                        {...register('description')}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Select label="Danh mục *" options={categoryOptions} value={watchAll.category_id} onChange={(v) => setValue('category_id', v)} placeholder="Chọn danh mục" error={errors.category_id?.message} />
                                    <Select label="Khoa / Phòng ban *" options={departmentOptions} value={watchAll.department_id} onChange={(v) => setValue('department_id', v)} placeholder="Chọn khoa" error={errors.department_id?.message} />
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Time & Location */}
                        {currentStep === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input label="Thời gian bắt đầu *" type="datetime-local" error={errors.start_time?.message} {...register('start_time')} />
                                    <Input label="Thời gian kết thúc *" type="datetime-local" error={errors.end_time?.message} {...register('end_time')} />
                                </div>
                                <Input label="Địa điểm *" placeholder="VD: Hội trường A1, Tầng 5" error={errors.location?.message} iconLeft={<MapPin size={16} />} {...register('location')} />
                            </motion.div>
                        )}

                        {/* Step 3: Settings */}
                        {currentStep === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input label="Số lượng tối đa *" type="number" placeholder="100" error={errors.capacity?.message} iconLeft={<Users size={16} />} {...register('capacity')} />
                                    <Input label="Điểm rèn luyện" type="number" placeholder="0" helperText="Số điểm RL cộng khi check-in" iconLeft={<Award size={16} />} {...register('training_points')} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input label="Phí tham gia (VNĐ)" type="number" placeholder="0" helperText="0 = miễn phí" {...register('event_cost')} />
                                    <Input label="Hạn đăng ký" type="datetime-local" helperText="Để trống = không giới hạn" error={errors.registration_deadline?.message} {...register('registration_deadline')} />
                                </div>
                                <Input label="URL hình ảnh" type="url" placeholder="https://example.com/image.jpg" helperText="URL hình ảnh bìa sự kiện" iconLeft={<ImageIcon size={16} />} error={errors.image_url?.message} {...register('image_url')} />
                            </motion.div>
                        )}

                        {/* Step 4: Preview */}
                        {currentStep === 4 && (
                            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <h3 className="text-base font-semibold mb-4 text-[var(--dash-text-primary)]">Xem trước sự kiện</h3>
                                <div className="space-y-3 text-sm">
                                    {[
                                        { label: 'Tiêu đề', value: watchAll.title },
                                        { label: 'Danh mục', value: getCategoryName(watchAll.category_id) },
                                        { label: 'Khoa', value: getDepartmentName(watchAll.department_id) },
                                        { label: 'Bắt đầu', value: watchAll.start_time ? new Date(watchAll.start_time).toLocaleString('vi-VN') : '' },
                                        { label: 'Kết thúc', value: watchAll.end_time ? new Date(watchAll.end_time).toLocaleString('vi-VN') : '' },
                                        { label: 'Địa điểm', value: watchAll.location },
                                        { label: 'Sức chứa', value: `${watchAll.capacity} người` },
                                        { label: 'Điểm RL', value: `+${watchAll.training_points || 0}` },
                                        { label: 'Phí tham gia', value: Number(watchAll.event_cost || 0) > 0 ? `${Number(watchAll.event_cost).toLocaleString('vi-VN')} VNĐ` : 'Miễn phí' },
                                        { label: 'Hạn đăng ký', value: watchAll.registration_deadline ? new Date(watchAll.registration_deadline).toLocaleString('vi-VN') : 'Không giới hạn' },
                                    ].map(item => (
                                        <div key={item.label} className="flex justify-between py-2 border-b border-[var(--dash-border-light)] last:border-0">
                                            <span className="text-[var(--dash-text-muted)]">{item.label}</span>
                                            <span className="font-medium text-[var(--dash-text-primary)]">{item.value}</span>
                                        </div>
                                    ))}
                                    {watchAll.description && (
                                        <div className="pt-2">
                                            <p className="text-[var(--dash-text-muted)] mb-1">Mô tả:</p>
                                            <p className="text-[var(--dash-text-secondary)] whitespace-pre-wrap">{watchAll.description}</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>

                {/* Navigation */}
                <div className="flex items-center gap-3 mt-6">
                    {currentStep > 1 && (
                        <Button type="button" variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} icon={<ArrowLeft size={16} />}>Quay lại</Button>
                    )}
                    <div className="flex-1" />
                    {currentStep < 4 ? (
                        <Button type="button" variant="primary" onClick={nextStep} icon={<ArrowRight size={16} />}>Tiếp tục</Button>
                    ) : (
                        <Button type="submit" variant="primary" isLoading={isSubmitting} icon={<Send size={16} />} className="!py-3 px-8">
                            Tạo sự kiện
                        </Button>
                    )}
                </div>
            </form>
        </div>
        </DashboardLayout>
    );
}
