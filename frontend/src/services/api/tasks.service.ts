import api from './api';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: number;
  dueDate: string;
  status: string;
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

  async updateTask(id: string, data: Partial<CreateTaskData>): Promise<Task> {
    const response = await api.put<Task>(`/api/Tasks/${id}`, data);
    return response.data;
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/api/Tasks/${id}`);
  }
};