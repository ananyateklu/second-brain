import { createContext, useContext } from 'react';
import { Task, UpdateTaskDto } from '../api/types/task';
import { TaskLinkData, CreateTaskData } from '../services/api/tasks.service';

export interface TasksContextType {
  tasks: Task[];
  isLoading: boolean;
  addTask: (taskData: CreateTaskData) => Promise<void>;
  updateTask: (id: string, updates: UpdateTaskDto) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskLink: (data: TaskLinkData) => Promise<void>;
  removeTaskLink: (taskId: string, linkedItemId: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  fetchDeletedTasks: () => Promise<Task[]>;
  restoreTask: (id: string) => Promise<void>;
  duplicateTask: (taskId: string) => Promise<Task>;
  duplicateTasks: (taskIds: string[]) => Promise<Task[]>;
}

export const TasksContext = createContext<TasksContextType | null>(null);

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}; 