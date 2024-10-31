import api from '../../services/api/api';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDateTime: string;
  repeatInterval?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';
  customRepeatPattern?: string;
  isSnoozed: boolean;
  snoozeUntil?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface CreateReminderData {
  Title: string;
  Description?: string;
  DueDateTime: string;
  RepeatInterval?: number;
  CustomRepeatPattern?: string;
}

export const reminderService = {
  async getReminders(): Promise<Reminder[]> {
    const response = await api.get<Reminder[]>('/api/Reminders');
    return response.data;
  },

  async getReminderById(id: string): Promise<Reminder> {
    const response = await api.get<Reminder>(`/api/Reminders/${id}`);
    return response.data;
  },

  async createReminder(data: CreateReminderData): Promise<Reminder> {
    const response = await api.post<Reminder>('/api/Reminders', data);
    return response.data;
  },

  async updateReminder(id: string, data: Partial<CreateReminderData>): Promise<Reminder> {
    const response = await api.put<Reminder>(`/api/Reminders/${id}`, data);
    return response.data;
  },

  async deleteReminder(id: string): Promise<void> {
    await api.delete(`/api/Reminders/${id}`);
  },
};
