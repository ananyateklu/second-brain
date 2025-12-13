/**
 * Notes Types
 * Aligned with backend Note DTOs
 */

/**
 * Lightweight note item for list views (aligned with backend NoteListResponse).
 * Contains summary instead of full content for better performance.
 */
export interface NoteListItem {
  id: string;
  title: string;
  /** AI-generated summary of the note (title, tags, content) for list views */
  summary?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isArchived: boolean;
  folder?: string;
  source?: string;
}

/**
 * Image attached to a note for multi-modal RAG support.
 * Aligned with backend NoteImageResponse.
 */
export interface NoteImage {
  id: string;
  noteId: string;
  /** Base64-encoded image data */
  base64Data: string;
  /** MIME type of the image (e.g., 'image/jpeg') */
  mediaType: string;
  /** Original filename */
  fileName?: string;
  /** Position/order of the image within the note */
  imageIndex: number;
  /** AI-generated description for RAG indexing */
  description?: string;
  /** User-provided alternative text */
  altText?: string;
  /** Provider used to generate the description */
  descriptionProvider?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full note entity with content (aligned with backend NoteResponse).
 * Used for get-by-id endpoint where full content is needed.
 */
export interface Note extends NoteListItem {
  content: string;
  userId?: string;
  externalId?: string;
  /** Images attached to this note for multi-modal RAG */
  images?: NoteImage[];
}

/**
 * Image input for creating/updating notes.
 * Aligned with backend NoteImageDto.
 */
export interface NoteImageInput {
  /** Optional ID for existing images (used when updating) */
  id?: string;
  /** Base64-encoded image data (without data URL prefix) */
  base64Data: string;
  /** MIME type of the image */
  mediaType: string;
  /** Original filename */
  fileName?: string;
  /** User-provided alternative text */
  altText?: string;
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
  /** Images to attach to the note */
  images?: NoteImageInput[];
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
  /** New images to add to the note */
  images?: NoteImageInput[];
  /** IDs of images to delete from the note */
  deletedImageIds?: string[];
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

// ============================================
// Note Summary Generation Types
// ============================================

/**
 * Request to generate AI summaries for notes
 */
export interface GenerateSummariesRequest {
  /** Note IDs to generate summaries for. If empty, generates for all notes without summaries. */
  noteIds: string[];
}

/**
 * Response from generating AI summaries
 */
export interface GenerateSummariesResponse {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  results: SummaryGenerationResult[];
}

/**
 * Result of generating a summary for a single note
 */
export interface SummaryGenerationResult {
  noteId: string;
  title: string;
  success: boolean;
  summary?: string;
  error?: string;
  skipped: boolean;
}

// ============================================
// Background Summary Generation Job Types
// ============================================

/**
 * Response from a background summary generation job
 */
export interface SummaryJobResponse {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalNotes: number;
  processedNotes: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: string[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  progressPercentage: number;
}
