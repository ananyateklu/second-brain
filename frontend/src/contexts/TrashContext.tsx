import { useState, useCallback, useEffect } from 'react';
import { TrashedItem, TrashProviderProps, TrashContext } from './trashContextUtils';
import { useActivities } from './activityContextUtils';
import { tasksService } from '../services/api/tasks.service';
import { notesService } from '../services/api/notes.service';
import { reminderService } from '../api/services/reminderService';

export function TrashProvider({ children, onRestoreNote }: TrashProviderProps) {
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([]);

  const { createActivity } = useActivities();

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
            dueDate: task.dueDate || undefined,
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
    
    for (const item of itemsToRestore) {
      try {
        switch (item.type) {
          case 'task': {
            // Remove from trash immediately
            setTrashedItems(prev => prev.filter(i => i.id !== item.id));
            
            const priority = item.metadata?.priority;
            let mappedPriority: 'low' | 'medium' | 'high' = 'medium';
            
            // Map numeric priority back to string
            if (typeof priority === 'number') {
              mappedPriority = priority === 1 ? 'low' : priority === 3 ? 'high' : 'medium';
            } else if (typeof priority === 'string') {
              mappedPriority = priority as 'low' | 'medium' | 'high';
            }

            // Create the update request with proper status type
            const updateData = {
              isDeleted: false,
              deletedAt: null,
              title: item.title,
              description: item.content,
              priority: mappedPriority,
              dueDate: item.metadata?.dueDate || undefined,
              tags: item.metadata?.tags || [],
              status: (item.metadata?.status === 'completed' ? 'Completed' : 'Incomplete') as 'Completed' | 'Incomplete'
            };

            // Update the task in the backend
            await tasksService.updateTask(item.id, updateData);

            // Record activity
            await createActivity({
              actionType: 'restore',
              itemType: 'task',
              itemId: item.id,
              itemTitle: item.title,
              description: `Restored task from trash: ${item.title}`,
              metadata: {
                taskId: item.id,
                taskTitle: item.title,
                taskDueDate: item.metadata?.dueDate,
                taskTags: item.metadata?.tags,
                taskPriority: mappedPriority,
                taskStatus: updateData.status,
                restoredAt: new Date().toISOString()
              }
            });
            break;
          }

          case 'note':
          case 'idea': {
            setTrashedItems(prev => prev.filter(i => i.id !== item.id));
            const restoredNote = await notesService.restoreNote(item.id);
            
            if (onRestoreNote) {
              await onRestoreNote(restoredNote);
            }
            break;
          }

          case 'reminder':
            // Remove from trash immediately
            setTrashedItems(prev => prev.filter(i => i.id !== item.id));
            
            // Update the reminder in the backend with proper dueDateTime handling
            await reminderService.updateReminder(item.id, {
              isDeleted: false,
              deletedAt: item.deletedAt,
              title: item.title,
              description: item.content,
              dueDateTime: item.metadata?.dueDate || undefined, // Convert null to undefined
              tags: item.metadata?.tags || [],
              isCompleted: item.metadata?.isCompleted || false,
              isSnoozed: item.metadata?.isSnoozed || false,
              snoozeUntil: item.metadata?.snoozeUntil
            });

            // Record activity
            await createActivity({
              actionType: 'restore',
              itemType: 'reminder',
              itemId: item.id,
              itemTitle: item.title,
              description: `Restored reminder from trash: ${item.title}`,
              metadata: {
                reminderId: item.id,
                reminderTitle: item.title,
                reminderDueDate: item.metadata?.dueDate,
                reminderTags: item.metadata?.tags,
                restoredAt: new Date().toISOString()
              }
            });
            break;
        }

        await createActivity({
          actionType: 'restore',
          itemType: item.type,
          itemId: item.id,
          itemTitle: item.title,
          description: `Restored ${item.type} from trash: ${item.title}`,
          metadata: {
            itemId: item.id,
            itemTitle: item.title,
            restoredAt: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error(`Failed to restore ${item.type}:`, error);
        setTrashedItems(prev => [...prev, item]);
        throw error;
      }
    }

    // After all restorations, refresh the lists
    window.location.reload(); // This is a temporary solution - we can improve it later
  }, [trashedItems, onRestoreNote, createActivity]);

  const deleteItemsPermanently = useCallback(async (itemIds: string[]) => {
    const itemsToDelete = trashedItems.filter(item => itemIds.includes(item.id));
    
    for (const item of itemsToDelete) {
      try {
        switch (item.type) {
          case 'task':
            await tasksService.deleteTaskPermanently(item.id);
            await createActivity({
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
            await createActivity({
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
  }, [trashedItems, createActivity]);

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
      const [deletedTasks, deletedNotes, deletedReminders] = await Promise.all([
        tasksService.getDeletedTasks(),
        notesService.getDeletedNotes(),
        reminderService.getDeletedReminders()
      ]);

      const taskItems: TrashedItem[] = deletedTasks.map(task => ({
        id: task.id,
        type: 'task',
        title: task.title,
        content: task.description,
        metadata: {
          tags: task.tags,
          dueDate: task.dueDate || undefined,
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

      const reminderItems: TrashedItem[] = deletedReminders.map(reminder => ({
        id: reminder.id,
        type: 'reminder',
        title: reminder.title,
        content: reminder.description,
        metadata: {
          tags: reminder.tags,
          dueDate: reminder.dueDateTime,
          isCompleted: reminder.isCompleted,
          completedAt: reminder.completedAt,
          isSnoozed: reminder.isSnoozed,
          snoozeUntil: reminder.snoozeUntil
        },
        deletedAt: reminder.deletedAt || new Date().toISOString(),
        expiresAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }));

      setTrashedItems([...taskItems, ...noteItems, ...reminderItems]);
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