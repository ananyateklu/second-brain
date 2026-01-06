/**
 * NoteCard Props - Discriminated Union Types
 *
 * This module defines type-safe props for the NoteCard component using
 * discriminated unions to enforce valid prop combinations at compile time.
 *
 * Three modes:
 * - browse: Standard note browsing with optional bulk selection (default)
 * - search: RAG/search results with relevance scoring
 * - display: Simple read-only display for embedded contexts
 */

import type { Note, NoteListItem } from './note';

// ============================================
// Base Props (shared across all modes)
// ============================================

interface NoteCardBaseProps {
  /** Note data - can be NoteListItem (summary only) or full Note (with content) */
  note: Note | NoteListItem;
  /** Index for staggered animation */
  index?: number;
}

// ============================================
// Mode 1: Browse (default)
// ============================================

/**
 * Browse mode - Standard note browsing with optional bulk selection
 * Used in: NoteList, VirtualizedNoteList
 */
export interface NoteCardBrowseProps extends NoteCardBaseProps {
  /** Mode discriminator - defaults to 'browse' when omitted */
  mode?: 'browse';
  /** Visual variant - full or compact for browse mode */
  variant?: 'full' | 'compact';
  /** Whether bulk selection mode is active */
  isBulkMode?: boolean;
  /** Whether this card is selected in bulk mode */
  isSelected?: boolean;
  /** Callback when card is selected in bulk mode */
  onSelect?: (noteId: string) => void;
}

// ============================================
// Mode 2: Search
// ============================================

/**
 * Search mode - RAG/search results with relevance scoring
 * Used in: RetrievedNotesCard, ToolExecutionCard, RetrievedContextCard
 */
export interface NoteCardSearchProps extends NoteCardBaseProps {
  /** Mode discriminator - required for search mode */
  mode: 'search';
  /** Visual variant - typically micro for search results */
  variant?: 'micro' | 'compact';
  /** Relevance/similarity score (0-1) - required for search mode */
  relevanceScore: number;
  /** Index of the matched chunk within the note */
  chunkIndex?: number;
  /** Total number of chunks for this note */
  chunkCount?: number;
  /** Content of the matched chunk */
  chunkContent?: string;
  /** Override content to display */
  content?: string;
  /** Override created date */
  createdOn?: string | null;
}

// ============================================
// Mode 3: Display
// ============================================

/**
 * Display mode - Simple read-only display for embedded contexts
 * Used in: ToolExecutionCard (single note results)
 */
export interface NoteCardDisplayProps extends NoteCardBaseProps {
  /** Mode discriminator - required for display mode */
  mode: 'display';
  /** Visual variant - typically micro for embedded display */
  variant?: 'micro' | 'compact';
  /** Override content to display */
  content?: string;
  /** Override created date */
  createdOn?: string | null;
}

// ============================================
// Discriminated Union
// ============================================

/**
 * NoteCard props - discriminated union of all modes
 *
 * Usage examples:
 * ```tsx
 * // Browse mode (default)
 * <NoteCard note={note} />
 * <NoteCard note={note} isBulkMode isSelected onSelect={handleSelect} />
 *
 * // Search mode
 * <NoteCard note={note} mode="search" relevanceScore={0.85} />
 *
 * // Display mode
 * <NoteCard note={note} mode="display" variant="micro" />
 * ```
 */
export type NoteCardProps =
  | NoteCardBrowseProps
  | NoteCardSearchProps
  | NoteCardDisplayProps;

// ============================================
// Type Guards
// ============================================

/**
 * Type guard to check if props are for browse mode
 */
export function isBrowseMode(props: NoteCardProps): props is NoteCardBrowseProps {
  return props.mode === undefined || props.mode === 'browse';
}

/**
 * Type guard to check if props are for search mode
 */
export function isSearchMode(props: NoteCardProps): props is NoteCardSearchProps {
  return props.mode === 'search';
}

/**
 * Type guard to check if props are for display mode
 */
export function isDisplayMode(props: NoteCardProps): props is NoteCardDisplayProps {
  return props.mode === 'display';
}

// ============================================
// Helper Types
// ============================================

/** Valid mode values */
export type NoteCardMode = 'browse' | 'search' | 'display';

/** Valid variant values by mode */
export type BrowseVariant = 'full' | 'compact';
export type SearchVariant = 'micro' | 'compact';
export type DisplayVariant = 'micro' | 'compact';
