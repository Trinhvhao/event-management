'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import axios from '@/lib/axios';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  error?: string;
  helperText?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageUpload({ value, onChange, error, helperText }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Initialize preview from value (existing image URL)
  useEffect(() => {
    if (value && !localPreview) {
      setLocalPreview(value);
    }
  }, [value, localPreview]);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Định dạng file không được hỗ trợ. Vui lòng sử dụng: JPG, PNG, WebP, GIF';
    }
    if (file.size > MAX_SIZE) {
      return 'Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 5MB';
    }
    return null;
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setIsUploading(true);
    setUploadProgress(0);

    // Create local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLocalPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      const { url } = response.data.data;
      onChange(url);
      toast.success('Tải ảnh lên thành công!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message || 'Tải ảnh thất bại');
      setLocalPreview(null);
      onChange(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [validateFile, onChange]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadFile]);

  const handleRemove = useCallback(() => {
    setLocalPreview(null);
    setValidationError(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  const displayError = error || validationError;

  return (
    <div>
      <label className="input-label">
        Hình ảnh bìa
      </label>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {localPreview ? (
        <div className="relative group">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-secondary)]">
            <img
              src={localPreview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleClick}
                className="px-3 py-1.5 bg-white/90 text-gray-900 rounded-md text-sm font-medium hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <Upload size={14} />
                Thay đổi
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 bg-red-500/90 text-white rounded-md text-sm font-medium hover:bg-red-500 transition-colors flex items-center gap-1.5"
              >
                <X size={14} />
                Xóa
              </button>
            </div>

            {/* Upload progress overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                <Loader2 size={32} className="text-white animate-spin mb-2" />
                <div className="w-32 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--dash-accent)] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-white text-sm mt-2">{uploadProgress}%</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragging 
              ? 'border-[var(--dash-accent)] bg-[var(--dash-accent)]/10' 
              : displayError
                ? 'border-red-500 bg-red-500/5'
                : 'border-[var(--dash-border)] hover:border-[var(--dash-accent)]/50 hover:bg-[var(--dash-accent)]/5'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 size={40} className="text-[var(--dash-accent)] animate-spin mb-3" />
              <p className="text-[var(--dash-text-secondary)] text-sm">Đang tải lên...</p>
              <div className="w-full h-2 bg-[var(--dash-border)] rounded-full overflow-hidden mt-3">
                <div 
                  className="h-full bg-[var(--dash-accent)] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-[var(--dash-text-muted)] text-xs mt-1">{uploadProgress}%</span>
            </div>
          ) : (
            <>
              <div className={`
                w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3
                ${isDragging ? 'bg-[var(--dash-accent)]/20' : 'bg-[var(--dash-bg-secondary)]'}
              `}>
                {isDragging ? (
                  <ImageIcon size={24} className="text-[var(--dash-accent)]" />
                ) : (
                  <Upload size={24} className="text-[var(--dash-text-muted)]" />
                )}
              </div>
              <p className="text-[var(--dash-text-primary)] font-medium mb-1">
                {isDragging ? 'Thả file vào đây' : 'Kéo thả ảnh hoặc nhấn để chọn'}
              </p>
              <p className="text-[var(--dash-text-muted)] text-sm">
                Định dạng: JPG, PNG, WebP, GIF (tối đa 5MB)
              </p>
            </>
          )}
        </div>
      )}

      {displayError && (
        <p className="mt-1.5 text-sm text-red-500">{displayError}</p>
      )}

      {helperText && !displayError && (
        <p className="mt-1.5 text-sm text-[var(--dash-text-muted)]">{helperText}</p>
      )}
    </div>
  );
}
