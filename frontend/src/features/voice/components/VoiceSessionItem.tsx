/**
 * VoiceSessionItem Component
 * Individual voice session item for the sidebar list
 * Styled to match ConversationListItem from chat
 */

import { useState, useRef, useCallback, useEffect, memo, useMemo } from 'react';
import type { VoiceSessionSummary } from '../types/voice-types';
import { formatModelName } from '../../../utils/model-name-formatter';
import { useBoundStore } from '../../../store/bound-store';
import { getProviderLogo } from '../../../utils/provider-logos';
import styles from '@styles/components/selection.module.css';

/**
 * Custom circular checkbox component with animations (matches chat)
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
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }
    setIsAnimating(true);
    animationTimerRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 250);
    onChange();
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
      className={`${styles.checkbox} flex-shrink-0 relative w-5 h-5 rounded-full cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
      style={{
        '--stagger-index': staggerIndex,
        backgroundColor: checked ? 'var(--btn-primary-bg)' : 'transparent',
        border: checked
          ? '2px solid var(--btn-primary-bg)'
          : '2px solid var(--text-tertiary)',
        focusVisibleRingColor: 'var(--btn-primary-bg)',
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--color-brand-400)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--text-tertiary)';
        }
      }}
    >
      <svg
        className={`absolute inset-0 w-full h-full p-1 ${styles.checkboxInner} ${isAnimating ? (checked ? styles.checkboxInnerChecked : styles.checkboxInnerUnchecked) : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          opacity: checked ? 1 : 0,
          transform: checked ? 'scale(1)' : 'scale(0.5)',
          transition: 'opacity 0.15s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <path
          className={styles.checkmark}
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
      className={`group px-4 py-2.5 transition-all duration-200 relative ${isSelectionMode && isChecked ? styles.itemHighlight : ''} ${!isSelected && !(isSelectionMode && isChecked) ? 'hover:bg-[var(--surface-hover)]' : ''}`}
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
            <div className="w-0 group-hover:w-7 overflow-hidden transition-all duration-150 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95 hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]"
                style={{
                  color: 'var(--color-error)',
                  backgroundColor: 'transparent',
                  width: '28px',
                  height: '28px',
                }}
                title="Delete session"
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
