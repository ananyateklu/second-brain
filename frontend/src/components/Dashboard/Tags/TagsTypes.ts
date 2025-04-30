import { TaskStatus, TaskPriority } from '../../../types/task';

// Define interfaces before the component
export interface LinkedItem {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

export interface ReminderProperties {
  dueDateTime: string;
  repeatInterval?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';
  customRepeatPattern?: string;
  snoozeUntil?: string;
  isCompleted: boolean;
  isSnoozed: boolean;
  completedAt?: string;
  linkedItems: LinkedItem[];
  userId: string;
  isDeleted: boolean;
  deletedAt?: string;
}

// Define TaggedItem interface with all required properties
export interface TaggedItem extends Partial<ReminderProperties> {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: ItemType;
  updatedAt: string;
  createdAt: string;
  isIdea?: boolean;
  linkedItems?: LinkedItem[];
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  description?: string;
}

export type ItemType = 'note' | 'idea' | 'task' | 'reminder';

export interface TagFilters {
  types: ItemType[];
  sortBy: 'count' | 'name';
  sortOrder: 'asc' | 'desc';
}

export interface TagStats {
  tag: string;
  byType: {
    note: number;
    idea: number;
    task: number;
    reminder: number;
  };
} 