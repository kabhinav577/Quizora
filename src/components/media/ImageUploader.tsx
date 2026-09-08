'use client';

import * as React from 'react';
import { Upload, X, RefreshCw, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateImageFile } from '@/services/media';
import { getPublicMediaUrl } from '@/lib/utils';
import { ImageLightbox } from './ImageLightbox';

interface ImageUploaderProps {
  value: string | null;
  onChange: (path: string | null) => void;
  label?: string;
  helperText?: string;
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  label,
  helperText,
  className,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Generate local preview URL or synthetic path
    const objectUrl = URL.createObjectURL(file);
    onChange(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
          {label}
        </label>
      )}

      {value ? (
        <div className="relative group rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white cursor-pointer group/thumb"
              onClick={() => setLightboxOpen(true)}
              title="Click to view full image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPublicMediaUrl(value)}
                alt="Preview"
                className="h-full w-full object-cover group-hover/thumb:scale-105 transition"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                <ZoomIn className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-800 truncate">
                {value.startsWith('blob:') ? 'Uploaded Image' : value.split('/').pop()}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                Image Attached
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-2.5 text-xs gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Replace
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                onChange(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="h-8 px-2 text-xs"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          <div className="h-9 w-9 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-500 mb-2">
            <Upload className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-slate-700">
            <span className="text-blue-600 font-semibold">Upload an image</span> or drag & drop
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            WebP, PNG, JPG up to 5MB
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/webp,image/png,image/jpeg"
        className="hidden"
        onChange={handleInputChange}
      />

      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imagePath={value}
      />
    </div>
  );
}
