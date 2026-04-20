'use client';

import React from 'react';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    loading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'default',
    loading = false,
}: ConfirmDialogProps) {
    const [isProcessing, setIsProcessing] = React.useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error('Confirmation action failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const isLoading = loading || isProcessing;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={isLoading ? undefined : onClose}
            />

            {/* Dialog */}
            <div
                className="relative bg-white rounded-2xl shadow-[var(--shadow-xl)] max-w-md w-full p-6 animate-scale-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
            >
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
                        variant === 'destructive'
                            ? 'bg-[color-mix(in_srgb,var(--color-brand-red)_10%,transparent)]'
                            : 'bg-[color-mix(in_srgb,var(--color-brand-navy)_10%,transparent)]'
                    }`}>
                        {variant === 'destructive' ? (
                            <AlertTriangle className="w-6 h-6 text-[var(--color-brand-red)]" />
                        ) : (
                            <Info className="w-6 h-6 text-[var(--color-brand-navy)]" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h3 id="dialog-title" className="text-base font-extrabold text-[var(--text-primary)]">
                            {title}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-muted)] hover:bg-[var(--border-default)] transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 active:scale-95 ${
                            variant === 'destructive'
                                ? 'bg-[var(--color-brand-red)] hover:bg-[color-mix(in_srgb,var(--color-brand-red)_88%,transparent)] shadow-sm'
                                : 'bg-[var(--color-brand-navy)] hover:bg-[color-mix(in_srgb,var(--color-brand-navy)_88%,transparent)] shadow-[var(--shadow-brand)]'
                        }`}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
