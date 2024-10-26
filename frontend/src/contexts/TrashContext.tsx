import React, { createContext, useContext, useState, useCallback } from 'react';

export interface TrashedItem {
  id: string;
  type: 'note' | 'task' | 'idea' | 'reminder' | 'tag';
  title: string;
  content?: string;
  metadata?: {
    tags?: string[];
    dueDate?: string;
    linkedItems?: string[];
    isFavorite?: boolean;
  };
  deletedAt: string;
  expiresAt: string;
}

interface TrashContextType {
  trashedItems: TrashedItem[];
  restoreItems: (itemIds: string[]) => Promise<void>;
  deleteItemsPermanently: (itemIds: string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;
}

const TrashContext = createContext<TrashContextType | null>(null);

// Sample data for demonstration
const INITIAL_ITEMS: TrashedItem[] = [
  {
    id: '1',
    type: 'note',
    title: 'Project Ideas',
    content: 'List of potential project ideas for Q2 2024...',
    metadata: {
      tags: ['projects', 'planning'],
      isFavorite: true
    },
    deletedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    expiresAt: new Date(Date.now() + 29 * 86400000).toISOString() // 29 days from now
  },
  {
    id: '2',
    type: 'task',
    title: 'Review Documentation',
    content: 'Review and update API documentation',
    metadata: {
      dueDate: '2024-03-20T10:00:00Z',
      tags: ['documentation']
    },
    deletedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    expiresAt: new Date(Date.now() + 28 * 86400000).toISOString() // 28 days from now
  }
];

export function TrashProvider({ children }: { children: React.ReactNode }) {
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>(INITIAL_ITEMS);

  const restoreItems = useCallback(async (itemIds: string[]) => {
    setTrashedItems(prev => prev.filter(item => !itemIds.includes(item.id)));
  }, []);

  const deleteItemsPermanently = useCallback(async (itemIds: string[]) => {
    setTrashedItems(prev => prev.filter(item => !itemIds.includes(item.id)));
  }, []);

  const emptyTrash = useCallback(async () => {
    setTrashedItems([]);
  }, []);

  return (
    <TrashContext.Provider value={{
      trashedItems,
      restoreItems,
      deleteItemsPermanently,
      emptyTrash
    }}>
      {children}
    </TrashContext.Provider>
  );
}

export function useTrash() {
  const context = useContext(TrashContext);
  if (!context) {
    throw new Error('useTrash must be used within a TrashProvider');
  }
  return context;
}