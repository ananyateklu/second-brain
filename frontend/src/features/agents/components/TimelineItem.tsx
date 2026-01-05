import { ReactNode, memo } from 'react';
import { TimelineStatusIcon } from './TimelineStatusIcon';

// Centralized positioning constants for timeline alignment
const TIMELINE = {
  // Container padding - uses design tokens
  CONTAINER_PADDING: 'pl-12 py-2',
  // Icon positioning (16px icon centered on line)
  ICON_LEFT: 'left-[7px]',
  ICON_TOP: 'top-2.5',
  // Dot positioning (10px dot centered with first line of text)
  DOT_LEFT: 'left-[10px]',
  DOT_TOP: 'top-[26px]',
  DOT_SIZE: 'w-2.5 h-2.5',
} as const;

// Animation class from chat-input.module.css
import styles from '../../../styles/components/chat-input.module.css';

interface TimelineItemProps {
  children: ReactNode;
  /** Whether the item is currently loading/processing */
  isLoading?: boolean;
  /** 'status' shows spinner/checkmark, 'dot' shows simple filled circle */
  variant?: 'status' | 'dot';
  /** Additional classes for the container */
  className?: string;
}

/**
 * Unified timeline item component that handles positioning of icons/dots
 * on the process timeline. Use this to wrap content that should appear
 * in the timeline with proper alignment.
 *
 * @example
 * // For tool executions, thinking steps (shows spinner → checkmark)
 * <TimelineItem isLoading={isExecuting}>
 *   <ToolContent />
 * </TimelineItem>
 *
 * @example
 * // For intermediate text content (shows simple dot)
 * <TimelineItem variant="dot">
 *   <TextContent />
 * </TimelineItem>
 */
export const TimelineItem = memo(function TimelineItem({
  children,
  isLoading = false,
  variant = 'status',
  className = '',
}: TimelineItemProps) {
  return (
    <div
      className={`relative ${TIMELINE.CONTAINER_PADDING} group ${styles.timelineRevealAnimation} ${className}`}
      style={{
        animationFillMode: 'backwards',
      }}
    >
      {/* Timeline marker */}
      {variant === 'status' ? (
        <div className={`absolute ${TIMELINE.ICON_LEFT} ${TIMELINE.ICON_TOP}`}>
          <TimelineStatusIcon isLoading={isLoading} />
        </div>
      ) : (
        <div
          className={`absolute ${TIMELINE.DOT_LEFT} ${TIMELINE.DOT_TOP} ${TIMELINE.DOT_SIZE} rounded-full`}
          style={{
            backgroundColor: isLoading ? 'var(--chat-timeline-dot-pending)' : 'var(--chat-timeline-dot)',
            transition: 'background-color var(--chat-duration-normal) var(--chat-ease-out)',
          }}
        />
      )}
      {/* Content */}
      {children}
    </div>
  );
});

// Export constants for use in ProcessTimeline
export { TIMELINE };
