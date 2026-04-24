'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useCategories, useDepartments, useEvent } from '@/hooks/useEvents';
import { eventService } from '@/services/eventService';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Users, Award, Image as ImageIcon, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
        return response?.data?.error?.message || fallback;
    }
    return fallback;
};

// Validation schema (tương tự cho tạo, nhưng tất cả optional vì chỉ gửi trường đã thay đổi)
const editEventSchema = z.object({
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

type EditEventForm = z.infer<typeof editEventSchema>;

// Chuyển chuỗi ISO → định dạng datetime-local (YYYY-MM-DDThh:mm)
function toDatetimeLocal(isoStr: string) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = Number(params.id);

    const { event, loading: eventLoading } = useEvent(eventId);
    const { categories } = useCategories();
    const { departments } = useDepartments();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formReady, setFormReady] = useState(false);

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<EditEventForm>({
        resolver: zodResolver(editEventSchema),
    });

    // Điền dữ liệu sự kiện vào form khi đã tải xong
    useEffect(() => {
        if (event && !formReady) {
            setValue('title', event.title);
            setValue('description', event.description || '');
            setValue('start_time', toDatetimeLocal(event.start_time));
            setValue('end_time', toDatetimeLocal(event.end_time));
            setValue('location', event.location);
            setValue('category_id', String(event.category_id));
            setValue('department_id', String(event.department_id));
            setValue('capacity', String(event.capacity));
            setValue('training_points', String(event.training_points));
            setValue('event_cost', String(event.event_cost || 0));
            setValue('registration_deadline', event.registration_deadline ? toDatetimeLocal(event.registration_deadline) : '');
            setValue('image_url', event.image_url || '');
            setFormReady(true);
        }
    }, [event, formReady, setValue]);

    const categoryOptions = categories.map(c => ({ value: c.id.toString(), label: c.name }));
    const departmentOptions = departments.map(d => ({ value: d.id.toString(), label: d.name }));
    const watchedCategory = watch('category_id');
    const watchedDepartment = watch('department_id');

    const onSubmit = async (data: EditEventForm) => {
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

            await eventService.update(eventId, payload);
            toast.success('Cập nhật sự kiện thành công!');
            router.push(`/dashboard/events/${eventId}`);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Cập nhật thất bại'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (eventLoading) {
        return (
            <DashboardLayout>
            <div className="max-w-3xl mx-auto space-y-4">
                <Skeleton height={36} width={120} />
                <Skeleton height={28} width="50%" />
                <Skeleton height={400} />
            </div>
            </DashboardLayout>
        );
    }

    if (!event) {
        return (
            <DashboardLayout>
            <div className="text-center py-20">
                <p className="text-[var(--dash-text-muted)]">Không tìm thấy sự kiện</p>
                <Link href="/dashboard/my-events">
                    <Button variant="primary" className="mt-4">Quay lại</Button>
                </Link>
            </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link href={`/dashboard/events/${eventId}`}>
                    <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} className="mb-3">Quay lại</Button>
                </Link>
                <h1 className="page-title">Chỉnh sửa sự kiện</h1>
                <p className="page-subtitle truncate">{event.title}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card variant="glass" padding="lg" className="space-y-5">
                    {/* Thông tin cơ bản */}
                    <h3 className="text-sm font-semibold text-[var(--dash-text-muted)] uppercase tracking-wide">Thông tin cơ bản</h3>

                    <Input label="Tiêu đề sự kiện *" placeholder="VD: Hội thảo AI & Machine Learning" error={errors.title?.message} {...register('title')} />

                    <div>
                        <label className="input-label">Mô tả</label>
                        <textarea
                            className="input-field min-h-[120px] resize-y"
                            placeholder="Mô tả chi tiết về sự kiện..."
                            {...register('description')}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select label="Danh mục *" options={categoryOptions} value={watchedCategory} onChange={v => setValue('category_id', v)} placeholder="Chọn danh mục" error={errors.category_id?.message} />
                        <Select label="Khoa / Phòng ban *" options={departmentOptions} value={watchedDepartment} onChange={v => setValue('department_id', v)} placeholder="Chọn khoa" error={errors.department_id?.message} />
                    </div>

                    {/* Thời gian & Địa điểm */}
                    <h3 className="text-sm font-semibold text-[var(--dash-text-muted)] uppercase tracking-wide pt-2 border-t border-[var(--dash-border-light)]">Thời gian & Địa điểm</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Thời gian bắt đầu *" type="datetime-local" error={errors.start_time?.message} {...register('start_time')} />
                        <Input label="Thời gian kết thúc *" type="datetime-local" error={errors.end_time?.message} {...register('end_time')} />
                    </div>

                    <Input label="Địa điểm *" placeholder="VD: Hội trường A1, Tầng 5" error={errors.location?.message} iconLeft={<MapPin size={16} />} {...register('location')} />

                    {/* Cài đặt */}
                    <h3 className="text-sm font-semibold text-[var(--dash-text-muted)] uppercase tracking-wide pt-2 border-t border-[var(--dash-border-light)]">Cài đặt</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Số lượng tối đa *" type="number" error={errors.capacity?.message} iconLeft={<Users size={16} />} {...register('capacity')} />
                        <Input label="Điểm rèn luyện" type="number" helperText="Cộng khi check-in thành công" iconLeft={<Award size={16} />} {...register('training_points')} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Phí tham gia (VNĐ)" type="number" placeholder="0" helperText="0 = miễn phí" {...register('event_cost')} />
                        <Input label="Hạn đăng ký" type="datetime-local" helperText="Để trống = không giới hạn" error={errors.registration_deadline?.message} {...register('registration_deadline')} />
                    </div>

                    <Input label="URL hình ảnh" type="url" placeholder="https://..." helperText="URL ảnh bìa sự kiện" iconLeft={<ImageIcon size={16} />} error={errors.image_url?.message} {...register('image_url')} />
                </Card>

                {/* Submit */}
                <div className="flex justify-end mt-6">
                    <Button type="submit" variant="primary" isLoading={isSubmitting} icon={<Save size={16} />} className="!py-3 px-8">
                        Lưu thay đổi
                    </Button>
                </div>
            </form>
        </motion.div>
        </DashboardLayout>
    );
}
