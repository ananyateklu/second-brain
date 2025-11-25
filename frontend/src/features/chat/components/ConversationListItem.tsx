import { useMemo } from 'react';
import { ChatConversation } from '../types/chat';
import { formatModelName } from '../../../utils/model-name-formatter';
import { formatConversationDate } from '../../../utils/date-utils';
import { useThemeStore } from '../../../store/theme-store';
import { estimateTokenCount } from '../../../utils/token-utils';

/**
 * Format token count for display (e.g., 1.2k, 15.3k)
 */
function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export interface ConversationListItemProps {
  conversation: ChatConversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Renders a single conversation item in the sidebar.
 */
export function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
  onDelete,
}: ConversationListItemProps) {
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const isPlaceholder = conversation.id === 'placeholder-new-chat';

  // Calculate total tokens from all messages
  // Use stored token counts if available, otherwise estimate from content
  const totalTokens = useMemo(() => {
    if (!conversation.messages || conversation.messages.length === 0) return 0;
    return conversation.messages.reduce((sum, msg) => {
      // Use stored token counts if available
      const storedTokens = (msg.inputTokens || 0) + (msg.outputTokens || 0);
      if (storedTokens > 0) {
        return sum + storedTokens;
      }
      // Fall back to estimating from content
      return sum + estimateTokenCount(msg.content);
    }, 0);
  }, [conversation.messages]);

  return (
    <div
      className="group px-4 py-3 cursor-pointer transition-all duration-200"
      style={{
        backgroundColor: isSelected ? 'var(--surface-card)' : 'transparent',
        borderLeftWidth: isSelected ? '4px' : '0.5px',
        borderLeftColor: isSelected
          ? 'var(--btn-primary-bg)'
          : 'color-mix(in srgb, var(--border) 85%, transparent)',
        borderTopWidth: '0.5px',
        borderTopColor: 'color-mix(in srgb, var(--border) 85%, transparent)',
        borderRightWidth: '0.5px',
        borderRightColor: 'color-mix(in srgb, var(--border) 85%, transparent)',
        borderBottomWidth: '0.5px',
        borderBottomColor: 'color-mix(in srgb, var(--border) 85%, transparent)',
      }}
      onClick={() => onSelect(conversation.id)}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="text-sm font-medium truncate flex-1 min-w-0"
            style={{ color: 'var(--text-primary)' }}
          >
            {conversation.title}
          </h3>
          {!isPlaceholder && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conversation.id);
              }}
              className="p-1 rounded hover:bg-opacity-10 transition-all duration-200 flex-shrink-0 opacity-0 group-hover:opacity-100"
              style={{
                color: 'rgb(239, 68, 68)',
              }}
              title="Delete conversation"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
              style={{
                backgroundColor: isDarkMode
                  ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                  : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                opacity: isDarkMode ? 1 : 0.7,
              }}
            >
              {conversation.provider}
            </span>
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium truncate"
              style={{
                backgroundColor: isDarkMode
                  ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                  : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                opacity: isDarkMode ? 1 : 0.7,
              }}
            >
              {formatModelName(conversation.model)}
            </span>
            {conversation.ragEnabled && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded flex-shrink-0"
                style={{
                  backgroundColor: isDarkMode
                    ? 'color-mix(in srgb, var(--color-brand-100) 15%, transparent)'
                    : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                  color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                  opacity: isDarkMode ? 1 : 0.7,
                }}
                title="RAG enabled"
              >
                <svg
                  className="w-2.5 h-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Token count */}
            {totalTokens > 0 && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
                style={{
                  backgroundColor: isDarkMode
                    ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                    : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                  color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                  opacity: isDarkMode ? 1 : 0.7,
                }}
                title={`${totalTokens.toLocaleString()} total tokens`}
              >
                <svg
                  className="w-2.5 h-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                {formatTokenCount(totalTokens)}
              </span>
            )}
            {/* Date */}
            <span
              className="text-[10px] whitespace-nowrap"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {formatConversationDate(conversation.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

