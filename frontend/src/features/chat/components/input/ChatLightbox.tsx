/**
 * Lightbox Component
 * Full-screen image preview modal
 * 
 * Can be used standalone with props or with ChatInputContext
 */

import { formatFileSize, type FileAttachment } from '../../../../utils/multimodal-models';
import { useChatInputContextSafe } from './ChatInputContext';

export interface ChatLightboxProps {
  /** Image to display (optional if using context) */
  image?: FileAttachment | null;
  /** Callback when lightbox is closed (optional if using context) */
  onClose?: () => void;
}

export function ChatLightbox({
  image: propImage,
  onClose: propOnClose,
}: ChatLightboxProps = {}) {
  // Use safe context hook - returns null if not in ChatInput context
  const contextValue = useChatInputContextSafe();

  const image = propImage ?? contextValue?.lightboxImage;
  const onClose = propOnClose ?? contextValue?.onLightboxClose ?? (() => { });

  if (!image) return null;

  return (
    <div
      className="lightbox-overlay fixed inset-0 z-50 flex items-center justify-center p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-white/10"
        style={{ color: 'white' }}
        onClick={onClose}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={image.dataUrl}
        alt={image.name}
        className="lightbox-image max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
      >
        <div className="text-sm font-medium">{image.name}</div>
        <div className="text-xs opacity-70">{formatFileSize(image.size)}</div>
      </div>
    </div>
  );
}

