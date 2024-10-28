import api from '../../services/api/api';
import { Task } from '../types/task';

export const taskService = {
  getTasks: () => api.get<Task[]>('/api/Tasks'),

  getTask: (id: string) => api.get<Task>(`/api/Tasks/${id}`),

  createTask: (taskData: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string | null;
    tags: string[];
    // Include other fields required by the backend
  }) => api.post<Task>('/api/Tasks', taskData),

  updateTask: (id: string, updates: Partial<Task>) =>
    api.patch<Task>(`/api/Tasks/${id}`, updates),

  deleteTask: (id: string) => api.delete(`/api/Tasks/${id}`),
};