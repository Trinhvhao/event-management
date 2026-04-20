'use client';

import React, { forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff, Search } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    iconLeft?: React.ReactNode;
    iconRight?: React.ReactNode;
    isSearch?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, iconLeft, iconRight, isSearch, className, type, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === 'password';
        const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {(iconLeft || isSearch) && (
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10">
                            {isSearch ? <Search size={16} /> : iconLeft}
                        </span>
                    )}
                    <input
                        ref={ref}
                        type={inputType}
                        className={clsx(
                            'input-base',
                            error && 'border-[var(--color-brand-red)] focus:border-[var(--color-brand-red)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-brand-red)_8%,transparent)]',
                            (iconLeft || isSearch) && 'pl-10',
                            (iconRight || isPassword) && 'pr-10',
                            className
                        )}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    )}
                    {iconRight && !isPassword && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
                            {iconRight}
                        </span>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-xs font-medium text-[var(--color-brand-red)]">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
export default Input;
