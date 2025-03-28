import api from '../../services/api/api';
import { Reminder, ReminderLinkData } from '../types/reminder';

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

  async updateReminder(id: string, data: Partial<Reminder>): Promise<Reminder> {
    const response = await api.put<Reminder>(`/api/Reminders/${id}`, data);
    return response.data;
  },

  async deleteReminder(id: string): Promise<void> {
    await api.delete(`/api/Reminders/${id}`);
  },

  async getDeletedReminders(): Promise<Reminder[]> {
    const response = await api.get<Reminder[]>('/api/Reminders/deleted');
    return response.data;
  },

  async deleteReminderPermanently(id: string): Promise<void> {
    await api.delete(`/api/Reminders/${id}/permanent`);
  },

  async addReminderLink(data: ReminderLinkData): Promise<Reminder> {
    const response = await api.post<Reminder>(`/api/Reminders/${data.reminderId}/links`, {
      linkedItemId: data.linkedItemId,
      linkType: data.itemType,
      description: data.description
    });
    return response.data;
  },

  async removeReminderLink(reminderId: string, linkedItemId: string): Promise<Reminder> {
    const response = await api.delete<Reminder>(`/api/Reminders/${reminderId}/links/${linkedItemId}`);
    return response.data;
  }
};
