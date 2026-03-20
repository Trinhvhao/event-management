'use client';

import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { motion } from 'framer-motion';
import { QrCode, Camera, CheckCircle, X, Award, Users, AlertCircle } from 'lucide-react';
import { checkinService } from '@/services/checkinService';
import { toast } from 'sonner';

/**
 * Trang Check-in bằng QR cho ban tổ chức
 * 
 * 2 chế độ:
 * 1. Nhập mã thủ công (paste JWT từ mã QR)
 * 2. Quét camera (cần thư viện html5-qrcode – sẽ tích hợp sau)
 */
export default function CheckinPage() {
    const [mode, setMode] = useState<'manual' | 'camera'>('manual');
    const [qrInput, setQrInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    // Xử lý check-in khi quét được mã QR
    const handleCheckin = async (qrData: string) => {
        if (!qrData.trim()) {
            toast.error('Vui lòng nhập mã QR');
            return;
        }

        setProcessing(true);
        setError(null);
        setLastResult(null);

        try {
            const result = await checkinService.processCheckin(qrData.trim());
            setLastResult(result);
            setHistory(prev => [result, ...prev]);
            setQrInput('');
            toast.success(`Check-in thành công: ${result.user.full_name}`);
        } catch (err: any) {
            const msg = err.response?.data?.error?.message || 'Check-in thất bại';
            setError(msg);
            toast.error(msg);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Check-in QR Code</h1>
                    <p className="page-subtitle">Quét mã QR hoặc nhập mã để check-in sinh viên</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scanner area */}
                <div className="space-y-4">
                    {/* Mode tabs */}
                    <Card variant="glass" padding="lg">
                        <div className="flex gap-2 mb-5">
                            <Button
                                variant={mode === 'manual' ? 'primary' : 'outline'}
                                size="sm"
                                icon={<QrCode size={14} />}
                                onClick={() => setMode('manual')}
                            >
                                Nhập mã
                            </Button>
                            <Button
                                variant={mode === 'camera' ? 'primary' : 'outline'}
                                size="sm"
                                icon={<Camera size={14} />}
                                onClick={() => setMode('camera')}
                            >
                                Quét camera
                            </Button>
                        </div>

                        {/* Nhập mã thủ công */}
                        {mode === 'manual' && (
                            <div>
                                <label className="block text-sm font-medium text-[var(--dash-text-primary)] mb-2">
                                    Dán mã QR (JWT token)
                                </label>
                                <textarea
                                    className="w-full p-3 rounded-xl bg-[var(--dash-bg)] border border-[var(--dash-border)] text-sm text-[var(--dash-text-primary)] resize-none focus:border-[var(--dash-accent)] focus:outline-none transition-colors"
                                    rows={4}
                                    placeholder="Paste nội dung mã QR vào đây..."
                                    value={qrInput}
                                    onChange={e => setQrInput(e.target.value)}
                                />
                                <Button
                                    variant="primary"
                                    className="w-full mt-3"
                                    isLoading={processing}
                                    onClick={() => handleCheckin(qrInput)}
                                    icon={<CheckCircle size={16} />}
                                >
                                    Check-in
                                </Button>
                            </div>
                        )}

                        {/* Camera mode - placeholder */}
                        {mode === 'camera' && (
                            <div className="aspect-square rounded-xl bg-[var(--dash-bg)] border-2 border-dashed border-[var(--dash-border)] flex flex-col items-center justify-center text-[var(--dash-text-muted)]">
                                <Camera size={48} className="mb-3 opacity-40" />
                                <p className="text-sm font-medium">Camera QR Scanner</p>
                                <p className="text-xs mt-1">Tính năng quét camera sẽ được tích hợp</p>
                                <p className="text-xs mt-1">Hiện tại hãy sử dụng chế độ &quot;Nhập mã&quot;</p>
                            </div>
                        )}
                    </Card>

                    {/* Kết quả check-in */}
                    {error && (
                        <Card variant="glass" padding="md">
                            <div className="flex items-center gap-3 text-red-500">
                                <AlertCircle size={22} />
                                <div>
                                    <p className="text-sm font-semibold">Check-in thất bại</p>
                                    <p className="text-xs mt-0.5">{error}</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {lastResult && (
                        <Card variant="glass" padding="lg">
                            <div className="text-center">
                                <div className="w-14 h-14 rounded-full bg-green-100 text-green-500 flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle size={28} />
                                </div>
                                <h3 className="text-lg font-bold text-[var(--dash-text-primary)]">{lastResult.user.full_name}</h3>
                                <p className="text-sm text-[var(--dash-text-muted)]">
                                    {lastResult.user.student_id || lastResult.user.email}
                                </p>
                                <p className="text-sm text-[var(--dash-text-muted)] mt-1">
                                    {lastResult.event.title}
                                </p>
                                {lastResult.pointsAwarded > 0 && (
                                    <Badge variant="warning" className="mt-2">
                                        <Award size={12} /> +{lastResult.pointsAwarded} điểm rèn luyện
                                    </Badge>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Lịch sử check-in trong phiên */}
                <Card variant="glass" padding="lg">
                    <CardHeader
                        title="Check-in gần đây"
                        subtitle={`${history.length} sinh viên đã check-in`}
                    />
                    {history.length === 0 ? (
                        <div className="text-center py-10 text-[var(--dash-text-muted)]">
                            <Users size={32} className="mx-auto mb-3 opacity-40" />
                            <p className="text-sm">Chưa có check-in nào</p>
                            <p className="text-xs mt-1">Quét mã QR để bắt đầu</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {history.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--dash-bg)]">
                                    <Avatar name={item.user.full_name} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--dash-text-primary)] truncate">{item.user.full_name}</p>
                                        <p className="text-xs text-[var(--dash-text-muted)]">{item.user.student_id || item.user.email}</p>
                                    </div>
                                    <Badge variant="success" dot>OK</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </motion.div>
        </DashboardLayout>
    );
}
