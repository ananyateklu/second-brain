import api from '../../services/api/api';
import { Reminder } from '../types/reminder';

export interface CreateReminderData {
  title: string;
  description?: string;
  dueDateTime: string;
  repeatInterval?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | 'Custom';
  customRepeatPattern?: string;
  tags?: string[];
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
