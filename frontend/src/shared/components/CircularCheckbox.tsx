/**
 * CircularCheckbox Component
 *
 * Animated circular checkbox used in selection mode for lists.
 * Extracted from VoiceSessionItem and ConversationListItem to avoid duplication.
 */

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import styles from '@styles/components/selection.module.css';

interface CircularCheckboxProps {
  checked: boolean;
  onChange: () => void;
  staggerIndex?: number;
}

export const CircularCheckbox = memo(function CircularCheckbox({
  checked,
  onChange,
  staggerIndex = 0,
}: CircularCheckboxProps) {
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
});
