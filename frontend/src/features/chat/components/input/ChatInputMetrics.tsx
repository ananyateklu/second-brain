/**
 * Input Metrics Component
 * Displays character count, word count, and token estimates
 */

export interface ChatInputMetricsProps {
  charCount: number;
  wordCount: number;
  tokenCount: number;
  attachedFileCount?: number;
}

export function ChatInputMetrics({
  charCount,
  wordCount,
  tokenCount,
  attachedFileCount = 0,
}: ChatInputMetricsProps) {
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

