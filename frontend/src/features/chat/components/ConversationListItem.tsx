import { useMemo, useState, useEffect, useRef } from 'react';
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

/**
 * Custom circular checkbox component with animations
 */
function CircularCheckbox({
  checked,
  onChange,
  staggerIndex = 0,
}: {
  checked: boolean;
  onChange: () => void;
  staggerIndex?: number;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCheckedRef = useRef(checked);

  useEffect(() => {
    if (prevCheckedRef.current !== checked) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 250);
      prevCheckedRef.current = checked;
      return () => clearTimeout(timer);
    }
  }, [checked]);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="selection-checkbox flex-shrink-0 relative w-5 h-5 rounded-full cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        '--stagger-index': staggerIndex,
        backgroundColor: checked
          ? 'var(--btn-primary-bg)'
          : 'transparent',
        border: checked
          ? '2px solid var(--btn-primary-bg)'
          : '2px solid var(--text-tertiary)',
        boxShadow: checked
          ? '0 2px 8px -2px rgba(54, 105, 61, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
          : 'none',
        focusVisibleRingColor: 'var(--btn-primary-bg)',
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--color-brand-400)';
          e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-brand-600) 15%, transparent)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--text-tertiary)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Checkmark icon */}
      <svg
        className={`absolute inset-0 w-full h-full p-1 selection-checkbox-inner ${isAnimating ? (checked ? 'checked' : 'unchecked') : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          opacity: checked ? 1 : 0,
          transform: checked ? 'scale(1)' : 'scale(0.5)',
          transition: 'opacity 0.15s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <path
          className="selection-checkmark"
          d="M5 13l4 4L19 7"
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: checked ? 24 : 24,
            strokeDashoffset: checked ? 0 : 24,
            transition: 'stroke-dashoffset 0.2s ease-out 0.1s',
          }}
        />
      </svg>
    </button>
  );
}

export interface ConversationListItemProps {
  conversation: ChatConversation;
  isSelected: boolean;
  isSelectionMode?: boolean;
  isChecked?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  staggerIndex?: number;
}

/**
 * Renders a single conversation item in the sidebar.
 */
export function ConversationListItem({
  conversation,
  isSelected,
  isSelectionMode = false,
  isChecked = false,
  onSelect,
  onDelete,
  staggerIndex = 0,
}: ConversationListItemProps) {
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const isPlaceholder = conversation.id === 'placeholder-new-chat';
  const showCheckbox = isSelectionMode && !isPlaceholder;

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

  const handleClick = () => {
    if (isSelectionMode && !isPlaceholder) {
      onSelect(conversation.id);
    } else if (!isSelectionMode) {
      onSelect(conversation.id);
    }
  };

  // Determine background color based on selection state
  const getBackgroundColor = () => {
    if (isSelectionMode && isChecked) {
      return 'color-mix(in srgb, var(--surface-card) 40%, transparent)';
    }
    if (isSelected && !isSelectionMode) {
      return 'var(--surface-card)';
    }
    return 'transparent';
  };

  // Determine left border styling
  const getLeftBorderStyle = () => {
    if (isSelectionMode && isChecked) {
      return {
        width: '3px',
        color: 'var(--color-brand-500)',
      };
    }
    if (isSelected && !isSelectionMode) {
      return {
        width: '4px',
        color: 'var(--btn-primary-bg)',
      };
    }
    return {
      width: '0.5px',
      color: 'color-mix(in srgb, var(--border) 85%, transparent)',
    };
  };

  const leftBorder = getLeftBorderStyle();

  return (
    <div
      className={`group px-4 py-2 transition-all duration-300 relative ${isSelectionMode && isChecked ? 'selection-item-highlight' : ''}`}
      style={{
        backgroundColor: getBackgroundColor(),
        borderLeftWidth: leftBorder.width,
        borderLeftColor: leftBorder.color,
        borderTopWidth: '0.5px',
        borderTopColor: 'color-mix(in srgb, var(--border) 85%, transparent)',
        borderRightWidth: '0.5px',
        borderRightColor: 'color-mix(in srgb, var(--border) 85%, transparent)',
        borderBottomWidth: '0.5px',
        borderBottomColor: 'color-mix(in srgb, var(--border) 85%, transparent)',
        cursor: isSelectionMode ? 'pointer' : 'pointer',
        boxShadow: 'none',
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (!isSelected && !(isSelectionMode && isChecked)) {
          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--surface-card) 50%, transparent)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !(isSelectionMode && isChecked)) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {/* Hover indicator - faded green bar on the left */}
      {!isPlaceholder && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-40 transition-opacity duration-200"
          style={{
            backgroundColor: 'var(--color-brand-500)',
          }}
        />
      )}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {showCheckbox && (
              <CircularCheckbox
                checked={isChecked}
                onChange={() => onSelect(conversation.id)}
                staggerIndex={staggerIndex}
              />
            )}
            <h3
              className="conversation-title text-sm font-normal flex-1 min-w-0 transition-all duration-200 truncate"
              style={{
                color: 'var(--text-primary)',
                fontWeight: 400,
              }}
            >
              {conversation.title}
            </h3>
          </div>
          {!isPlaceholder && !isSelectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conversation.id);
              }}
              className="p-1.5 rounded-lg transition-all duration-200 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
              style={{
                color: 'rgb(239, 68, 68)',
                backgroundColor: 'transparent',
                width: '28px',
                height: '28px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
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
              style={{
                color: 'var(--text-tertiary)',
              }}
            >
              {formatConversationDate(conversation.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

