/**
 * Types for Context Usage Indicator components.
 */

import type { ContextUsageState } from '../../../types/context-usage';

/**
 * Color scheme for context usage display based on warning level.
 */
export interface ContextUsageColors {
  bar: string;
  barGlow: string;
  text: string;
  border: string;
  bg: string;
  icon: string;
}

/**
 * Props for the main ContextUsageIndicator component.
 */
export interface ContextUsageIndicatorProps {
  /** Context usage state from useContextUsage hook */
  contextUsage: ContextUsageState;
  /** Whether the indicator is in compact mode */
  compact?: boolean;
  /** Whether currently streaming (shows pulsing animation) */
  isStreaming?: boolean;
}

/**
 * Props for the ContextBreakdownItem component.
 */
export interface ContextBreakdownItemProps {
  /** Display label for the category */
  label: string;
  /** Token count for this category */
  value: number;
  /** Maximum tokens available */
  maxTokens: number;
  /** Icon component to display */
  icon: React.ComponentType<{ className?: string }>;
  /** Color scheme based on warning level */
  colors: ContextUsageColors;
}

/**
 * Props for the ContextProgressBar component.
 */
export interface ContextProgressBarProps {
  /** Percentage of context used (0-100) */
  percentUsed: number;
  /** Color scheme based on warning level */
  colors: ContextUsageColors;
  /** Whether currently streaming (shows glow effect) */
  isStreaming?: boolean;
  /** Whether to show shimmer animation */
  showShimmer?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Height variant */
  variant?: 'small' | 'medium';
}

/**
 * Breakdown item data for the list.
 */
export interface BreakdownItemData {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}
