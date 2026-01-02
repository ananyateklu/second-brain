/**
 * VoiceSessionItem Component
 * Individual voice session item for the sidebar list
 */

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { MicrophoneIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';
import type { VoiceSessionSummary } from '../types/voice-types';
import styles from '@styles/components/selection.module.css';

/**
 * Circular checkbox component matching ChatSidebar style
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

export function VoiceSessionItem({
  session,
  isSelected,
  isCurrentSession,
  isSelectionMode = false,
  isChecked = false,
  staggerIndex = 0,
  onSelect,
  onDelete,
}: VoiceSessionItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const showCheckbox = isSelectionMode;

  // Format timestamp
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

  // Format duration
  const formattedDuration = useMemo(() => {
    const totalSeconds = Math.floor(session.totalAudioDurationMs / 1000);
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }, [session.totalAudioDurationMs]);

  // Get provider icon/color
  const providerStyle = useMemo(() => {
    const provider = session.provider.toLowerCase();
    if (provider.includes('grok') || provider.includes('xai')) {
      return {
        bg: 'color-mix(in srgb, var(--color-xai, #6366f1) 20%, transparent)',
        color: 'var(--color-xai, #818cf8)',
      };
    }
    if (provider.includes('openai')) {
      return {
        bg: 'color-mix(in srgb, var(--color-openai, #10a37f) 20%, transparent)',
        color: 'var(--color-openai, #10a37f)',
      };
    }
    if (provider.includes('anthropic') || provider.includes('claude')) {
      return {
        bg: 'color-mix(in srgb, var(--color-anthropic, #d4a574) 20%, transparent)',
        color: 'var(--color-anthropic, #d4a574)',
      };
    }
    if (provider.includes('gemini') || provider.includes('google')) {
      return {
        bg: 'color-mix(in srgb, var(--color-gemini, #4285f4) 20%, transparent)',
        color: 'var(--color-gemini, #4285f4)',
      };
    }
    return {
      bg: 'color-mix(in srgb, var(--color-brand-500) 20%, transparent)',
      color: 'var(--color-brand-400)',
    };
  }, [session.provider]);

  // Close delete confirm when clicking outside
  useEffect(() => {
    if (!showDeleteConfirm) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (deleteButtonRef.current && !deleteButtonRef.current.contains(e.target as Node)) {
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeleteConfirm]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  // Determine background color based on selection state
  const getBackgroundColor = () => {
    if (isSelectionMode && isChecked) {
      return 'color-mix(in srgb, var(--surface-card) 40%, transparent)';
    }
    if (isSelected && !isSelectionMode) {
      return 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)';
    }
    return 'transparent';
  };

  // Determine left border styling
  const getLeftBorderStyle = () => {
    if (isSelectionMode && isChecked) {
      return { width: '3px', color: 'var(--color-brand-500)' };
    }
    if (isSelected && !isSelectionMode) {
      return { width: '4px', color: 'var(--btn-primary-bg)' };
    }
    return { width: '0.25px', color: 'color-mix(in srgb, var(--border) 50%, transparent)' };
  };

  const leftBorder = getLeftBorderStyle();

  return (
    <div
      onClick={onSelect}
      className={`
        group relative flex items-start gap-3 px-4 py-3 cursor-pointer
        transition-all duration-150 hover:scale-[1.01]
        ${isSelectionMode && isChecked ? styles.itemHighlight : ''}
        ${!isSelected && !(isSelectionMode && isChecked) ? 'hover:bg-[color-mix(in_srgb,var(--surface-card)_50%,transparent)]' : ''}
      `}
      style={{
        backgroundColor: getBackgroundColor(),
        borderLeftWidth: leftBorder.width,
        borderLeftColor: leftBorder.color,
        borderTopWidth: '0.1px',
        borderTopColor: 'color-mix(in srgb, var(--border) 30%, transparent)',
        borderRightWidth: '0.1px',
        borderRightColor: 'color-mix(in srgb, var(--border) 80%, transparent)',
        borderBottomWidth: '0.1px',
        borderBottomColor: 'color-mix(in srgb, var(--border) 30%, transparent)',
      }}
    >
      {/* Hover indicator - faded green bar on the left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-40 transition-opacity duration-200"
        style={{ backgroundColor: 'var(--color-brand-500)' }}
      />

      {/* Checkbox (in selection mode) */}
      {showCheckbox && (
        <div className="flex items-center self-center">
          <CircularCheckbox
            checked={isChecked}
            onChange={onSelect}
            staggerIndex={staggerIndex}
          />
        </div>
      )}

      {/* Provider Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: providerStyle.bg,
        }}
      >
        <MicrophoneIcon className="w-5 h-5" style={{ color: providerStyle.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Preview text */}
        <p
          className="text-sm font-medium truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {session.firstUserMessage || 'Voice Session'}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-2 mt-1">
          {/* Provider */}
          <span
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {session.provider}
          </span>

          <span style={{ color: 'var(--text-tertiary)' }}>·</span>

          {/* Turn count */}
          <span
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {session.turnCount} turns
          </span>

          <span style={{ color: 'var(--text-tertiary)' }}>·</span>

          {/* Duration */}
          <span
            className="text-xs flex items-center gap-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <ClockIcon className="w-3 h-3" />
            {formattedDuration}
          </span>
        </div>

        {/* Time */}
        <p
          className="text-xs mt-1"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {formattedTime}
        </p>
      </div>

      {/* Status indicator (for active sessions) */}
      {isCurrentSession && (
        <div
          className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: 'var(--color-green-500)' }}
          title="Active session"
        />
      )}

      {/* Delete button (show on hover, hidden in selection mode) */}
      {!isCurrentSession && !isSelectionMode && (
        <button
          ref={deleteButtonRef}
          onClick={handleDelete}
          className={`
            absolute top-2 right-2 p-1.5 rounded-lg transition-all duration-200
            opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95
          `}
          style={{
            backgroundColor: showDeleteConfirm ? 'var(--color-red-500)' : 'var(--surface-elevated)',
            color: showDeleteConfirm ? 'white' : 'var(--text-secondary)',
          }}
          title={showDeleteConfirm ? 'Click again to confirm' : 'Delete session'}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
