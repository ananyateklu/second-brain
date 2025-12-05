/**
 * Notes Types
 * Aligned with backend Note DTOs
 */

/**
 * Note entity (aligned with backend NoteResponse)
 */
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isArchived: boolean;
  userId?: string;
  source?: string;
  externalId?: string;
  folder?: string;
}

/**
 * Create note request (aligned with backend CreateNoteRequest)
 */
export interface CreateNoteRequest {
  title: string;
  content: string;
  tags: string[];
  isArchived: boolean;
  folder?: string;
}

/**
 * Update note request (aligned with backend UpdateNoteRequest)
 * All properties are optional - only provided fields will be updated.
 */
export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
  isArchived?: boolean;
  folder?: string;
  /** Set to true to explicitly update folder (required to clear folder with null/undefined) */
  updateFolder?: boolean;
}

/**
 * Note response from API (same as Note, explicit for clarity)
 */
export type NoteResponse = Note;

/**
 * Import note request for bulk imports
 */
export interface ImportNoteRequest {
  title: string;
  content: string;
  tags: string[];
  folder?: string;
  externalId?: string;
  createdAt?: string;
  modifiedAt?: string;
}

/**
 * Import result for a single note
 */
export interface ImportNoteResult {
  success: boolean;
  noteId?: string;
  error?: string;
  externalId?: string;
}

/**
 * Bulk import response
 */
export interface ImportNotesResponse {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: ImportNoteResult[];
}

/**
 * Note filter state for UI
 */
export interface NotesFilterState {
  dateFilter: string;
  selectedTags: string[];
  sortBy: 'newest' | 'oldest' | 'title-asc' | 'title-desc';
  archiveFilter: 'all' | 'active' | 'archived';
  customDateStart?: string;
  customDateEnd?: string;
}

/**
 * Note search mode
 */
export type NoteSearchMode = 'title' | 'content' | 'both';

// ============================================
// Note Version History Types (PostgreSQL 18 Temporal Features)
// ============================================

/**
 * A single version of a note (aligned with backend NoteVersionResponse)
 */
export interface NoteVersion {
  noteId: string;
  versionNumber: number;
  isCurrent: boolean;
  validFrom: string;
  validTo: string | null;
  title: string;
  content: string;
  tags: string[];
  isArchived: boolean;
  folder: string | null;
  modifiedBy: string;
  changeSummary: string | null;
  createdAt: string;
}

/**
 * Note version history response (aligned with backend NoteVersionHistoryResponse)
 */
export interface NoteVersionHistory {
  noteId: string;
  totalVersions: number;
  currentVersion: number;
  versions: NoteVersion[];
}

/**
 * Note version diff comparison (aligned with backend NoteVersionDiffResponse)
 */
export interface NoteVersionDiff {
  noteId: string;
  fromVersion: NoteVersion;
  toVersion: NoteVersion;
  titleChanged: boolean;
  contentChanged: boolean;
  tagsChanged: boolean;
  archivedChanged: boolean;
  folderChanged: boolean;
  tagsAdded: string[];
  tagsRemoved: string[];
}

/**
 * Request to restore a note to a previous version
 */
export interface RestoreVersionRequest {
  targetVersion: number;
}

/**
 * Response from restoring a note version
 */
export interface RestoreVersionResponse {
  message: string;
  newVersionNumber: number;
  noteId: string;
}
