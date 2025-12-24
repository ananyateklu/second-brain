/**
 * Note Image Attachment Component
 * Handles image upload, preview, and management for notes
 */

import { useCallback, useRef, useState } from 'react';
import {
  type FileAttachment,
  createFileAttachment,
  validateFileForAttachment,
  formatFileSize,
  isImageFile,
} from '../../../utils/multimodal-models';
import type { NoteImage } from '../../../types/notes';

export interface NoteImageAttachmentProps {
  /** New images being added (not yet saved) */
  newImages: FileAttachment[];
  /** Existing images from the note (already saved) */
  existingImages?: NoteImage[];
  /** IDs of existing images marked for deletion */
  deletedImageIds: string[];
  /** Callback when new images are added */
  onAddImages: (images: FileAttachment[]) => void;
  /** Callback when a new image is removed */
  onRemoveNewImage: (imageId: string) => void;
  /** Callback when an existing image is marked for deletion */
  onDeleteExistingImage: (imageId: string) => void;
  /** Callback when an existing image deletion is undone */
  onUndoDeleteExistingImage: (imageId: string) => void;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
  /** Error message to display */
  error?: string | null;
}

const MAX_IMAGES = 10;
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp';

export function NoteImageAttachment({
  newImages,
  existingImages = [],
  deletedImageIds,
  onAddImages,
  onRemoveNewImage,
  onDeleteExistingImage,
  onUndoDeleteExistingImage,
  isSubmitting = false,
  error,
}: NoteImageAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Calculate total images (excluding deleted ones)
  const activeExistingImages = existingImages.filter(img => !deletedImageIds.includes(img.id));
  const totalImages = newImages.length + activeExistingImages.length;
  const canAddMore = totalImages < MAX_IMAGES;

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLocalError(null);

    const remainingSlots = MAX_IMAGES - totalImages;
    if (remainingSlots <= 0) {
      setLocalError(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newAttachments: FileAttachment[] = [];
    const errors: string[] = [];

    for (const file of filesToProcess) {
      // Only allow images
      if (!isImageFile(file.type)) {
        errors.push(`${file.name}: Only images are allowed`);
        continue;
      }

      const validation = validateFileForAttachment(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        continue;
      }

      try {
        const attachment = await createFileAttachment(file);
        newAttachments.push(attachment);
      } catch {
        errors.push(`${file.name}: Failed to process`);
      }
    }

    if (newAttachments.length > 0) {
      onAddImages(newAttachments);
    }

    if (errors.length > 0) {
      setLocalError(errors.join('; '));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [totalImages, onAddImages]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    void handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const displayError = error || localError;

  // Convert FileAttachment to display format
  const getImageDataUrl = (attachment: FileAttachment): string => {
    return attachment.dataUrl;
  };

  // Convert NoteImage to display format
  const getExistingImageUrl = (image: NoteImage): string => {
    // If it's a full data URL, use as-is; otherwise construct one
    if (image.base64Data.startsWith('data:')) {
      return image.base64Data;
    }
    return `data:${image.mediaType};base64,${image.base64Data}`;
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        onChange={(e) => { void handleFileSelect(e.target.files); }}
        className="hidden"
        disabled={isSubmitting || !canAddMore}
      />

      {/* Image gallery */}
      {(newImages.length > 0 || existingImages.length > 0) && (
        <div
          className="flex flex-wrap gap-2 p-2 rounded-xl transition-all duration-200"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Existing images */}
          {existingImages.map((image) => {
            const isDeleted = deletedImageIds.includes(image.id);
            return (
              <div
                key={image.id}
                className={`relative group rounded-xl overflow-hidden transition-all duration-200 ${
                  isDeleted ? 'opacity-50 grayscale' : 'hover:scale-105'
                }`}
                style={{
                  width: '100px',
                  height: '100px',
                }}
              >
                <img
                  src={getExistingImageUrl(image)}
                  alt={image.altText || image.fileName || 'Note image'}
                  className="w-full h-full object-cover"
                />

                {/* AI description indicator */}
                {image.description && !isDeleted && (
                  <div
                    className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'var(--color-brand-400)',
                    }}
                    title={`AI: ${image.description}`}
                  >
                    AI
                  </div>
                )}

                {/* Hover overlay */}
                <div
                  className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-200 ${
                    isDeleted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={{
                    background: isDeleted
                      ? 'rgba(0,0,0,0.6)'
                      : 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  }}
                >
                  {isDeleted ? (
                    <div className="flex items-center justify-center h-full">
                      <button
                        type="button"
                        onClick={() => onUndoDeleteExistingImage(image.id)}
                        className="px-2 py-1 rounded text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: 'var(--color-brand-600)',
                          color: 'white',
                        }}
                        disabled={isSubmitting}
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 text-white text-[10px]">
                      <div className="truncate font-medium">{image.fileName || 'Image'}</div>
                    </div>
                  )}
                </div>

                {/* Delete button (only for non-deleted) */}
                {!isDeleted && (
                  <button
                    type="button"
                    onClick={() => onDeleteExistingImage(image.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-error) 90%, transparent)',
                      color: 'var(--btn-primary-text)',
                    }}
                    title="Remove image"
                    disabled={isSubmitting}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}

          {/* New images */}
          {newImages.map((image) => (
            <div
              key={image.id}
              className="relative group rounded-xl overflow-hidden transition-transform duration-200 hover:scale-105"
              style={{
                width: '100px',
                height: '100px',
              }}
            >
              <img
                src={getImageDataUrl(image)}
                alt={image.name}
                className="w-full h-full object-cover"
              />

              {/* New badge */}
              <div
                className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
                style={{
                  backgroundColor: 'var(--color-success-background)',
                  color: 'var(--color-success-text)',
                }}
              >
                New
              </div>

              {/* Hover overlay */}
              <div
                className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                }}
              >
                <div className="p-2 text-white text-[10px]">
                  <div className="truncate font-medium">{image.name}</div>
                  <div className="opacity-70">{formatFileSize(image.size)}</div>
                </div>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemoveNewImage(image.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                }}
                title="Remove image"
                disabled={isSubmitting}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add more button (in gallery) */}
          {canAddMore && (
            <button
              type="button"
              onClick={handleButtonClick}
              className="flex flex-col items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                width: '100px',
                height: '100px',
                border: '2px dashed var(--border)',
                color: 'var(--text-tertiary)',
              }}
              title="Add more images"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] mt-1">Add image</span>
            </button>
          )}
        </div>
      )}

      {/* Drop zone / Add button (when no images) */}
      {newImages.length === 0 && existingImages.length === 0 && (
        <div
          className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
            isDragging ? 'scale-[1.02]' : ''
          }`}
          style={{
            borderColor: isDragging ? 'var(--color-brand-500)' : 'var(--border)',
            backgroundColor: isDragging ? 'var(--color-brand-50)' : 'transparent',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <button
            type="button"
            onClick={handleButtonClick}
            className="w-full py-3 px-3 flex items-center justify-center gap-2 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">
              {isDragging ? 'Drop images here' : 'Add images (drag & drop or click)'}
            </span>
          </button>
        </div>
      )}

      {/* Error message */}
      {displayError && (
        <p className="text-sm px-1" style={{ color: 'var(--color-error-text)' }}>
          {displayError}
        </p>
      )}

      {/* Image count indicator */}
      {totalImages > 0 && (
        <p className="text-xs px-1" style={{ color: 'var(--text-tertiary)' }}>
          {totalImages} of {MAX_IMAGES} images
          {deletedImageIds.length > 0 && (
            <span className="ml-2" style={{ color: 'var(--color-warning-text)' }}>
              ({deletedImageIds.length} marked for deletion)
            </span>
          )}
        </p>
      )}
    </div>
  );
}

