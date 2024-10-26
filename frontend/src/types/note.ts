export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  isFavorite: boolean;
  linkedNotes?: string[];
}

export interface NoteLink {
  source: string;
  target: string;
  type: string;
}