import api from './api';
import { Reminder, ReminderLinkData } from '../../types/reminder';

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

    async duplicateReminder(reminderId: string): Promise<Reminder> {
        try {
            // Get the reminder to duplicate
            const response = await api.get<Reminder>(`/api/Reminders/${reminderId}`);
            const originalReminder = response.data;

            // Create a new reminder with the same content but new ID
            const newReminderData: CreateReminderData = {
                title: `${originalReminder.title} (copy)`,
                description: originalReminder.description,
                dueDateTime: originalReminder.dueDateTime,
                repeatInterval: originalReminder.repeatInterval as CreateReminderData['repeatInterval'],
                customRepeatPattern: originalReminder.customRepeatPattern,
                tags: originalReminder.tags || [],
            };

            // Create the duplicate
            const duplicateResponse = await api.post<Reminder>('/api/Reminders', newReminderData);
            return duplicateResponse.data;
        } catch (error) {
            console.error('Failed to duplicate reminder:', error);
            throw error;
        }
    },

    async duplicateReminders(reminderIds: string[]): Promise<Reminder[]> {
        try {
            // Duplicate each reminder in sequence
            const duplicatedReminders: Reminder[] = [];

            for (const reminderId of reminderIds) {
                const duplicatedReminder = await this.duplicateReminder(reminderId);
                duplicatedReminders.push(duplicatedReminder);
            }

            return duplicatedReminders;
        } catch (error) {
            console.error('Failed to duplicate reminders:', error);
            throw error;
        }
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