import api from './api';
import { Task, UpdateTaskDto, TaskStatus } from '../../types/task';
import { mapPriorityToNumber } from '../../utils/priorityMapping';

export interface TaskLinkData {
  taskId: string;
  linkedItemId: string;
  itemType: 'note' | 'idea';
  description?: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  tags: string[];
}

function mapStatusToNumber(status: TaskStatus): number {
  return status === 'Completed' ? 1 : 0; // All non-completed statuses map to 0
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

  async duplicateTask(taskId: string): Promise<Task> {
    try {
      // Get the task to duplicate
      const response = await api.get<Task>(`/api/Tasks/${taskId}`);
      const originalTask = response.data;

      // Create the new task data
      const newTaskData: CreateTaskData = {
        title: `${originalTask.title} (copy)`,
        description: originalTask.description || '',
        priority: originalTask.priority.toLowerCase() as 'low' | 'medium' | 'high',
        dueDate: originalTask.dueDate,
        tags: originalTask.tags || []
      };

      // Create the duplicate
      const duplicateResponse = await this.createTask(newTaskData);
      return duplicateResponse;
    } catch (error) {
      console.error('Failed to duplicate task:', error);
      throw error;
    }
  },

  async duplicateTasks(taskIds: string[]): Promise<Task[]> {
    try {
      // Duplicate each task in sequence
      const duplicatedTasks: Task[] = [];

      for (const taskId of taskIds) {
        const duplicatedTask = await this.duplicateTask(taskId);
        duplicatedTasks.push(duplicatedTask);
      }

      return duplicatedTasks;
    } catch (error) {
      console.error('Failed to duplicate tasks:', error);
      throw error;
    }
  },

  async addTaskLink(data: TaskLinkData): Promise<Task> {
    const response = await api.post<Task>(`/api/Tasks/${data.taskId}/links`, {
      linkedItemId: data.linkedItemId,
      linkType: data.itemType, // Make sure we're sending the correct type
      description: data.description
    });
    return response.data;
  },

  async removeTaskLink(taskId: string, linkedItemId: string): Promise<Task> {
    const response = await api.delete<Task>(`/api/Tasks/${taskId}/links/${linkedItemId}`);
    return response.data;
  }
};