/**
 * Input Metrics Component
 * Displays character count, word count, and token estimates
 * 
 * Can be used standalone with props or with ChatInputContext
 */

import { useChatInputContextSafe } from './ChatInputContext';

export interface ChatInputMetricsProps {
  /** Character count (optional if using context) */
  charCount?: number;
  /** Word count (optional if using context) */
  wordCount?: number;
  /** Token count (optional if using context) */
  tokenCount?: number;
  /** Number of attached files (optional if using context) */
  attachedFileCount?: number;
}

export function ChatInputMetrics({
  charCount: propCharCount,
  wordCount: propWordCount,
  tokenCount: propTokenCount,
  attachedFileCount: propAttachedFileCount,
}: ChatInputMetricsProps) {
  // Use safe context hook - returns null if not in ChatInput context
  const contextValue = useChatInputContextSafe();

  const charCount = propCharCount ?? contextValue?.charCount ?? 0;
  const wordCount = propWordCount ?? contextValue?.wordCount ?? 0;
  const tokenCount = propTokenCount ?? contextValue?.inputTokenCount ?? 0;
  const attachedFileCount = propAttachedFileCount ?? contextValue?.attachedFiles.length ?? 0;
  const hasContent = contextValue?.hasContent ?? (charCount > 0 || attachedFileCount > 0);

  if (!hasContent) return null;

  return (
    <div
      className="flex items-center justify-end gap-3 mt-2 pt-2 animate-in fade-in duration-200"
      style={{
        borderTop: '1px solid var(--border)',
        color: 'var(--text-tertiary)',
        fontSize: '10.5px',
        fontFeatureSettings: '"tnum"',
      }}
    >
      {attachedFileCount > 0 && (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          {attachedFileCount} {attachedFileCount === 1 ? 'file' : 'files'}
        </span>
      )}
      {charCount > 0 && (
        <>
          <span>{charCount.toLocaleString()} chars</span>
          <span>{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
          <span>{tokenCount.toLocaleString()} {tokenCount === 1 ? 'token' : 'tokens'}</span>
        </>
      )}
    </div>
  );
}

