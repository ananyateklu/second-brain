import { createContext, useContext } from 'react';
import { Note } from './NotesContext';
import type { Task } from '../types/task';
import type { Reminder } from '../api/types/reminder';

export interface TrashedItem {
  id: string;
  type: 'note' | 'task' | 'idea' | 'reminder' | 'tag';
  title: string;
  content?: string;
  priority?: number;
  status?: string;
  isCompleted?: boolean;
  isSnoozed?: boolean;
  snoozeUntil?: string;
  metadata?: {
    tags?: string[];
    dueDate?: string | null;
    priority?: string | number;
    status?: string;
    isCompleted?: boolean;
    isSnoozed?: boolean;
    snoozeUntil?: string;
    linkedItems?: string[];
    isFavorite?: boolean;
  };
  deletedAt: string;
  expiresAt: string;
}

export interface TrashContextType {
  trashedItems: TrashedItem[];
  moveToTrash: (item: Omit<TrashedItem, 'deletedAt' | 'expiresAt'>) => Promise<boolean>;
  restoreItems: (itemIds: string[]) => Promise<void>;
  deleteItemsPermanently: (itemIds: string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;
  cleanupExpiredItems: () => Promise<void>;
  refreshTrashItems: () => Promise<void>;
}

export interface TrashProviderProps {
  children: React.ReactNode;
  onRestoreNote?: (note: Note) => Promise<void>;
}

const TrashContext = createContext<TrashContextType | null>(null);

export { TrashContext };

export const useTrash = () => {
  const context = useContext(TrashContext);
  if (!context) {
    throw new Error('useTrash must be used within a TrashProvider');
  }
  return context;
}; 