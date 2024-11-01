import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { reminderService } from '../api/services/reminderService';
import { useActivities } from './ActivityContext';
import { Reminder as ApiReminder } from '../api/types/reminder';

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
}

const RemindersContext = createContext<RemindersContextType | null>(null);

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const { addActivity } = useActivities();

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
      await addActivity({
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
        metadata: { tags: updatedReminder.tags },
      });
    } catch (error) {
      console.error('Failed to update reminder:', error);
    }
  }, [addActivity]);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      const reminderToDelete = reminders.find(r => r.id === id);
      if (!reminderToDelete) throw new Error('Reminder not found');

      // Capture the title before deleting
      const { title } = reminderToDelete;

      await reminderService.deleteReminder(id);
      setReminders(prev => prev.filter(reminder => reminder.id !== id));

      // Record activity with the reminder's title
      await addActivity({
        actionType: 'delete',
        itemType: 'reminder',
        itemId: id,
        itemTitle: title,
        description: `Deleted reminder: ${title}`,
        metadata: { tags: reminderToDelete.tags },
      });
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  }, [addActivity, reminders]);

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

  return (
    <RemindersContext.Provider value={{ reminders, addReminder, updateReminder, deleteReminder, snoozeReminder, toggleReminderCompletion, getDueReminders, getUpcomingReminders }}>
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