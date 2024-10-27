import api from './api';

export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDateTime: string;
  repeatInterval: number;
  customRepeatPattern: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderData {
  title: string;
  description: string;
  dueDateTime: string;
  repeatInterval: number;
  customRepeatPattern?: string;
  priority: number;
}

export const remindersService = {
  async createReminder(data: CreateReminderData): Promise<Reminder> {
    const response = await api.post<Reminder>('/api/Reminders', data);
    return response.data;
  },

  async getReminderById(id: string): Promise<Reminder> {
    const response = await api.get<Reminder>(`/api/Reminders/${id}`);
    return response.data;
  },

  async getReminders(): Promise<Reminder[]> {
    const response = await api.get<Reminder[]>('/api/Reminders');
    return response.data;
  },

  async updateReminder(id: string, data: Partial<CreateReminderData>): Promise<Reminder> {
    const response = await api.put<Reminder>(`/api/Reminders/${id}`, data);
    return response.data;
  },

  async deleteReminder(id: string): Promise<void> {
    await api.delete(`/api/Reminders/${id}`);
  }
};