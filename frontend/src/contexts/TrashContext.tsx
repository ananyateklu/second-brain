import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Note } from './NotesContext';
import { Task } from '../services/api/tasks.service';
import { Reminder } from '../services/api/reminders.service';
import { useActivities } from './ActivityContext';
import { tasksService } from '../services/api/tasks.service';
import { notesService } from '../services/api/notes.service';

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
  refreshTrashItems: () => Promise<void>;
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

  // Fetch deleted items
  useEffect(() => {
    const fetchDeletedItems = async () => {
      try {
        const [deletedTasks, deletedNotes] = await Promise.all([
          tasksService.getDeletedTasks(),
          notesService.getDeletedNotes()
        ]);

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

        const noteItems: TrashedItem[] = deletedNotes.map(note => ({
          id: note.id,
          type: note.tags?.includes('idea') ? 'idea' : 'note',
          title: note.title,
          content: note.content,
          metadata: {
            tags: note.tags,
            linkedItems: note.linkedNoteIds,
            isFavorite: note.isFavorite
          },
          deletedAt: note.deletedAt || new Date().toISOString(),
          expiresAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }));

        // Set all items at once instead of accumulating
        setTrashedItems([...taskItems, ...noteItems]);
      } catch (error) {
        console.error('Failed to fetch deleted items:', error);
      }
    };

    fetchDeletedItems();
  }, []);

  // Save to localStorage whenever trashedItems changes
  useEffect(() => {
    localStorage.setItem('trashedItems', JSON.stringify(trashedItems));
  }, [trashedItems]);

  const moveToTrash = useCallback(async (item: Omit<TrashedItem, 'deletedAt' | 'expiresAt'>): Promise<boolean> => {
    try {
      const existingItem = trashedItems.find(trashedItem => trashedItem.id === item.id);
      if (existingItem) {
        return false;
      }

      const deletedAt = new Date().toISOString();
      const trashedItem: TrashedItem = {
        ...item,
        deletedAt,
        expiresAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      // Update state immediately with the new item
      setTrashedItems(prev => [...prev, trashedItem]);
      
      // No need to fetch all items again, as we just added one item
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
    
    // Create a map to track restored items
    const restoredItems = new Map();
    
    for (const item of itemsToRestore) {
      try {
        switch (item.type) {
          case 'note':
          case 'idea':
            // Remove from trash immediately
            setTrashedItems(prev => prev.filter(i => i.id !== item.id));
            
            // Restore the note
            const restoredNote = await notesService.restoreNote(item.id);
            
            // Track this restoration to prevent duplicates
            if (!restoredItems.has(item.id)) {
              restoredItems.set(item.id, restoredNote);
              
              if (onRestoreNote) {
                await onRestoreNote(restoredNote);
              }
              
              addActivity({
                actionType: 'restore',
                itemType: item.type,
                itemId: item.id,
                itemTitle: item.title,
                description: `Restored ${item.type} from trash: ${item.title}`,
                metadata: {
                  noteId: item.id,
                  noteTitle: item.title,
                  noteTags: item.metadata?.tags,
                  restoredAt: new Date().toISOString()
                }
              });
            }
            break;
            
          case 'task':
            // Remove from trash before restore to prevent state conflicts
            setTrashedItems(prev => prev.filter(i => i.id !== item.id));
            const restoredTask = await tasksService.restoreTask(item.id);
            if (onRestoreTask) {
              await onRestoreTask(restoredTask);
            }
            addActivity({
              actionType: 'restore',
              itemType: 'task',
              itemId: item.id,
              itemTitle: item.title,
              description: `Restored task from trash: ${item.title}`,
              metadata: {
                taskId: item.id,
                taskTitle: item.title,
                taskStatus: item.metadata?.status,
                taskPriority: item.metadata?.priority,
                taskDueDate: item.metadata?.dueDate,
                taskTags: item.metadata?.tags,
                restoredAt: new Date().toISOString()
              }
            });
            break;
          case 'reminder':
            // await remindersService.restoreReminder(item.id);
            break;
        }
      } catch (error) {
        console.error(`Failed to restore ${item.type}:`, error);
        // If restore fails, we might want to add the item back to trash
        setTrashedItems(prev => [...prev, item]);
        throw error;
      }
    }
  }, [trashedItems, onRestoreNote, onRestoreTask, addActivity]);

  const deleteItemsPermanently = useCallback(async (itemIds: string[]) => {
    const itemsToDelete = trashedItems.filter(item => itemIds.includes(item.id));
    
    for (const item of itemsToDelete) {
      try {
        switch (item.type) {
          case 'task':
            await tasksService.deleteTaskPermanently(item.id);
            addActivity({
              actionType: 'delete',
              itemType: 'task',
              itemId: item.id,
              itemTitle: item.title,
              description: `Permanently deleted task: ${item.title}`,
              metadata: {
                taskId: item.id,
                taskTitle: item.title,
                deletedAt: new Date().toISOString()
              }
            });
            break;
            
          case 'note':
          case 'idea':
            await notesService.deleteNotePermanently(item.id);
            addActivity({
                actionType: 'delete',
                itemType: item.type,
                itemId: item.id,
                itemTitle: item.title,
                description: `Permanently deleted ${item.type}: ${item.title}`,
                metadata: {
                    noteId: item.id,
                    noteTitle: item.title,
                    noteTags: item.metadata?.tags,
                    deletedAt: new Date().toISOString()
                }
            });
            break;
          case 'reminder':
            // await remindersService.deleteReminderPermanently(item.id);
            break;
        }
      } catch (error) {
        console.error(`Failed to permanently delete ${item.type}:`, error);
        throw error;
      }
    }

    // Remove deleted items from trash
    setTrashedItems(prev => prev.filter(item => !itemIds.includes(item.id)));
  }, [trashedItems, addActivity]);

  const emptyTrash = useCallback(async () => {
    try {
      setTrashedItems([]);
      localStorage.removeItem('trashedItems');
    } catch (error) {
      console.error('Failed to empty trash:', error);
      throw error;
    }
  }, []);

  const refreshTrashItems = useCallback(async () => {
    try {
      const [deletedTasks, deletedNotes] = await Promise.all([
        tasksService.getDeletedTasks(),
        notesService.getDeletedNotes()
      ]);

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

      const noteItems: TrashedItem[] = deletedNotes.map(note => ({
        id: note.id,
        type: note.tags?.includes('idea') ? 'idea' : 'note',
        title: note.title,
        content: note.content,
        metadata: {
          tags: note.tags,
          linkedItems: note.linkedNoteIds,
          isFavorite: note.isFavorite
        },
        deletedAt: note.deletedAt || new Date().toISOString(),
        expiresAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }));

      setTrashedItems([...taskItems, ...noteItems]);
    } catch (error) {
      console.error('Failed to refresh trash items:', error);
    }
  }, []);

  return (
    <TrashContext.Provider value={{
      trashedItems,
      moveToTrash,
      restoreItems,
      deleteItemsPermanently,
      emptyTrash,
      cleanupExpiredItems,
      refreshTrashItems
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