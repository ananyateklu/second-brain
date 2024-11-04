import api from './api';
import { UpdateTaskDto } from '../../api/types/task';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: number;
  dueDate: string;
  status: string;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: number;
  dueDate: string;
}

export const tasksService = {
  async createTask(data: CreateTaskData): Promise<Task> {
    const response = await api.post<Task>('/api/Tasks', data);
    return response.data;
  },

  async getTaskById(id: string): Promise<Task> {
    const response = await api.get<Task>(`/api/Tasks/${id}`);
    return response.data;
  },

  async getTasks(): Promise<Task[]> {
    const response = await api.get<Task[]>('/api/Tasks');
    return response.data;
  },

  async getDeletedTasks(): Promise<Task[]> {
    const response = await api.get<Task[]>('/api/Tasks/deleted');
    return response.data;
  },

  async updateTask(id: string, updates: UpdateTaskDto): Promise<Task> {
    const response = await api.patch<Task>(`/api/Tasks/${id}`, updates);
    return response.data;
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
};