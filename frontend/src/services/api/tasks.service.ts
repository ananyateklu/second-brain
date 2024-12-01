import api from './api';
import { Task, UpdateTaskDto } from '../../api/types/task';
import { mapPriorityToNumber } from '../../utils/priorityMapping';

export interface TaskLinkData {
  taskId: string;
  linkedItemId: string;
  linkType: 'note' | 'idea';
  description?: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  tags: string[];
}

function mapStatusToNumber(status: 'Incomplete' | 'Completed'): number {
  return status === 'Completed' ? 1 : 0;
}

export const tasksService = {
  async createTask(data: CreateTaskData): Promise<Task> {
    const priorityNumber = mapPriorityToNumber(data.priority);
    const response = await api.post<Task>('/api/Tasks', {
      ...data,
      priority: priorityNumber,
    });
    return response.data;
  },

  async getTasks(): Promise<Task[]> {
    const response = await api.get<Task[]>('/api/Tasks');
    return response.data;
  },

  async getTaskById(id: string): Promise<Task> {
    const response = await api.get<Task>(`/api/Tasks/${id}`);
    return response.data;
  },

  async getDeletedTasks(): Promise<Task[]> {
    const response = await api.get<Task[]>('/api/Tasks/deleted');
    return response.data;
  },

  async updateTask(id: string, updates: UpdateTaskDto): Promise<Task> {
    try {
      // Map priority and status to numbers if they exist in updates
      const updatesWithMappedValues = {
        ...updates,
        priority: updates.priority ? mapPriorityToNumber(updates.priority) : undefined,
        status: updates.status ? mapStatusToNumber(updates.status) : undefined
      };

      const response = await api.patch<Task>(`/api/Tasks/${id}`, updatesWithMappedValues);
      return response.data;
    } catch (error) {
      console.error('Task update API error:', error);
      throw error;
    }
  },

  async restoreTask(id: string): Promise<Task> {
    const response = await api.post<Task>(`/api/Tasks/${id}/restore`);
    return response.data;
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/api/Tasks/${id}`);
  },

  async deleteTaskPermanently(id: string): Promise<void> {
    await api.delete(`/api/Tasks/${id}/permanent`);
  },

  async addTaskLink(data: TaskLinkData): Promise<Task> {
    const response = await api.post<Task>(`/api/Tasks/${data.taskId}/links`, data);
    return response.data;
  },

  async removeTaskLink(taskId: string, linkedItemId: string): Promise<Task> {
    const response = await api.delete<Task>(`/api/Tasks/${taskId}/links/${linkedItemId}`);
    return response.data;
  }
};