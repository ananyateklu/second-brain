// API Response types aligned with backend DTOs

export interface NoteListItem {
  id: string;
  title: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isArchived: boolean;
  folder?: string;
  source?: string;
}

export interface NoteImage {
  id: string;
  noteId: string;
  mediaType: string;
  fileName?: string;
  imageIndex: number;
  description?: string;
  altText?: string;
}

export interface Note extends NoteListItem {
  content: string;
  contentJson?: unknown;
  contentFormat?: 'markdown' | 'html' | 'tiptap_json';
  userId?: string;
  images?: NoteImage[];
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  tags?: string[];
  isArchived?: boolean;
  folder?: string;
  source?: string;
  mcpServerName?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
  isArchived?: boolean;
  folder?: string;
  updateFolder?: boolean;
  source?: string;
  mcpServerName?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

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
  source: string;
  aiProvider?: string;
  aiModel?: string;
  mcpServerName?: string;
  createdAt: string;
}

export interface NoteVersionHistory {
  noteId: string;
  totalVersions: number;
  currentVersion: number;
  versions: NoteVersion[];
}

export interface RestoreVersionResponse {
  message: string;
  newVersionNumber: number;
  noteId: string;
  restoredFromVersion: number;
  changedFields: string[];
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode?: number };
