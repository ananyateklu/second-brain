export interface Idea {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  linkedItems: LinkedItem[];
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface LinkedItem {
  id: string;
  type: 'Note' | 'Idea' | 'Task' | 'Reminder';
  title: string;
}

export interface IdeaLink {
  ideaId: string;
  linkedItemId: string;
  linkedItemType: string;
  isDeleted: boolean;
}