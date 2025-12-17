/**
 * ChatInput TextArea Component
 *
 * The main text input area for the compound ChatInput.
 * Features:
 * - Scrollable when content exceeds max height
 * - Smooth auto-resize within bounds
 * - Custom scrollbar styling
 * - GPU-accelerated animations
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useChatInputContext } from './ChatInputContext';
import { getAllSupportedExtensions } from '../../../../utils/multimodal-models';
import styles from '@styles/components/chat-input.module.css';

export interface ChatInputTextAreaProps {
  /** Custom placeholder text */
  placeholder?: string;
  /** Callback when textarea height changes */
  onHeightChange?: (height: number) => void;
  /** Action buttons to render inside the textarea area (e.g., send button) */
  actions?: React.ReactNode;
}

export function ChatInputTextArea({
  placeholder,
  onHeightChange,
  actions,
}: ChatInputTextAreaProps) {
  const {
    value,
    onChange,
    textareaRef,
    fileInputRef,
    isLoading,
    disabled,
    isGeneratingImage,
    isImageGenerationMode,
    supportsVision,
    handleKeyDown,
    handlePaste,
    onFileSelect,
    isFocused,
    maxHeight, // Get maxHeight from context
    onFocus,
    onBlur,
  } = useChatInputContext();

  // Track the scroll height for resize observer
  const lastScrollHeightRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  /**
   * Adjust textarea height based on content
   * Uses max-height constraint for scrollable behavior
   */
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';

    // Get the scroll height (content height)
    const scrollHeight = textarea.scrollHeight;

    // Set max-height constraint - this enables scrolling when content exceeds it
    // We calculate a reasonable max height for the textarea within the container
    const effectiveMaxHeight = maxHeight
      ? Math.max(maxHeight - 80, 100)  // Leave room for other UI elements (buttons, etc.)
      : 400; // Default fallback

    // If content exceeds max height, cap it and enable scrolling
    if (scrollHeight > effectiveMaxHeight) {
      textarea.style.height = `${effectiveMaxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      // Content fits, grow to match content
      textarea.style.height = `${scrollHeight}px`;
      // Still allow scrolling for mouse gestures (but scrollbar won't show)
      textarea.style.overflowY = 'auto';
    }

    // Notify parent of height change
    if (onHeightChange && scrollHeight !== lastScrollHeightRef.current) {
      lastScrollHeightRef.current = scrollHeight;
      onHeightChange(scrollHeight);
    }
  }, [textareaRef, maxHeight, onHeightChange]);

  // Set up ResizeObserver for container changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Use ResizeObserver to detect container size changes
    resizeObserverRef.current = new ResizeObserver(() => {
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(adjustTextareaHeight);
    });

    resizeObserverRef.current.observe(textarea);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [textareaRef, adjustTextareaHeight]);

  // Adjust height when value changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Adjust height when max height changes (focus/blur transition)
  useEffect(() => {
    if (maxHeight !== undefined) {
      adjustTextareaHeight();
    }
  }, [maxHeight, adjustTextareaHeight]);

  // Scroll to cursor position when focused with long content
  const handleFocusInternal = useCallback(() => {
    onFocus?.();

    // Scroll textarea to show cursor after a brief delay for transition
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionEnd === textarea.value.length) {
        // Cursor is at the end, scroll to bottom
        textarea.scrollTop = textarea.scrollHeight;
      }
    }, 50);
  }, [onFocus, textareaRef]);

  const handleBlurInternal = useCallback(() => {
    onBlur?.();
  }, [onBlur]);

  const defaultPlaceholder = isImageGenerationMode
    ? 'Describe the image you want to create...'
    : supportsVision
      ? 'Type a message... (@ to mention notes, paste/drop files)'
      : 'Type a message... (@ to mention notes, Shift+Enter for new line)';

  return (
    <div className={`flex-1 relative ${styles.textareaWrapper}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAllSupportedExtensions().join(',')}
        multiple
        className="hidden"
        onChange={(e) => { onFileSelect(e.target.files); }}
      />

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        onKeyDown={handleKeyDown}
        onPaste={!isImageGenerationMode ? handlePaste : undefined}
        placeholder={placeholder || defaultPlaceholder}
        disabled={isLoading || disabled || isGeneratingImage}
        rows={1}
        className={`
          w-full resize-none outline-none text-sm leading-relaxed
          placeholder:opacity-50
          ${styles.textarea}
          ${isFocused ? styles.textareaFocused : ''}
        `}
        style={{
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          minHeight: '40px',
          // Add padding for the action button on the right
          paddingRight: actions ? '48px' : undefined,
          // Add vertical padding to center text with the send button
          paddingTop: '8px',
          paddingBottom: '8px',
          // Stable scrollbar gutter to prevent layout shift
          scrollbarGutter: 'stable',
          // Enable momentum scrolling on macOS/iOS
          WebkitOverflowScrolling: 'touch',
          // Allow text selection with mouse
          userSelect: 'text',
          WebkitUserSelect: 'text',
          // Enable all pan gestures for touch/trackpad scrolling
          touchAction: 'auto',
          // Ensure cursor is text for proper interaction
          cursor: 'text',
          // Prevent scroll chaining to parent when at boundaries
          overscrollBehavior: 'contain',
        }}
        onInput={adjustTextareaHeight}
        onFocus={handleFocusInternal}
        onBlur={handleBlurInternal}
      />

      {/* Action buttons positioned inside the textarea area, left of scrollbar */}
      {actions && (
        <div
          className={styles.actionsSlot}
          style={{
            position: 'absolute',
            right: '0px', // Position close to the edge, left of scrollbar
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
