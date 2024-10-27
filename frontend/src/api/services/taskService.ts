import api from '../config/axios';
import { Task } from '../types/task';

export const taskService = {
  getTasks: () => api.get<Task[]>('/api/Tasks'),
  
  getTask: (id: string) => api.get<Task>(`/api/Tasks/${id}`),
  
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => 
    api.post<Task>('/api/Tasks', task),
  
  updateTask: (id: string, task: Partial<Task>) => 
    api.patch<Task>(`/api/Tasks/${id}`, task),
  
  deleteTask: (id: string) => api.delete(`/api/Tasks/${id}`)
};