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
                {label && <label className="input-label">{label}</label>}
                <div className="relative">
                    {(iconLeft || isSearch) && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]">
                            {isSearch ? <Search size={16} /> : iconLeft}
                        </span>
                    )}
                    <input
                        ref={ref}
                        type={inputType}
                        className={clsx(
                            'input-field',
                            error && 'error',
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)] transition-colors"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    )}
                    {iconRight && !isPassword && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dash-text-muted)]">
                            {iconRight}
                        </span>
                    )}
                </div>
                {error && <p className="input-error">{error}</p>}
                {helperText && !error && <p className="input-helper">{helperText}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
export default Input;
