/**
 * Focus/Productivity Types
 * Types for the focus dashboard feature
 */

// ============================================
// Core Types
// ============================================

/**
 * Priority levels for focus items
 * P1 = High (urgent/important)
 * P2 = Medium (important but not urgent)
 * P3 = Low (nice to have)
 */
export type FocusPriority = 1 | 2 | 3;

/**
 * Status of a focus item
 */
export type FocusItemStatus = 'pending' | 'in_progress' | 'completed' | 'deferred';

/**
 * Linked note info for focus items
 */
export interface FocusItemNoteInfo {
  id: string;
  title: string;
  tags: string[];
}

/**
 * Focus item response from API
 */
export interface FocusItem {
  id: string;
  userId: string;
  noteId: string | null;
  title: string;
  description: string | null;
  isCurrentFocus: boolean;
  priority: FocusPriority;
  status: FocusItemStatus;
  scheduledDate: string | null; // ISO date string (YYYY-MM-DD)
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  completedAt: string | null; // ISO datetime
  deferredTo: string | null; // ISO date string
  aiSuggested: boolean;
  aiSuggestionReason: string | null;
  aiConfidence: number | null;
  sortOrder: number;
  /** When this item became the current focus (ISO datetime). Used for time tracking. */
  focusStartedAt: string | null;
  /** Accumulated time in minutes from previous focus sessions */
  accumulatedMinutes: number;
  createdAt: string;
  updatedAt: string;
  linkedNote: FocusItemNoteInfo | null;
}

// ============================================
// API Response Types
// ============================================

/**
 * Today's plan response
 */
export interface TodaysPlanResponse {
  date: string; // ISO date string
  currentFocus: FocusItem | null;
  scheduledItems: FocusItem[];
  completedTodayCount: number;
  totalEstimatedMinutes: number;
  statusCounts: Record<string, number>;
}

/**
 * Backlog response
 */
export interface BacklogResponse {
  items: FocusItem[];
  totalCount: number;
  countByPriority: Record<number, number>;
}

/**
 * Completed items response
 */
export interface CompletedItemsResponse {
  startDate: string;
  endDate: string;
  items: FocusItem[];
  totalCount: number;
  totalActualMinutes: number;
}

// ============================================
// Request Types
// ============================================

/**
 * Create focus item request
 */
export interface CreateFocusItemRequest {
  title: string;
  description?: string;
  noteId?: string;
  priority?: FocusPriority;
  scheduledDate?: string; // YYYY-MM-DD
  estimatedMinutes?: number;
}

/**
 * Update focus item request
 */
export interface UpdateFocusItemRequest {
  title?: string;
  description?: string;
  /** Flag to explicitly indicate description should be updated (to distinguish null from "clear description") */
  updateDescription?: boolean;
  priority?: FocusPriority;
  scheduledDate?: string | null;
  /** Flag to explicitly indicate scheduled date should be updated (to distinguish null from "clear date") */
  updateScheduledDate?: boolean;
  estimatedMinutes?: number | null;
  /** Flag to explicitly indicate estimated minutes should be updated (to distinguish null from "clear estimate") */
  updateEstimatedMinutes?: boolean;
  isCurrentFocus?: boolean;
  status?: FocusItemStatus;
}

/**
 * Defer focus item request
 */
export interface DeferFocusItemRequest {
  deferToDate: string; // YYYY-MM-DD
}

/**
 * Reorder item
 */
export interface FocusItemSortOrder {
  id: string;
  sortOrder: number;
}

/**
 * Reorder focus items request
 */
export interface ReorderFocusItemsRequest {
  items: FocusItemSortOrder[];
}

/**
 * Create focus item from note request
 */
export interface CreateFocusFromNoteRequest {
  title?: string;
  description?: string;
  priority?: FocusPriority;
  scheduledDate?: string;
  estimatedMinutes?: number;
}

// ============================================
// UI State Types
// ============================================

/**
 * Quick capture form state
 */
export interface QuickCaptureFormState {
  title: string;
  priority: FocusPriority;
  scheduleForToday: boolean;
  estimatedMinutes?: number;
}

/**
 * Focus view mode
 */
export type FocusViewMode = 'timeline' | 'kanban';

/**
 * Priority display info
 */
export interface PriorityInfo {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ============================================
// Constants
// ============================================

export const PRIORITY_INFO: Record<FocusPriority, PriorityInfo> = {
  1: {
    label: 'High Priority',
    shortLabel: 'P1',
    color: 'var(--color-error)',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  2: {
    label: 'Medium Priority',
    shortLabel: 'P2',
    color: 'var(--color-warning)',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  3: {
    label: 'Low Priority',
    shortLabel: 'P3',
    color: 'var(--color-primary)',
    bgColor: 'rgba(54, 105, 61, 0.1)',
    borderColor: 'rgba(54, 105, 61, 0.3)',
  },
};

export const STATUS_LABELS: Record<FocusItemStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  deferred: 'Deferred',
};

// ============================================
// AI Response Types
// ============================================

/**
 * AI-generated focus suggestion item
 */
export interface FocusSuggestionItem {
  title: string;
  description: string | null;
  priority: FocusPriority;
  estimatedMinutes: number | null;
  reason: string;
  sourceNoteId: string | null;
  sourceNoteTitle: string | null;
  confidence: number;
}

/**
 * Response from AI focus suggestions endpoint
 */
export interface FocusSuggestionsResponse {
  suggestions: FocusSuggestionItem[];
  context: string | null;
  generatedAt: string;
}

/**
 * Completion statistics for progress summary
 */
export interface CompletionStats {
  totalCompleted: number;
  totalMinutesTracked: number;
  completedByPriority: Record<number, number>;
  streakDays: number;
}

/**
 * Response from AI progress summary endpoint
 */
export interface ProgressSummaryResponse {
  period: string;
  startDate: string;
  endDate: string;
  stats: CompletionStats;
  summary: string;
  highlights: string[];
  encouragement: string | null;
  generatedAt: string;
}

/**
 * Period options for progress summary
 */
export type SummaryPeriod = 'today' | 'week';

// ============================================
// Persisted AI Suggestions Types
// ============================================

/**
 * Persisted AI focus suggestion (stored in database)
 */
export interface PersistedFocusSuggestion {
  id: string;
  title: string;
  description: string | null;
  priority: FocusPriority;
  estimatedMinutes: number | null;
  reason: string;
  confidence: number;
  sourceNoteId: string | null;
  sourceNoteTitle: string | null;
  isAccepted: boolean;
  acceptedFocusItemId: string | null;
  createdAt: string;
}

/**
 * Response from generate suggestions endpoint with deduplication stats
 */
export interface GenerateSuggestionsResponse {
  allSuggestions: PersistedFocusSuggestion[];
  newSuggestionsAdded: number;
  duplicatesSkipped: number;
  context: string;
  generatedAt: string;
}

/**
 * Request to accept a suggestion (mark as converted to FocusItem)
 */
export interface AcceptSuggestionRequest {
  focusItemId: string;
}

/**
 * Request to generate new suggestions
 */
export interface GenerateSuggestionsRequest {
  currentFocusTitle?: string;
}
