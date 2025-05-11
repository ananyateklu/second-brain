export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  linkedNoteIds: string[];
  links: NoteLink[];
  linkedNotes?: Note[];
  archivedAt?: string;
  linkedTasks?: LinkedTask[];
  linkedReminders: Array<{
    id: string;
    title: string;
    description: string;
    dueDateTime: string;
    isCompleted: boolean;
    isSnoozed: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface NoteLink {
  source: string;
  target: string;
  type: string;
  createdAt: string;
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

export interface LinkedReminder {
  id: string;
  title: string;
  description?: string;
  dueDateTime: string;
  isCompleted: boolean;
  isSnoozed: boolean;
  createdAt: string;
  updatedAt: string;
}