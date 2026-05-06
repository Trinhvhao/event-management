'use client';

import React, { useState } from 'react';
import { AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface PasswordConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
}

export function PasswordConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    loading = false,
}: PasswordConfirmDialogProps) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');
    const verifyPassword = useAuthStore((s) => s.verifyPassword);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!password.trim()) {
            setError('Vui lòng nhập mật khẩu');
            return;
        }

        setIsVerifying(true);
        setError('');

        try {
            const isValid = await verifyPassword(password);
            if (!isValid) {
                setError('Mật khẩu không chính xác');
                setIsVerifying(false);
                return;
            }

            // Password verified — execute the actual action
            setPassword('');
            setError('');
            await onConfirm();
            onClose();
        } catch {
            setError('Không thể xác minh mật khẩu. Vui lòng thử lại.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClose = () => {
        if (isVerifying || loading) return;
        setPassword('');
        setError('');
        setShowPassword(false);
        onClose();
    };

    const isProcessing = isVerifying || loading;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            {/* Dialog */}
            <div
                className="relative bg-white rounded-2xl shadow-[var(--shadow-xl)] max-w-md w-full p-6 animate-scale-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pwd-dialog-title"
            >
                {/* Danger accent top bar */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-[var(--color-brand-red)] via-red-400 to-red-300" />

                <div className="flex items-start gap-4 mt-2">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-[color-mix(in_srgb,var(--color-brand-red)_10%,transparent)]">
                        <AlertTriangle className="w-6 h-6 text-[var(--color-brand-red)]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h3 id="pwd-dialog-title" className="text-base font-extrabold text-[var(--text-primary)]">
                            {title}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                {/* Password input */}
                <div className="mt-5">
                    <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                        Nhập mật khẩu để xác nhận
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (error) setError('');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isProcessing) handleConfirm();
                            }}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            className="w-full h-11 rounded-xl border-2 border-[var(--border-default)] bg-white px-4 pr-12 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-[var(--shadow-xs)] transition-all focus:outline-none focus:border-[var(--color-brand-red)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-red)_8%,transparent)] disabled:opacity-50"
                            disabled={isProcessing}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-50"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <p className="mt-2 text-xs font-semibold text-[var(--color-brand-red)] flex items-center gap-1">
                            <AlertTriangle size={12} />
                            {error}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-muted)] hover:bg-[var(--border-default)] transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--color-brand-red)] hover:bg-[color-mix(in_srgb,var(--color-brand-red)_88%,transparent)] shadow-sm transition-all disabled:opacity-60 active:scale-95"
                    >
                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
