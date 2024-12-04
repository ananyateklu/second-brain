export type ItemType = 'note' | 'task' | 'idea' | 'reminder';

export interface TaggedItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: ItemType;
  updatedAt: string;
  createdAt: string;
} 