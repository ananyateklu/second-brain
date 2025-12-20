/**
 * Shared voice utility functions
 * Consolidates duplicate functions from VoiceStatusIndicator and voice-slice
 */

import type { VoiceSessionState } from '../types/voice-types';

// ============================================
// State Normalization
// ============================================

// Map numeric state values to string state names (backend sends numbers)
const numericToStringState: Record<number, VoiceSessionState> = {
  0: 'Idle',
  1: 'Listening',
  2: 'Processing',
  3: 'Speaking',
  4: 'Interrupted',
  5: 'Ended',
};

/**
 * Normalize voice session state from number or string to VoiceSessionState
 * Backend may send numeric values, so we need to convert them
 */
export function normalizeState(state: VoiceSessionState | number): VoiceSessionState {
  if (typeof state === 'number') {
    return numericToStringState[state] ?? 'Idle';
  }
  return state;
}

// ============================================
// Tool Icons
// ============================================

/**
 * Get user-friendly tool label from tool name
 */
export function getToolLabel(toolName: string): string {
  switch (toolName) {
    case 'CreateNote':
      return 'Creating note';
    case 'SearchNotes':
      return 'Searching notes';
    case 'SemanticSearch':
      return 'Semantic search';
    case 'UpdateNote':
      return 'Updating note';
    case 'GetNote':
      return 'Reading note';
    case 'ListRecentNotes':
      return 'Listing notes';
    case 'GetNoteStats':
      return 'Getting stats';
    case 'DeleteNote':
      return 'Deleting note';
    case 'ArchiveNote':
      return 'Archiving note';
    case 'LiveSearch':
      return 'Searching web';
    case 'DeepSearch':
      return 'Deep searching';
    default:
      return toolName;
  }
}

/**
 * Get past-tense tool label for completed tool executions
 */
export function getToolLabelPastTense(toolName: string): string {
  switch (toolName) {
    case 'CreateNote':
      return 'Created Note';
    case 'SearchNotes':
      return 'Searched Notes';
    case 'SemanticSearch':
      return 'Semantic Search';
    case 'UpdateNote':
      return 'Updated Note';
    case 'GetNote':
      return 'Retrieved Note';
    case 'ListRecentNotes':
      return 'Listed Notes';
    case 'GetNoteStats':
      return 'Note Statistics';
    case 'DeleteNote':
      return 'Deleted Note';
    case 'ArchiveNote':
      return 'Archived Note';
    case 'LiveSearch':
      return 'Web Search';
    case 'DeepSearch':
      return 'Deep Search';
    default:
      return toolName;
  }
}

// ============================================
// Tool Icon Paths (SVG path data)
// ============================================

export interface ToolIconPath {
  d: string;
  d2?: string; // Optional second path for icons with multiple paths
}

/**
 * Get SVG path data for tool icon
 * Returns path data to be used in an SVG element
 */
export function getToolIconPath(toolName: string): ToolIconPath {
  switch (toolName) {
    case 'CreateNote':
      return { d: 'M12 4v16m8-8H4' };
    case 'SearchNotes':
    case 'SemanticSearch':
      return { d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' };
    case 'UpdateNote':
      return {
        d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      };
    case 'GetNote':
    case 'ListRecentNotes':
      return {
        d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      };
    case 'GetNoteStats':
      return {
        d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      };
    case 'DeleteNote':
      return {
        d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      };
    case 'ArchiveNote':
      return {
        d: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
      };
    case 'LiveSearch':
    case 'DeepSearch':
      return {
        d: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
      };
    default:
      // Settings/gear icon
      return {
        d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        d2: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      };
  }
}
