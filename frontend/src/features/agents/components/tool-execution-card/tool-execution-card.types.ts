/**
 * Tool Execution Card Types
 * Type definitions for tool execution results parsing
 */

// Stats response types
export interface TagCount {
  name: string;
  count: number;
}

export interface FolderCount {
  name: string;
  count: number;
}

export interface NoteStatistics {
  totalNotes: number;
  activeNotes: number;
  archivedNotes: number;
  notesCreatedThisWeek: number;
  notesCreatedThisMonth: number;
  // These fields are only present in 'overview' type (type='all')
  notesWithTags?: number;
  notesInFolders?: number;
  uniqueTagCount?: number;
  uniqueFolderCount?: number;
  topTags?: TagCount[];
  topFolders?: FolderCount[];
}

export interface StatsResponse {
  type: 'stats' | 'overview';
  message: string;
  statistics: NoteStatistics;
}

// Single note response type
export interface SingleNoteResponse {
  type: 'note';
  message: string;
  note: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    isArchived?: boolean;
    folder?: string;
  };
}

// Generic success/error response
export interface GenericResponse {
  type: string;
  message: string;
  [key: string]: unknown;
}

// Images response from ViewNoteImages tool (URL-based, no base64)
export interface ImageInfo {
  id: string;
  url: string;  // URL to fetch image from API endpoint
  mediaType: string;
  fileName?: string;
  imageIndex: number;
  description?: string;
  altText?: string;
}

export interface ImagesResponse {
  type: 'images';
  message: string;
  noteId: string;
  noteTitle: string;
  imageCount: number;
  images: ImageInfo[];
}
