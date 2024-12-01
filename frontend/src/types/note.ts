export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  isIdea: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  linkedNoteIds: string[];
  linkedNotes?: Note[];
  archivedAt?: string;
}

export interface NoteLink {
  source: string;
  target: string;
  type: string;
}