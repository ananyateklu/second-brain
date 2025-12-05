/**
 * ChatInput Container Component
 * The main glassmorphism container for the chat input
 */

import React from 'react';
import { useChatInputContext } from './ChatInputContext';

export interface ChatInputContainerProps {
  children: React.ReactNode;
}

export function ChatInputContainer({ children }: ChatInputContainerProps) {
  return (
    <div className="chat-input-glass relative flex flex-col rounded-3xl px-3 py-2 transition-all duration-300">
      {children}
    </div>
  );
}

/**
 * Input Row - Contains the textarea and action buttons
 */
export function ChatInputRow({ children }: { children: React.ReactNode }) {
  return <div className="flex items-end gap-3">{children}</div>;
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
  );
}
