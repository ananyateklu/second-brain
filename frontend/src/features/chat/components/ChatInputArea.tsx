import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { estimateTokenCount } from '../../../utils/token-utils';
import {
  isMultimodalModel,
  validateImageForProvider,
  createImageAttachment,
  getMultimodalConfig,
  type ImageAttachment,
} from '../../../utils/multimodal-models';
import { MessageImage } from '../types/chat';

export interface ChatInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (images?: MessageImage[]) => void;
  onCancel: () => void;
  isStreaming: boolean;
  isLoading: boolean;
  disabled: boolean;
  /** Current provider for multimodal detection */
  provider?: string;
  /** Current model for multimodal detection */
  model?: string;
}

/**
 * Chat input area with textarea, image upload, token count, and send/cancel button.
 */
export function ChatInputArea({
  value,
  onChange,
  onSend,
  onCancel,
  isStreaming,
  isLoading,
  disabled,
  provider,
  model,
}: ChatInputAreaProps) {
  const inputTokenCount = useMemo(() => estimateTokenCount(value), [value]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Check if current model supports vision
  const supportsVision = useMemo(() => {
    if (!provider || !model) return false;
    return isMultimodalModel(provider, model);
  }, [provider, model]);

  // Get max images for current provider
  const maxImages = useMemo(() => {
    if (!provider) return 4;
    const config = getMultimodalConfig(provider);
    return config?.maxImages || 4;
  }, [provider]);

  // Clear images when model changes to non-multimodal
  useEffect(() => {
    if (!supportsVision && attachedImages.length > 0) {
      setAttachedImages([]);
      setImageError('Images cleared: current model does not support vision');
      setTimeout(() => setImageError(null), 3000);
    }
  }, [supportsVision, attachedImages.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = useCallback(() => {
    if (!value.trim() && attachedImages.length === 0) return;

    // Convert attachments to MessageImage format
    const images: MessageImage[] | undefined =
      attachedImages.length > 0
        ? attachedImages.map((img) => {
            // Extract base64 data from data URL
            const base64Match = img.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            return {
              base64Data: base64Match ? base64Match[2] : img.dataUrl,
              mediaType: img.type,
              fileName: img.name,
            };
          })
        : undefined;

    onSend(images);
    setAttachedImages([]);
    setImageError(null);
  }, [value, attachedImages, onSend]);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // Create array copy immediately so we can reset input
      const fileArray = Array.from(files);

      // Reset file input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (!provider) {
        setImageError('Please select a provider first');
        return;
      }

      if (!supportsVision) {
        setImageError(`${model} does not support image inputs`);
        return;
      }

      const remainingSlots = maxImages - attachedImages.length;
      if (remainingSlots <= 0) {
        setImageError(`Maximum ${maxImages} images allowed`);
        return;
      }

      setImageError(null);
      const filesToProcess = fileArray.slice(0, remainingSlots);

      for (const file of filesToProcess) {
        // Validate file
        const validation = validateImageForProvider(file, provider);
        if (!validation.valid) {
          setImageError(validation.error || 'Invalid image');
          continue;
        }

        try {
          const attachment = await createImageAttachment(file);
          setAttachedImages((prev) => [...prev, attachment]);
        } catch {
          setImageError('Failed to process image');
        }
      }
    },
    [provider, model, supportsVision, maxImages, attachedImages.length]
  );

  const handleRemoveImage = useCallback((imageId: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== imageId));
    setImageError(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (supportsVision && !disabled) {
        setIsDragging(true);
      }
    },
    [supportsVision, disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!supportsVision || disabled) return;

      const files = e.dataTransfer.files;
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith('image/')
      );

      if (imageFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        imageFiles.forEach((f) => dataTransfer.items.add(f));
        handleFileSelect(dataTransfer.files);
      }
    },
    [supportsVision, disabled, handleFileSelect]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (!supportsVision || disabled) return;

      const items = e.clipboardData.items;
      const imageItems: File[] = [];

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageItems.push(file);
        }
      }

      if (imageItems.length > 0) {
        e.preventDefault();
        const dataTransfer = new DataTransfer();
        imageItems.forEach((f) => dataTransfer.items.add(f));
        handleFileSelect(dataTransfer.files);
      }
    },
    [supportsVision, disabled, handleFileSelect]
  );

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-6 py-6 z-20 overflow-hidden [scrollbar-gutter:stable]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-3xl mx-auto">
        {/* Image Attachments Preview */}
        {attachedImages.length > 0 && (
          <div
            className="mb-3 flex flex-wrap gap-2 p-2 rounded-xl transition-all duration-200"
            style={{
              backgroundColor: 'var(--surface-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {attachedImages.map((img) => (
              <div
                key={img.id}
                className="relative group rounded-lg overflow-hidden"
                style={{ width: '80px', height: '80px' }}
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                  }}
                  title="Remove image"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div
                  className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[9px] truncate"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                  }}
                >
                  {img.name}
                </div>
              </div>
            ))}
            {attachedImages.length < maxImages && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center rounded-lg transition-all duration-150 hover:scale-105"
                style={{
                  width: '80px',
                  height: '80px',
                  border: '2px dashed var(--border)',
                  color: 'var(--text-tertiary)',
                }}
                title="Add more images"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Image Error Message */}
        {imageError && (
          <div
            className="mb-2 px-3 py-2 rounded-lg text-sm animate-in fade-in duration-200"
            style={{
              backgroundColor: 'var(--error-bg)',
              color: 'var(--error-text)',
              border: '1px solid var(--error-border)',
            }}
          >
            {imageError}
          </div>
        )}

        {/* Drag Overlay */}
        {isDragging && supportsVision && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-3xl z-30 animate-in fade-in duration-150"
            style={{
              backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
              border: '3px dashed var(--primary)',
            }}
          >
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                style={{ color: 'var(--primary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p style={{ color: 'var(--primary)' }} className="font-medium">
                Drop images here
              </p>
            </div>
          </div>
        )}

        {/* Unified Input Bar */}
        <div
          className="relative flex items-end gap-3 rounded-3xl px-4 py-3 transition-all duration-200"
          style={{
            backgroundColor: 'var(--surface-card-solid)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
          onFocus={(e) => {
            if (e.currentTarget === e.target || e.currentTarget.contains(e.target as Node)) {
              e.currentTarget.style.borderColor = 'var(--input-focus-border)';
              e.currentTarget.style.boxShadow = `0 0 0 3px var(--input-focus-ring), var(--shadow-lg)`;
            }
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }
          }}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {/* Image Upload Button */}
          {supportsVision && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || disabled || attachedImages.length >= maxImages}
              className="flex-shrink-0 p-2 rounded-lg transition-all duration-150 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                color: attachedImages.length > 0 ? 'var(--primary)' : 'var(--text-tertiary)',
              }}
              title={`Attach images (${attachedImages.length}/${maxImages})`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}

          {/* Textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              supportsVision
                ? 'Type your message... (Paste or drop images)'
                : 'Type your message... (Shift+Enter for new line)'
            }
            disabled={isLoading || disabled}
            rows={1}
            className="flex-1 resize-none outline-none text-sm leading-relaxed placeholder:opacity-50"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              minHeight: '24px',
              maxHeight: '200px',
              paddingRight: value.trim() || attachedImages.length > 0 ? '72px' : '0',
              transition: 'padding-right 0.2s ease',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />

          {/* Token Count - Bottom Right */}
          {(value.trim() || attachedImages.length > 0) && (
            <div
              className="absolute bottom-2.5 right-16 pointer-events-none select-none animate-in fade-in duration-200 flex items-center gap-2"
              style={{
                color: 'var(--text-tertiary)',
                fontSize: '10.5px',
                fontFeatureSettings: '"tnum"',
                letterSpacing: '0.01em',
                opacity: 0.7,
              }}
            >
              {attachedImages.length > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {attachedImages.length}
                </span>
              )}
              {value.trim() && (
                <span>
                  {inputTokenCount.toLocaleString()} {inputTokenCount === 1 ? 'token' : 'tokens'}
                </span>
              )}
            </div>
          )}

          {/* Send/Cancel Button */}
          <button
            onClick={isStreaming ? onCancel : handleSend}
            disabled={!isStreaming && (isLoading || (!value.trim() && attachedImages.length === 0) || disabled)}
            className="flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              backgroundColor: isStreaming ? 'var(--error-bg)' : 'var(--btn-primary-bg)',
              color: isStreaming ? 'var(--error-text)' : 'var(--btn-primary-text)',
              border: isStreaming
                ? '1px solid var(--error-border)'
                : '1px solid var(--btn-primary-border)',
              boxShadow: 'var(--btn-primary-shadow)',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                if (isStreaming) {
                  e.currentTarget.style.opacity = '0.9';
                } else {
                  e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover-bg)';
                  e.currentTarget.style.borderColor = 'var(--btn-primary-hover-border)';
                  e.currentTarget.style.boxShadow = 'var(--btn-primary-hover-shadow)';
                }
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                if (isStreaming) {
                  e.currentTarget.style.opacity = '1';
                } else {
                  e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)';
                  e.currentTarget.style.borderColor = 'var(--btn-primary-border)';
                  e.currentTarget.style.boxShadow = 'var(--btn-primary-shadow)';
                }
              }
            }}
            title={isStreaming ? 'Cancel streaming' : isLoading ? 'Sending...' : 'Send message'}
          >
            {isStreaming ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Vision support indicator */}
        {provider && model && !supportsVision && (
          <div
            className="mt-2 text-center text-xs"
            style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
          >
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {model} doesn&apos;t support image inputs
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
