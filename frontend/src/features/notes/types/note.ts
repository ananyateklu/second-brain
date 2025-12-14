/**
 * Note Types - Re-export from centralized types
 * @deprecated Import from '../../../types/notes' or '../../../types' instead
 */

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
