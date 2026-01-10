import { memo } from 'react';
import { ChatConversation } from '../types/chat';
import { formatModelName } from '../../../utils/model-name-formatter';
import { formatConversationDate } from '../../../utils/date-utils';
import { useBoundStore } from '../../../store/bound-store';
import { getProviderLogo } from '../../../utils/provider-logos';
import { CircularCheckbox } from '../../../shared/components';
import styles from '@styles/components/selection.module.css';

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
 * Memoized to prevent unnecessary re-renders in virtualized lists.
 */
export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  isSelected,
  isSelectionMode = false,
  isChecked = false,
  onSelect,
  onDelete,
  staggerIndex = 0,
}: ConversationListItemProps) {
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const isPlaceholder = conversation.id === 'placeholder-new-chat';
  const showCheckbox = isSelectionMode && !isPlaceholder;

  const handleClick = () => {
    if (isSelectionMode && !isPlaceholder) {
      onSelect(conversation.id);
    } else if (!isSelectionMode) {
      onSelect(conversation.id);
    }
  };

  // Determine background color based on selection state (matches FolderSidebar pattern)
  const getBackgroundColor = () => {
    if (isSelectionMode && isChecked) {
      return 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)';
    }
    if (isSelected && !isSelectionMode) {
      return isDarkMode
        ? 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)'
        : 'color-mix(in srgb, var(--color-brand-100) 50%, transparent)';
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
        width: '3px',
        color: 'var(--color-brand-600)',
      };
    }
    return {
      width: '0px',
      color: 'transparent',
    };
  };

  const leftBorder = getLeftBorderStyle();

  return (
    <div
      className={`group px-4 py-1.5 transition-all duration-200 relative ${isSelectionMode && isChecked ? styles.itemHighlight : ''} ${!isSelected && !(isSelectionMode && isChecked) ? 'hover:bg-[var(--surface-hover)]' : ''}`}
      style={{
        backgroundColor: getBackgroundColor(),
        borderLeftWidth: leftBorder.width,
        borderLeftColor: leftBorder.color,
        borderLeftStyle: 'solid',
        cursor: 'pointer',
      }}
      onClick={handleClick}
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

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 relative">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {showCheckbox && (
              <CircularCheckbox
                checked={isChecked}
                onChange={() => { onSelect(conversation.id); }}
                staggerIndex={staggerIndex}
              />
            )}
            <h3
              className="conversation-title text-sm font-normal flex-1 min-w-0 transition-all duration-200 overflow-hidden whitespace-nowrap"
              style={{
                color: 'var(--text-primary)',
                fontWeight: 400,
                textOverflow: 'ellipsis',
              }}
              title={conversation.title}
            >
              {conversation.title}
            </h3>
          </div>

          {/* Delete button - collapses when not hovered */}
          {!isPlaceholder && !isSelectionMode && (
            <div className="w-0 group-hover:w-7 overflow-hidden flex-shrink-0" style={{ transition: 'all var(--chat-duration-fast) var(--chat-ease-out)' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation.id);
                }}
                className="flex items-center justify-center hover:scale-110 active:scale-95 hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]"
                style={{
                  padding: 'var(--chat-space-xs)',
                  borderRadius: 'var(--chat-radius-sm)',
                  color: 'var(--color-error)',
                  backgroundColor: 'transparent',
                  width: '28px',
                  height: '28px',
                  transition: 'all var(--chat-duration-fast) var(--chat-ease-out)',
                }}
                title="Delete conversation"
              >
                <svg
                  style={{ width: 'var(--chat-icon-md)', height: 'var(--chat-icon-md)' }}
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
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span
              className="inline-flex items-center gap-2 px-1.5 py-0.5 rounded text-[10px] font-medium truncate"
              style={{
                backgroundColor: isDarkMode
                  ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                  : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                color: isDarkMode ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                opacity: isDarkMode ? 1 : 0.7,
              }}
            >
              {(() => {
                const logo = getProviderLogo(conversation.provider, isDarkMode);
                return logo ? (
                  <img
                    src={logo}
                    alt={conversation.provider}
                    className="w-2.5 h-2.5 flex-shrink-0 object-contain"
                  />
                ) : null;
              })()}
              {formatModelName(conversation.model)}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
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
});

