import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { reminderService } from '../api/services/reminderService';
import { useActivities } from './ActivityContext';
import { Reminder as ApiReminder } from '../api/types/reminder';
import { useTrash } from './TrashContext';

export interface Reminder extends ApiReminder {
  tags: string[];
}

interface RemindersContextType {
  reminders: Reminder[];
  addReminder: (reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string, until: string) => Promise<void>;
  toggleReminderCompletion: (id: string) => Promise<void>;
  getDueReminders: () => Reminder[];
  getUpcomingReminders: () => Reminder[];
  restoreReminder: (reminder: Reminder) => Promise<void>;
  fetchReminders: () => Promise<void>;
}

const RemindersContext = createContext<RemindersContextType | null>(null);

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const { createActivity } = useActivities();
  const { moveToTrash } = useTrash();

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = useCallback(async () => {
    try {
      const remindersData = await reminderService.getReminders();
      const remindersWithTags = remindersData.map(reminder => ({
        ...reminder,
        tags: reminder.tags || [],
      }));
      setReminders(remindersWithTags);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
  }, []);

  const addReminder = useCallback(async (reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      const newReminder = await reminderService.createReminder(reminderData);
      setReminders(prev => [newReminder, ...prev]);

      // Record activity
      await createActivity({
        actionType: 'create',
        itemType: 'reminder',
        itemId: newReminder.id,
        itemTitle: newReminder.title,
        description: `Created reminder: ${newReminder.title}`,
        metadata: { tags: newReminder.tags },
      });
    } catch (error) {
      console.error('Failed to add reminder:', error);
    }
  }, [createActivity]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    try {
      const updatedReminder = await reminderService.updateReminder(id, updates);
      setReminders(prev =>
        prev.map(reminder => (reminder.id === id ? { ...reminder, ...updatedReminder } : reminder))
      );

      // Record activity
      await createActivity({
        actionType: 'edit',
        itemType: 'reminder',
        itemId: updatedReminder.id,
        itemTitle: updatedReminder.title,
        description: `Updated reminder: ${updatedReminder.title}`,
        metadata: { tags: updatedReminder.tags },
      });
    } catch (error) {
      console.error('Failed to update reminder:', error);
    }
  }, [createActivity]);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      const reminderToDelete = reminders.find(reminder => reminder.id === id);
      if (!reminderToDelete) return;

      // Soft delete in backend by updating isDeleted flag
      await reminderService.updateReminder(id, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        title: reminderToDelete.title,
        description: reminderToDelete.description,
        dueDateTime: reminderToDelete.dueDateTime,
        tags: reminderToDelete.tags,
        isCompleted: reminderToDelete.isCompleted
      });

      // Move to trash
      await moveToTrash({
        id: reminderToDelete.id,
        type: 'reminder',
        title: reminderToDelete.title,
        content: reminderToDelete.description,
        metadata: {
          dueDate: reminderToDelete.dueDateTime,
          tags: reminderToDelete.tags
        }
      });

      // Remove from active reminders list AFTER successful deletion and trash move
      setReminders(prev => prev.filter(reminder => reminder.id !== id));

      await createActivity({
        actionType: 'delete',
        itemType: 'reminder',
        itemId: id,
        itemTitle: reminderToDelete.title,
        description: `Moved reminder to trash: ${reminderToDelete.title}`,
        metadata: {
          reminderId: id,
          reminderTitle: reminderToDelete.title,
          reminderDueDate: reminderToDelete.dueDateTime,
          reminderTags: reminderToDelete.tags,
          reminderStatus: reminderToDelete.isCompleted ? 'completed' : 'pending',
          deletedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      throw error;
    }
  }, [reminders, moveToTrash, createActivity]);

  const snoozeReminder = useCallback(async (id: string, until: string) => {
    try {
      await updateReminder(id, { isSnoozed: true, snoozeUntil: until });
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
    }
  }, [updateReminder]);

  const toggleReminderCompletion = useCallback(async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    try {
      await updateReminder(id, {
        isCompleted: !reminder.isCompleted,
        completedAt: !reminder.isCompleted ? new Date().toISOString() : undefined,
      });
    } catch (error) {
      console.error('Failed to toggle reminder completion:', error);
    }
  }, [reminders, updateReminder]);

  const getDueReminders = useCallback(() => {
    const now = new Date();
    return reminders.filter(reminder => {
      if (reminder.isCompleted) return false;
      if (reminder.isSnoozed && reminder.snoozeUntil) {
        return new Date(reminder.snoozeUntil) <= now;
      }
      return new Date(reminder.dueDateTime) <= now;
    });
  }, [reminders]);

  const getUpcomingReminders = useCallback(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return reminders.filter(reminder => {
      if (reminder.isCompleted) return false;
      const dueDate = new Date(reminder.dueDateTime);
      return dueDate > now && dueDate <= tomorrow;
    });
  }, [reminders]);

  const restoreReminder = useCallback(async (reminder: Reminder) => {
    try {
      await reminderService.updateReminder(reminder.id, {
        isDeleted: false,
        deletedAt: null
      });

      await fetchReminders();

      await createActivity({
        actionType: 'restore',
        itemType: 'reminder',
        itemId: reminder.id,
        itemTitle: reminder.title,
        description: `Restored reminder: ${reminder.title}`,
        metadata: { tags: reminder.tags }
      });
    } catch (error) {
      console.error('Failed to restore reminder:', error);
      throw error;
    }
  }, [createActivity, fetchReminders]);

  return (
    <RemindersContext.Provider value={{
      reminders,
      addReminder,
      updateReminder,
      deleteReminder,
      snoozeReminder,
      toggleReminderCompletion,
      getDueReminders,
      getUpcomingReminders,
      restoreReminder,
      fetchReminders
    }}>
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  const context = useContext(RemindersContext);
  if (!context) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
}

const repeatIntervalMapping: { [key: string]: number } = {
  Daily: 0,
  Weekly: 1,
  Monthly: 2,
  Yearly: 3,
  Custom: 4,
};