import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { reminderService, Reminder as ApiReminder } from '../api/services/reminderService';
import { useActivities } from './ActivityContext';

export interface Reminder extends ApiReminder {
  tags: string[]; // Assuming tags are part of the reminder
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
}

const RemindersContext = createContext<RemindersContextType | null>(null);

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const { addActivity } = useActivities();

  // Fetch reminders from the API on component mount
  useEffect(() => {
    (async () => {
      try {
        const fetchedReminders = await reminderService.getReminders();
        setReminders(fetchedReminders.map(reminder => ({
          ...reminder,
          tags: [], // Initialize tags if not provided
        })));
      } catch (error) {
        console.error('Failed to fetch reminders:', error);
      }
    })();
  }, []);

  const addReminder = useCallback(async (reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      const newReminder = await reminderService.createReminder({
        Title: reminderData.title,
        Description: reminderData.description,
        DueDateTime: reminderData.dueDateTime,
        RepeatInterval:
          reminderData.repeatInterval !== undefined
            ? repeatIntervalMapping[reminderData.repeatInterval]
            : undefined,
        CustomRepeatPattern: reminderData.customRepeatPattern,
      });

      const newReminderWithTags: Reminder = {
        ...newReminder,
        tags: reminderData.tags || [],
      };

      setReminders(prev => [newReminderWithTags, ...prev]);

      // Record activity
      await addActivity({
        actionType: 'create',
        itemType: 'reminder',
        itemId: newReminder.id,
        itemTitle: newReminder.title,
        description: `Created reminder: ${newReminder.title}`,
        metadata: { tags: reminderData.tags },
      });
    } catch (error) {
      console.error('Failed to add reminder:', error);
    }
  }, [addActivity]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    try {
      const updatedReminder = await reminderService.updateReminder(id, updates);
      setReminders(prev =>
        prev.map(reminder => (reminder.id === id ? { ...reminder, ...updatedReminder } : reminder))
      );

      // Record activity
      await addActivity({
        actionType: 'edit',
        itemType: 'reminder',
        itemId: updatedReminder.id,
        itemTitle: updatedReminder.title,
        description: `Updated reminder: ${updatedReminder.title}`,
        metadata: { tags: updates.tags },
      });
    } catch (error) {
      console.error('Failed to update reminder:', error);
    }
  }, [addActivity]);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      await reminderService.deleteReminder(id);
      setReminders(prev => prev.filter(reminder => reminder.id !== id));

      // Record activity
      await addActivity({
        actionType: 'delete',
        itemType: 'reminder',
        itemId: id,
        itemTitle: '',
        description: `Deleted reminder`,
      });
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  }, [addActivity]);

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

  const value = useMemo(
    () => ({
      reminders,
      addReminder,
      updateReminder,
      deleteReminder,
      snoozeReminder,
      toggleReminderCompletion,
      getDueReminders,
      getUpcomingReminders,
    }),
    [
      reminders,
      addReminder,
      updateReminder,
      deleteReminder,
      snoozeReminder,
      toggleReminderCompletion,
      getDueReminders,
      getUpcomingReminders,
    ]
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
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