import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Note } from './NotesContext';
import { Task } from '../services/api/tasks.service';
import { Reminder } from '../services/api/reminders.service';
import { useActivities } from './ActivityContext';
import { tasksService } from '../services/api/tasks.service';

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
  moveToTrash: (item: Omit<TrashedItem, 'deletedAt' | 'expiresAt'>) => Promise<boolean>;
  restoreItems: (itemIds: string[]) => Promise<void>;
  deleteItemsPermanently: (itemIds: string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;
  cleanupExpiredItems: () => Promise<void>;
}

const TrashContext = createContext<TrashContextType | null>(null);

interface TrashProviderProps {
  children: React.ReactNode;
  onRestoreNote?: (note: Note) => Promise<void>;
  onRestoreTask?: (task: Task) => Promise<void>;
  onRestoreReminder?: (reminder: Reminder) => Promise<void>;
}

export function TrashProvider({ 
  children, 
  onRestoreNote,
  onRestoreTask,
  onRestoreReminder 
}: TrashProviderProps) {
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([]);

  const { addActivity } = useActivities();

  // Fetch deleted tasks
  useEffect(() => {
    const fetchDeletedTasks = async () => {
      try {
        const deletedTasks = await tasksService.getDeletedTasks();
        const taskItems: TrashedItem[] = deletedTasks.map(task => ({
          id: task.id,
          type: 'task',
          title: task.title,
          content: task.description,
          metadata: {
            tags: task.tags,
            dueDate: task.dueDate,
            priority: task.priority,
            status: task.status,
            deletedAt: task.deletedAt
          },
          deletedAt: task.deletedAt || new Date().toISOString(),
          expiresAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }));

        setTrashedItems(taskItems);
      } catch (error) {
        console.error('Failed to fetch deleted tasks:', error);
      }
    };

    fetchDeletedTasks();
  }, []);

  // Save to localStorage whenever trashedItems changes
  useEffect(() => {
    localStorage.setItem('trashedItems', JSON.stringify(trashedItems));
  }, [trashedItems]);

  const moveToTrash = useCallback(async (item: Omit<TrashedItem, 'deletedAt' | 'expiresAt'>): Promise<boolean> => {
    try {
      const existingItem = trashedItems.find(trashedItem => trashedItem.id === item.id);
      if (existingItem) {
        console.log('Item already in trash:', item.id);
        return false;
      }

      const now = new Date();
      const expirationDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const trashedItem: TrashedItem = {
        ...item,
        deletedAt: now.toISOString(),
        expiresAt: expirationDate.toISOString()
      };

      setTrashedItems(prev => [...prev, trashedItem]);
      return true;
    } catch (error) {
      console.error('Failed to move item to trash:', error);
      throw error;
    }
  }, [trashedItems]);

  const cleanupExpiredItems = useCallback(async () => {
    const now = new Date();
    setTrashedItems(prev => 
      prev.filter(item => new Date(item.expiresAt) > now)
    );
  }, []);

  useEffect(() => {
    cleanupExpiredItems();
    const interval = setInterval(cleanupExpiredItems, 1000 * 60 * 60); // Every hour
    return () => clearInterval(interval);
  }, [cleanupExpiredItems]);

  const restoreItems = useCallback(async (itemIds: string[]) => {
    const itemsToRestore = trashedItems.filter(item => itemIds.includes(item.id));
    
    for (const item of itemsToRestore) {
      try {
        switch (item.type) {
          case 'note':
            if (onRestoreNote) {
              const restoredNote = {
                id: item.id,
                title: item.title,
                content: item.content || '',
                tags: item.metadata?.tags || [],
                isFavorite: item.metadata?.isFavorite || false,
                isPinned: false,
                isArchived: false,
                linkedNoteIds: item.metadata?.linkedItems || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await onRestoreNote(restoredNote);
            }
            break;
          case 'task':
            if (onRestoreTask) {
              await onRestoreTask(item);
            }
            break;
          case 'reminder':
            if (onRestoreReminder) {
              await onRestoreReminder(item);
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to restore ${item.type}:`, error);
      }
    }

    // Remove from trash
    setTrashedItems(prev => prev.filter(item => !itemIds.includes(item.id)));
  }, [trashedItems, onRestoreNote, onRestoreTask, onRestoreReminder]);

  const deleteItemsPermanently = useCallback(async (itemIds: string[]) => {
    try {
      setTrashedItems(prev => {
        const updatedItems = prev.filter(item => !itemIds.includes(item.id));
        localStorage.setItem('trashedItems', JSON.stringify(updatedItems));
        return updatedItems;
      });
    } catch (error) {
      console.error('Failed to delete items permanently:', error);
      throw error;
    }
  }, []);

  const emptyTrash = useCallback(async () => {
    try {
      setTrashedItems([]);
      localStorage.removeItem('trashedItems');
    } catch (error) {
      console.error('Failed to empty trash:', error);
      throw error;
    }
  }, []);

  const restoreTask = useCallback(async (id: string) => {
    try {
      // Call the backend to restore the task
      const restoredTask = await taskService.restoreTask(id);

      // Remove from trash
      setTrashedItems(prev => prev.filter(item => item.id !== id));

      // Add activity
      addActivity({
        actionType: 'restore',
        itemType: 'task',
        itemId: id,
        itemTitle: restoredTask.title,
        description: `Restored task from trash: ${restoredTask.title}`,
        metadata: {
          taskId: id,
          taskTitle: restoredTask.title,
          taskStatus: restoredTask.status,
          taskPriority: restoredTask.priority,
          taskDueDate: restoredTask.dueDate,
          taskTags: restoredTask.tags,
          restoredAt: new Date().toISOString()
        }
      });

      return restoredTask;
    } catch (error) {
      console.error('Failed to restore task:', error);
      throw error;
    }
  }, [setTrashedItems, addActivity]);

  return (
    <TrashContext.Provider value={{
      trashedItems,
      moveToTrash,
      restoreItems,
      deleteItemsPermanently,
      emptyTrash,
      cleanupExpiredItems
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