import api from '../../services/api/api';
import { Task, UpdateTaskDto } from '../types/task';
import { mapPriorityToNumber } from '../../utils/priorityMapping';

export const taskService = {
  getTasks: () => api.get<Task[]>('/api/Tasks'),

  getTask: (id: string) => api.get<Task>(`/api/Tasks/${id}`),

  createTask: (taskData: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string | null;
    tags: string[];
  }) => {
    const priorityNumber = mapPriorityToNumber(taskData.priority);
    return api.post<Task>('/api/Tasks', {
      ...taskData,
      priority: priorityNumber,
    });
  },

  async updateTask(id: string, updates: UpdateTaskDto): Promise<Task> {
    const response = await api.patch<Task>(`/api/Tasks/${id}`, updates);
    return response.data;
  },

  deleteTask: (id: string) => api.delete(`/api/Tasks/${id}`),
};