import { createContext, useContext } from 'react';
import { Reminder as ApiReminder } from '../api/types/reminder';

export interface Reminder extends ApiReminder {
  tags: string[];
}

export interface RemindersContextType {
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
  isLoading: boolean;
  deleteReminderPermanently: (id: string) => Promise<void>;
}

export const RemindersContext = createContext<RemindersContextType | null>(null);

export const useReminders = () => {
  const context = useContext(RemindersContext);
  if (!context) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  return context;
}; 