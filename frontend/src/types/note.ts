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
  linkedTasks?: LinkedTask[];
}

export interface NoteLink {
  source: string;
  target: string;
  type: string;
}

export interface LinkedTask {
  id: string;
  title: string;
  description?: string;
  status: 'incomplete' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}