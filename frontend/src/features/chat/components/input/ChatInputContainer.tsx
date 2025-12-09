/**
 * ChatInput Container Component
 * 
 * The main glassmorphism container for the chat input with dynamic height
 * management based on focus state.
 * 
 * Features:
 * - Smooth 300ms height transitions
 * - 70vh max when focused, 30vh max when unfocused
 * - GPU-accelerated animations
 * - Scrollable content area
 */

import React, { useCallback, useRef } from 'react';
import { useChatInputContext } from './ChatInputContext';

export interface ChatInputContainerProps {
  children: React.ReactNode;
}

/**
 * Main container with dynamic height based on focus state
 */
export function ChatInputContainer({ children }: ChatInputContainerProps) {
  const { isFocused, maxHeight, isScrollable } = useChatInputContext();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click within container to maintain focus
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Prevent blur when clicking within the container
    const target = e.target as HTMLElement;
    if (target.tagName !== 'BUTTON' && target.tagName !== 'INPUT') {
      // Keep focus on textarea
      const textarea = containerRef.current?.querySelector('textarea');
      if (textarea && document.activeElement !== textarea) {
        textarea.focus();
      }
    }
  }, []);

  // Dynamic classes based on state
  const containerClasses = [
    'chat-input-glass',
    'chat-input-container',
    'chat-input-dynamic',
    'relative flex flex-col rounded-3xl px-3 py-2',
    isFocused ? 'chat-input-focused' : 'chat-input-blurred',
    isScrollable ? 'chat-input-scrollable' : '',
  ].filter(Boolean).join(' ');

  // Inline styles for dynamic max-height
  // Note: Don't set overflow on container - let children handle their own scroll
  const containerStyle: React.CSSProperties = {
    maxHeight: maxHeight ? `${maxHeight}px` : undefined,
    transition: 'max-height 300ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 300ms ease, border-color 300ms ease',
    willChange: 'max-height',
    // Don't use contain: layout as it can interfere with scroll
    // Allow scroll events to pass through to textarea
    overflow: 'visible',
  };

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={containerStyle}
      onClick={handleContainerClick}
    >
      {children}
    </div>
  );
}

/**
 * Input Row - Contains the textarea and action buttons
 * Now flex-wrap enabled for responsive layout
 */
export function ChatInputRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-3 flex-wrap">
      {children}
    </div>
  );
}

/**
 * Scrollable Content Area - Wraps content that should be scrollable
 */
export function ChatInputScrollArea({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="chat-input-scroll-area overflow-y-auto"
      style={{
        scrollbarGutter: 'stable',
        // Enable momentum scrolling
        WebkitOverflowScrolling: 'touch',
        // Allow all gestures
        touchAction: 'auto',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Vision Support Indicator - Shows when model doesn't support images
 */
export function ChatInputVisionIndicator() {
  const { provider, model, supportsVision, isImageGenerationMode } = useChatInputContext();

  if (isImageGenerationMode || !provider || !model || supportsVision) {
    return null;
  }

  return (
    <div
      className="mt-2 text-center text-xs chat-input-vision-indicator"
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
  );
}

/**
 * Focus Overlay - Visual indicator when input is expanded/focused
 */
export function ChatInputFocusOverlay() {
  const { isFocused } = useChatInputContext();

  if (!isFocused) return null;

  return (
    <div
      className="chat-input-focus-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        zIndex: -1,
        opacity: isFocused ? 1 : 0,
        transition: 'opacity 300ms ease',
        pointerEvents: 'none',
      }}
    />
  );
}
