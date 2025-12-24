/**
 * Types for the Summary Notification component.
 */

import type { SummaryJobResponse } from '../../../store/slices/summary-slice';

/**
 * Common icon props for SVG icons.
 */
export interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Status type derived from SummaryJobResponse.
 */
export type SummaryStatus = SummaryJobResponse['status'];

/**
 * Props for the SummaryProgress component.
 */
export interface SummaryProgressProps {
  processedNotes: number;
  totalNotes: number;
  progress: number;
  isCancelling: boolean;
  onStopGeneration: () => void;
}

/**
 * Props for the SummaryStatusDisplay component.
 */
export interface SummaryStatusDisplayProps {
  status: SummaryJobResponse;
  statusType: SummaryStatus;
}

/**
 * Props for the notification header.
 */
export interface SummaryHeaderProps {
  isGenerating: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  isFailed: boolean;
  onDismiss: () => void;
}

/**
 * Props for the notification card wrapper.
 */
export interface SummaryCardProps {
  isCompleted: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  isGenerating: boolean;
  children: React.ReactNode;
}
