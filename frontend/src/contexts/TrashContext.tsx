import { useState, useCallback, useEffect, useMemo } from 'react';
import { TrashedItem, TrashProviderProps, TrashContext } from './trashContextUtils';
import { useActivities } from './activityContextUtils';
import { tasksService } from '../services/api/tasks.service';
import { notesService } from '../services/api/notes.service';
import { reminderService } from '../services/api/reminders.service';
import type { TaskStatus } from '../types/task';

const getMappedPriority = (priority: number | string | undefined): 'low' | 'medium' | 'high' => {
  if (typeof priority === 'number') {
    if (priority === 1) return 'low';
    if (priority === 3) return 'high';
  } else if (typeof priority === 'string') {
    if (['low', 'medium', 'high'].includes(priority)) {
      return priority as 'low' | 'medium' | 'high';
    }
  }
  return 'medium';
};

export function TrashProvider({ children, onRestoreNote }: TrashProviderProps) {
  const [trashedItems, setTrashedItems] = useState<TrashedItem[]>([]);
  const { createActivity } = useActivities();

  const logRestoreActivity = useCallback(async (
    itemType: 'task' | 'reminder' | 'note' | 'idea',
    item: TrashedItem,
    updateData?: Record<string, unknown>
  ) => {
    const baseMetadata = {
      itemId: item.id,
      itemTitle: item.title,
      restoredAt: new Date().toISOString()
    };

    const metadata = itemType === 'task' ? {
      ...baseMetadata,
      taskDueDate: item.metadata?.dueDate,
      taskTags: item.metadata?.tags,
      taskPriority: updateData?.priority,
      taskStatus: updateData?.status,
    } : baseMetadata;

    await createActivity({
      actionType: 'restore',
      itemType,
      itemId: item.id,
      itemTitle: item.title,
      description: `Restored ${itemType} from trash: ${item.title}`,
      metadata
    });
  }, [createActivity]);

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
            dueDate: task.dueDate ?? undefined,
            priority: task.priority,
            status: task.status,
            deletedAt: task.deletedAt
          },
          deletedAt: task.deletedAt ?? new Date().toISOString(),
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
          deletedAt: note.deletedAt ?? new Date().toISOString(),
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

  const restoreTask = useCallback(async (item: TrashedItem) => {
    setTrashedItems(prev => prev.filter(i => i.id !== item.id));

    const mappedPriority = getMappedPriority(item.metadata?.priority);
    const updateData = {
      isDeleted: false,
      deletedAt: null,
      title: item.title,
      description: item.content,
      priority: mappedPriority,
      dueDate: item.metadata?.dueDate ?? undefined,
      tags: item.metadata?.tags || [],
      status: (item.metadata?.status === 'completed' ? 'Completed' : 'Incomplete') as TaskStatus
    };

    await tasksService.updateTask(item.id, updateData);
    await logRestoreActivity('task', item, updateData);
  }, [logRestoreActivity]);

  const restoreNoteOrIdea = useCallback(async (item: TrashedItem) => {
    setTrashedItems(prev => prev.filter(i => i.id !== item.id));
    const restoredNote = await notesService.restoreNote(item.id);
    if (onRestoreNote) {
      await onRestoreNote(restoredNote);
    }
    await logRestoreActivity(item.type as 'note' | 'idea', item, {
      tags: item.metadata?.tags,
      linkedItems: item.metadata?.linkedItems,
      isFavorite: item.metadata?.isFavorite
    });
  }, [onRestoreNote, logRestoreActivity]);

  const restoreReminder = useCallback(async (item: TrashedItem) => {
    setTrashedItems(prev => prev.filter(i => i.id !== item.id));
    await reminderService.updateReminder(item.id, {
      isDeleted: false,
      deletedAt: item.deletedAt,
      title: item.title,
      description: item.content,
      dueDateTime: item.metadata?.dueDate ?? undefined,
      tags: item.metadata?.tags || [],
      isCompleted: item.metadata?.isCompleted || false,
      isSnoozed: item.metadata?.isSnoozed || false,
      snoozeUntil: item.metadata?.snoozeUntil
    });
    await logRestoreActivity('reminder', item);
  }, [logRestoreActivity]);

  const restoreItems = useCallback(async (itemIds: string[]) => {
    const itemsToRestore = trashedItems.filter(item => itemIds.includes(item.id));

    for (const item of itemsToRestore) {
      try {
        switch (item.type) {
          case 'task':
            await restoreTask(item);
            break;
          case 'note':
          case 'idea':
            await restoreNoteOrIdea(item);
            break;
          case 'reminder':
            await restoreReminder(item);
            break;
        }
      } catch (error) {
        console.error('Failed to restore:', item.type, error);
        setTrashedItems(prev => [...prev, item]);
        throw error;
      }
    }
    window.location.reload();
  }, [trashedItems, restoreTask, restoreNoteOrIdea, restoreReminder]);

  // Wrap handlers in useCallback
  const handleTaskDeletion = useCallback(async (item: TrashedItem) => {
    const taskLinkedItems = item.metadata?.linkedItems || [];
    for (const linkedItem of taskLinkedItems) {
      await tasksService.removeTaskLink(item.id, linkedItem).catch(error =>
        console.warn('Failed to unlink item from task:', linkedItem, item.id, error)
      );
    }
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
        taskTags: item.metadata?.tags,
        taskDueDate: item.metadata?.dueDate,
        taskPriority: item.metadata?.priority,
        taskStatus: item.metadata?.status,
        deletedAt: new Date().toISOString()
      }
    });
  }, [createActivity]);

  const handleNoteOrIdeaDeletion = useCallback(async (item: TrashedItem) => {
    const noteLinkedItems = item.metadata?.linkedItems || [];
    for (const linkedNoteId of noteLinkedItems) {
      await notesService.removeLink(item.id, linkedNoteId).catch(error =>
        console.warn('Failed to unlink note from note:', linkedNoteId, item.id, error)
      );
    }

    for (const linkedItemId of noteLinkedItems) {
      await notesService.removeReminderFromNote(item.id, linkedItemId).catch(error =>
        console.warn('Failed to unlink item from note:', linkedItemId, item.id, error)
      );
    }

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
        noteLinkedItems: item.metadata?.linkedItems,
        isFavorite: item.metadata?.isFavorite,
        deletedAt: new Date().toISOString()
      }
    });
  }, [createActivity]);

  const handleReminderDeletion = useCallback(async (item: TrashedItem) => {
    const reminderLinkedItems = item.metadata?.linkedItems || [];
    for (const linkedItem of reminderLinkedItems) {
      await reminderService.removeReminderLink(item.id, linkedItem).catch(error =>
        console.warn('Failed to unlink item from reminder:', linkedItem, item.id, error)
      );
    }
    await reminderService.deleteReminderPermanently(item.id);
    await createActivity({
      actionType: 'delete',
      itemType: 'reminder',
      itemId: item.id,
      itemTitle: item.title,
      description: `Permanently deleted reminder: ${item.title}`,
      metadata: {
        reminderId: item.id,
        reminderTitle: item.title,
        reminderTags: item.metadata?.tags,
        reminderDueDate: item.metadata?.dueDate,
        isCompleted: item.metadata?.isCompleted,
        isSnoozed: item.metadata?.isSnoozed,
        snoozeUntil: item.metadata?.snoozeUntil,
        deletedAt: new Date().toISOString()
      }
    });
  }, [createActivity]);

  // Remove createActivity from deleteItemsPermanently dependencies
  const deleteItemsPermanently = useCallback(async (itemIds: string[]) => {
    const itemsToDelete = trashedItems.filter(item => itemIds.includes(item.id));
    const errors: Array<{ itemId: string; error: Error }> = [];

    for (const item of itemsToDelete) {
      try {
        switch (item.type) {
          case 'task':
            await handleTaskDeletion(item);
            break;
          case 'note':
          case 'idea':
            await handleNoteOrIdeaDeletion(item);
            break;
          case 'reminder':
            await handleReminderDeletion(item);
            break;
        }
        setTrashedItems(prev => prev.filter(i => i.id !== item.id));
      } catch (error) {
        errors.push({
          itemId: item.id,
          error: error instanceof Error ? error : new Error('Unknown error occurred')
        });
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Failed to delete some items:\n${errors
          .map(({ itemId, error }) => {
            const item = trashedItems.find(i => i.id === itemId);
            return `- ${item?.type ?? 'Item'} "${item?.title}" (${itemId}): ${error.message}`;
          })
          .join('\n')}`
      );
    }
  }, [trashedItems, handleTaskDeletion, handleNoteOrIdeaDeletion, handleReminderDeletion]);

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
          dueDate: task.dueDate ?? undefined,
          priority: task.priority,
          status: task.status,
          deletedAt: task.deletedAt
        },
        deletedAt: task.deletedAt ?? new Date().toISOString(),
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
        deletedAt: note.deletedAt ?? new Date().toISOString(),
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
        deletedAt: reminder.deletedAt ?? new Date().toISOString(),
        expiresAt: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }));

      setTrashedItems([...taskItems, ...noteItems, ...reminderItems]);
    } catch (error) {
      console.error('Failed to refresh trash items:', error);
    }
  }, []);

  const contextValue = useMemo(() => ({
    trashedItems,
    moveToTrash,
    restoreItems,
    deleteItemsPermanently,
    emptyTrash,
    cleanupExpiredItems,
    refreshTrashItems
  }), [
    trashedItems,
    moveToTrash,
    restoreItems,
    deleteItemsPermanently,
    emptyTrash,
    cleanupExpiredItems,
    refreshTrashItems
  ]);

  return (
    <TrashContext.Provider value={contextValue}>
      {children}
    </TrashContext.Provider>
  );
}