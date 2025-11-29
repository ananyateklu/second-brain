/**
 * Note Types - Re-export from centralized types
 * @deprecated Import from '../../../types/notes' or '../../../types' instead
 */

export type {
  Note,
  CreateNoteRequest as CreateNoteInput,
  UpdateNoteRequest as UpdateNoteInput,
  NoteResponse,
  ImportNoteRequest,
  ImportNoteResult,
  ImportNotesResponse,
  NotesFilterState,
  NoteSearchMode,
} from '../../../types/notes';
