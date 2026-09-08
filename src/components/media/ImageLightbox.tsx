'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { getPublicMediaUrl } from '@/lib/utils';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imagePath: string | null;
  alt?: string;
  title?: string;
}

export function ImageLightbox({
  isOpen,
  onClose,
  imagePath,
  alt = 'Question diagram',
  title = 'Enlarged Image View',
}: ImageLightboxProps) {
  if (!imagePath) return null;
  const src = getPublicMediaUrl(imagePath);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="4xl">
      <div className="flex flex-col items-center justify-center p-2">
        <div className="relative max-h-[70vh] w-full overflow-hidden rounded-lg bg-slate-950/5 flex items-center justify-center border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[68vh] w-auto object-contain rounded-md shadow-sm"
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Click the close icon or anywhere outside to dismiss
        </p>
      </div>
    </Modal>
  );
}
