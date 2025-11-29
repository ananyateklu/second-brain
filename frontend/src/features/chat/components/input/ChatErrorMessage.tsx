/**
 * Error Message Component
 * Displays error messages in the chat input area
 */

export interface ChatErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export function ChatErrorMessage({ message, onDismiss }: ChatErrorMessageProps) {
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

