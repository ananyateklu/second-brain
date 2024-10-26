import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDateTime: string;
  repeatInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customRepeatPattern?: string;
  tags: string[];
  isSnoozed: boolean;
  snoozeUntil?: string;
  isCompleted: boolean; // Added completion status
  completedAt?: string; // Added completion timestamp
  createdAt: string;
  updatedAt: string;
}

interface RemindersContextType {
  reminders: Reminder[];
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string, until: string) => Promise<void>;
  toggleReminderCompletion: (id: string) => Promise<void>; // Added toggle completion
  getDueReminders: () => Reminder[];
  getUpcomingReminders: () => Reminder[];
}

const RemindersContext = createContext<RemindersContextType | null>(null);

const INITIAL_REMINDERS: Reminder[] = [
  {
    id: '1',
    title: 'Team Meeting',
    description: 'Weekly team sync to discuss project progress',
    dueDateTime: '2024-03-20T10:00:00Z',
    repeatInterval: 'weekly',
    tags: ['meetings', 'team'],
    isSnoozed: false,
    isCompleted: false,
    createdAt: '2024-03-13T08:00:00Z',
    updatedAt: '2024-03-13T08:00:00Z'
  },
  {
    id: '2',
    title: 'Project Deadline',
    description: 'Submit final project deliverables',
    dueDateTime: '2024-03-25T17:00:00Z',
    tags: ['project', 'deadline'],
    isSnoozed: false,
    isCompleted: false,
    createdAt: '2024-03-13T09:00:00Z',
    updatedAt: '2024-03-13T09:00:00Z'
  }
];

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);

  const addReminder = useCallback(async (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newReminder: Reminder = {
      ...reminder,
      id: Date.now().toString(),
      isCompleted: false,
      createdAt: now,
      updatedAt: now
    };
    setReminders(prev => [newReminder, ...prev]);
  }, []);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    setReminders(prev => prev.map(reminder =>
      reminder.id === id
        ? { ...reminder, ...updates, updatedAt: new Date().toISOString() }
        : reminder
    ));
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== id));
  }, []);

  const snoozeReminder = useCallback(async (id: string, until: string) => {
    setReminders(prev => prev.map(reminder =>
      reminder.id === id
        ? {
            ...reminder,
            isSnoozed: true,
            snoozeUntil: until,
            updatedAt: new Date().toISOString()
          }
        : reminder
    ));
  }, []);

  const toggleReminderCompletion = useCallback(async (id: string) => {
    setReminders(prev => prev.map(reminder =>
      reminder.id === id
        ? {
            ...reminder,
            isCompleted: !reminder.isCompleted,
            completedAt: !reminder.isCompleted ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString()
          }
        : reminder
    ));
  }, []);

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

  const value = useMemo(() => ({
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    snoozeReminder,
    toggleReminderCompletion,
    getDueReminders,
    getUpcomingReminders
  }), [reminders, addReminder, updateReminder, deleteReminder, snoozeReminder, toggleReminderCompletion, getDueReminders, getUpcomingReminders]);

  return (
    <RemindersContext.Provider value={value}>
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