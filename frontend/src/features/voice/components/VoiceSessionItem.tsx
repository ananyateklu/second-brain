/**
 * VoiceSessionItem Component
 * Individual voice session item for the sidebar list
 * Styled to match ConversationListItem from chat
 */

import { memo, useMemo } from 'react';
import type { VoiceSessionSummary } from '../types/voice-types';
import { formatModelName } from '../../../utils/model-name-formatter';
import { useBoundStore } from '../../../store/bound-store';
import { getProviderLogo } from '../../../utils/provider-logos';
import { CircularCheckbox } from '../../../shared/components';
import styles from '@styles/components/selection.module.css';

interface VoiceSessionItemProps {
  session: VoiceSessionSummary;
  isSelected: boolean;
  isCurrentSession: boolean;
  isSelectionMode?: boolean;
  isChecked?: boolean;
  staggerIndex?: number;
  onSelect: () => void;
  onDelete: () => void;
}

export const VoiceSessionItem = memo(function VoiceSessionItem({
  session,
  isSelected,
  isCurrentSession,
  isSelectionMode = false,
  isChecked = false,
  staggerIndex = 0,
  onSelect,
  onDelete,
}: VoiceSessionItemProps) {
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const showCheckbox = isSelectionMode;

  // Format timestamp (matches chat's formatConversationDate style)
  const formattedTime = useMemo(() => {
    const date = new Date(session.startedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return mins <= 0 ? 'Just now' : `${mins}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    }
    if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, [session.startedAt]);

  const handleClick = () => {
    onSelect();
  };

  // Determine background color based on selection state (matches ConversationListItem exactly)
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

  // Determine left border styling (matches ConversationListItem exactly)
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

  // Get display title
  const displayTitle = session.firstUserMessage || 'Voice Session';

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
      <div
        className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-40 transition-opacity duration-200"
        style={{
          backgroundColor: 'var(--color-brand-500)',
        }}
      />

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 relative">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {showCheckbox && (
              <CircularCheckbox
                checked={isChecked}
                onChange={onSelect}
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
              title={displayTitle}
            >
              {displayTitle}
            </h3>

            {/* Active session indicator */}
            {isCurrentSession && (
              <div
                className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                style={{ backgroundColor: 'var(--color-success)' }}
                title="Active session"
              />
            )}
          </div>

          {/* Delete button - collapses when not hovered (matches chat) */}
          {!isCurrentSession && !isSelectionMode && (
            <div className="w-0 group-hover:w-7 overflow-hidden flex-shrink-0" style={{ transition: `all var(--chat-duration-fast) var(--chat-ease-out)` }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center justify-center hover:scale-110 active:scale-95 hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]"
                style={{
                  padding: 'var(--chat-space-xs)',
                  borderRadius: 'var(--chat-radius-sm)',
                  color: 'var(--color-error)',
                  backgroundColor: 'transparent',
                  width: '28px',
                  height: '28px',
                  transition: `all var(--chat-duration-fast) var(--chat-ease-out)`,
                }}
                title="Delete session"
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
                const logo = getProviderLogo(session.provider, isDarkMode);
                return logo ? (
                  <img
                    src={logo}
                    alt={session.provider}
                    className="w-2.5 h-2.5 flex-shrink-0 object-contain"
                  />
                ) : null;
              })()}
              {formatModelName(session.model)}
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
              {formattedTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
