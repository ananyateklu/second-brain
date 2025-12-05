/**
 * Error Message Component
 * Displays error messages in the chat input area
 * 
 * Can be used standalone with props or with ChatInputContext
 */

import { useChatInputContext } from './ChatInputContext';

export interface ChatErrorMessageProps {
  /** Error message to display (optional if using context) */
  message?: string;
  /** Callback when error is dismissed */
  onDismiss?: () => void;
  /** Which error type to show from context: 'file' or 'imageGen' */
  errorType?: 'file' | 'imageGen';
}

export function ChatErrorMessage({
  message: propMessage,
  onDismiss,
  errorType = 'file',
}: ChatErrorMessageProps) {
  // Try to use context, but fall back to props
  let contextValue: ReturnType<typeof useChatInputContext> | null = null;
  try {
    contextValue = useChatInputContext();
  } catch {
    // Not in a ChatInput context, use props
  }

  // Determine which error message to show
  const message = propMessage ?? (
    errorType === 'imageGen'
      ? contextValue?.imageGenError
      : contextValue?.fileError
  );

  if (!message) return null;

  return (
    <div
      className="mb-2 px-4 py-2.5 rounded-xl text-sm animate-in fade-in duration-200"
      style={{
        backgroundColor: 'var(--error-bg)',
        color: 'var(--error-text)',
        border: '1px solid var(--error-border)',
      }}
    >
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="flex-1">{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-auto p-0.5 rounded hover:bg-white/10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

