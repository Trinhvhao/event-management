'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Bold, Italic, List, ListOrdered, RemoveFormatting } from 'lucide-react';
import { clsx } from 'clsx';

interface RichTextEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
    error?: string;
    disabled?: boolean;
    label?: string;
}

interface ToolbarButton {
    icon: React.ReactNode;
    label: string;
    action: () => void;
    active?: boolean;
}

export default function RichTextEditor({
    value = '',
    onChange,
    placeholder = 'Nhập mô tả...',
    minHeight = '150px',
    error,
    disabled = false,
    label,
}: RichTextEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [charCount, setCharCount] = useState(value.length);

    useEffect(() => {
        setCharCount(value.length);
    }, [value]);

    const getSelection = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return { start: 0, end: 0, selectedText: '' };
        return {
            start: textarea.selectionStart,
            end: textarea.selectionEnd,
            selectedText: textarea.value.substring(textarea.selectionStart, textarea.selectionEnd),
        };
    }, []);

    const wrapSelection = useCallback((prefix: string, suffix: string) => {
        const textarea = textareaRef.current;
        if (!textarea || disabled) return;

        const { start, end, selectedText } = getSelection();
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);

        let newValue: string;
        let newCursorPos: number;

        if (selectedText) {
            newValue = before + prefix + selectedText + suffix + after;
            newCursorPos = end + prefix.length + suffix.length;
        } else {
            newValue = before + prefix + suffix + after;
            newCursorPos = start + prefix.length;
        }

        onChange?.(newValue);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }, [getSelection, onChange, disabled]);

    const insertListItem = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea || disabled) return;

        const { start } = getSelection();
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(start);

        let insertAt = start;
        let searchFrom = start - 1;

        while (searchFrom >= 0 && before[searchFrom] !== '\n') {
            searchFrom--;
        }

        if (searchFrom >= 0) {
            insertAt = searchFrom + 1;
        } else {
            insertAt = 0;
        }

        const newValue = before.substring(0, insertAt) + '- ' + before.substring(insertAt) + after;
        onChange?.(newValue);

        setTimeout(() => {
            textarea.focus();
            const newPos = start + 2;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    }, [getSelection, onChange, disabled]);

    const insertNumberedList = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea || disabled) return;

        const { start } = getSelection();
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(start);

        let insertAt = start;
        let searchFrom = start - 1;

        while (searchFrom >= 0 && before[searchFrom] !== '\n') {
            searchFrom--;
        }

        if (searchFrom >= 0) {
            insertAt = searchFrom + 1;
        } else {
            insertAt = 0;
        }

        const newValue = before.substring(0, insertAt) + '1. ' + before.substring(insertAt) + after;
        onChange?.(newValue);

        setTimeout(() => {
            textarea.focus();
            const newPos = start + 3;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    }, [getSelection, onChange, disabled]);

    const clearFormatting = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea || disabled) return;

        const { start, end, selectedText } = getSelection();
        if (!selectedText) return;

        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);

        let cleaned = selectedText;
        cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
        cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
        cleaned = cleaned.replace(/^[-*]\s/gm, '');
        cleaned = cleaned.replace(/^\d+\.\s/gm, '');

        const newValue = before + cleaned + after;
        onChange?.(newValue);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, start + cleaned.length);
        }, 0);
    }, [getSelection, onChange, disabled]);

    const checkBold = useCallback((): boolean => {
        const { start, end, selectedText } = getSelection();
        if (!selectedText) return false;
        const before = textareaRef.current?.value.substring(0, start) || '';
        return /\*\*.+?\*\*$/.test(before) && /^\*\*/.test(selectedText);
    }, [getSelection]);

    const checkItalic = useCallback((): boolean => {
        const { start, end, selectedText } = getSelection();
        if (!selectedText) return false;
        const before = textareaRef.current?.value.substring(0, start) || '';
        return /\*.+?\*$/.test(before) && /^\*/.test(selectedText);
    }, [getSelection]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            return;
        }

        if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            wrapSelection('**', '**');
        }

        if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            wrapSelection('*', '*');
        }
    };

    const toolbarButtons: ToolbarButton[] = [
        {
            icon: <Bold size={16} />,
            label: 'In đậm (Ctrl+B)',
            action: () => wrapSelection('**', '**'),
        },
        {
            icon: <Italic size={16} />,
            label: 'In nghiêng (Ctrl+I)',
            action: () => wrapSelection('*', '*'),
        },
        {
            icon: <List size={16} />,
            label: 'Danh sách',
            action: insertListItem,
        },
        {
            icon: <ListOrdered size={16} />,
            label: 'Danh sách số',
            action: insertNumberedList,
        },
        {
            icon: <RemoveFormatting size={16} />,
            label: 'Xóa định dạng',
            action: clearFormatting,
        },
    ];

    return (
        <div className="w-full">
            {label && (
                <label className="input-label block mb-2">{label}</label>
            )}
            <div
                className={clsx(
                    'rounded-xl border transition-all',
                    error
                        ? 'border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10'
                        : 'border-[var(--border-default)] focus-within:border-[var(--color-brand-navy)] focus-within:ring-2 focus-within:ring-[var(--color-brand-navy)]/10',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border-default)] bg-[var(--bg-muted)]/50 rounded-t-xl">
                    {toolbarButtons.map((btn, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={btn.action}
                            disabled={disabled}
                            title={btn.label}
                            className={clsx(
                                'p-1.5 rounded-lg transition-all',
                                'hover:bg-[var(--bg-muted)]',
                                'text-[var(--text-muted)]',
                                'hover:text-[var(--color-brand-navy)]',
                                'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                        >
                            {btn.icon}
                        </button>
                    ))}
                    <div className="flex-1" />
                    <span className="text-xs text-[var(--text-muted)] tabular-nums">
                        {charCount.toLocaleString()} ký tự
                    </span>
                </div>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={clsx(
                        'w-full px-4 py-3 resize-none rounded-b-xl',
                        'bg-white text-[var(--text-primary)]',
                        'placeholder:text-[var(--text-muted)]',
                        'focus:outline-none',
                        'text-sm leading-relaxed',
                        disabled && 'cursor-not-allowed'
                    )}
                    style={{ minHeight }}
                />
            </div>
            {error && (
                <p className="mt-1.5 text-sm text-red-500">{error}</p>
            )}
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                Sử dụng <code className="px-1 py-0.5 bg-[var(--bg-muted)] rounded text-[var(--color-brand-navy)]">**text**</code> cho in đậm, <code className="px-1 py-0.5 bg-[var(--bg-muted)] rounded text-[var(--color-brand-navy)]">*text*</code> cho in nghiêng
            </p>
        </div>
    );
}
