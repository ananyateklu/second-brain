import { useMemo } from 'react';
import { estimateTokenCount } from '../../../utils/token-utils';

export interface ChatInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  isStreaming: boolean;
  isLoading: boolean;
  disabled: boolean;
}

/**
 * Chat input area with textarea, token count, and send/cancel button.
 */
export function ChatInputArea({
  value,
  onChange,
  onSend,
  onCancel,
  isStreaming,
  isLoading,
  disabled,
}: ChatInputAreaProps) {
  const inputTokenCount = useMemo(() => estimateTokenCount(value), [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-6 py-6 z-20 overflow-hidden [scrollbar-gutter:stable]"
    >
      <div className="max-w-3xl mx-auto">
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
          {/* Textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            disabled={isLoading || disabled}
            rows={1}
            className="flex-1 resize-none outline-none text-sm leading-relaxed placeholder:opacity-50"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              minHeight: '24px',
              maxHeight: '200px',
              paddingRight: value.trim() ? '72px' : '0',
              transition: 'padding-right 0.2s ease',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />

          {/* Token Count - Bottom Right */}
          {value.trim() && (
            <div
              className="absolute bottom-2.5 right-16 pointer-events-none select-none animate-in fade-in duration-200"
              style={{
                color: 'var(--text-tertiary)',
                fontSize: '10.5px',
                fontFeatureSettings: '"tnum"',
                letterSpacing: '0.01em',
                opacity: 0.7,
              }}
            >
              {inputTokenCount.toLocaleString()} {inputTokenCount === 1 ? 'token' : 'tokens'}
            </div>
          )}

          {/* Send/Cancel Button */}
          <button
            onClick={isStreaming ? onCancel : onSend}
            disabled={!isStreaming && (isLoading || !value.trim() || disabled)}
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
      </div>
    </div>
  );
}

