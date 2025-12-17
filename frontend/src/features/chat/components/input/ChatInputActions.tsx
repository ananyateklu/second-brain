/**
 * ChatInput Actions Component
 * Container for action buttons (send, cancel, etc.)
 */

import React from 'react';
import { useChatInputContext } from './ChatInputContext';
import styles from '@styles/components/chat-input.module.css';

export interface ChatInputActionsProps {
  children?: React.ReactNode;
}

export function ChatInputActions({ children }: ChatInputActionsProps) {
  return <>{children}</>;
}

/**
 * Send Button Component
 * Main action button that sends the message or cancels streaming
 */
export function ChatInputSendButton() {
  const {
    isStreaming,
    isLoading,
    isGeneratingImage,
    hasContent,
    disabled,
    isImageGenerationMode,
    onSend,
    onCancel,
  } = useChatInputContext();

  return (
    <button
      onClick={isStreaming ? onCancel : onSend}
      disabled={!isStreaming && (isLoading || isGeneratingImage || !hasContent || disabled)}
      className={`${styles.sendButton} flex-shrink-0 w-10 h-10 p-0 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${hasContent && !isStreaming && !isGeneratingImage ? styles.hasContent : ''
        }`}
      style={{
        backgroundColor: isStreaming ? 'var(--error-bg)' : 'var(--btn-primary-bg)',
        color: isStreaming ? 'var(--error-text)' : 'var(--btn-primary-text)',
        border: isStreaming
          ? '1px solid var(--error-border)'
          : '1px solid var(--btn-primary-border)',
        boxShadow: 'var(--btn-primary-shadow)',
      }}
      title={
        isStreaming
          ? 'Cancel streaming'
          : isGeneratingImage
            ? 'Generating image...'
            : isImageGenerationMode
              ? 'Generate image'
              : isLoading
                ? 'Sending...'
                : 'Send message'
      }
    >
      {isStreaming ? (
        <CancelIcon />
      ) : isLoading || isGeneratingImage ? (
        <LoadingIcon />
      ) : isImageGenerationMode ? (
        <ImageIcon />
      ) : (
        <SendIcon />
      )}
    </button>
  );
}

// Icons
function CancelIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
