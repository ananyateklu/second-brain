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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
            )}
            {conversation.agentEnabled && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded flex-shrink-0"
                style={{
                  backgroundColor: isDarkMode
                    ? 'color-mix(in srgb, var(--color-brand-100) 15%, transparent)'
                    : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                  color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                  opacity: isDarkMode ? 1 : 0.7,
                }}
                title="Agent mode enabled"
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
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
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
                {formatTokenCount(totalTokens)} tokens
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

