/**
 * Notes Feature Types - Barrel Export
 */

// Re-export note types from centralized location
export type {
  Note,
  NoteListItem,
  NoteSource,
  CreateNoteRequest as CreateNoteInput,
  UpdateNoteRequest as UpdateNoteInput,
  NoteResponse,
  ImportNoteRequest,
  ImportNoteResult,
  ImportNotesResponse,
  NotesFilterState,
  NoteSearchMode,
} from '../../../types/notes';

export { NoteSourceLabels, getNoteSourceLabel } from '../../../types/notes';

// Re-export NoteCard types
export type {
  NoteCardProps,
  NoteCardBrowseProps,
  NoteCardSearchProps,
  NoteCardDisplayProps,
  NoteCardMode,
  BrowseVariant,
  SearchVariant,
  DisplayVariant,
} from './note-card.types';

export { isBrowseMode, isSearchMode, isDisplayMode } from './note-card.types';
