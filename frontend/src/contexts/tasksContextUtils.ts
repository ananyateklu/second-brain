import { createContext, useContext } from 'react';
import { Task, UpdateTaskDto } from '../types/task';
import { TaskLinkData, CreateTaskData } from '../services/api/tasks.service';
import { TickTickTask } from '../types/integrations'; // Import TickTickTask type
import { SyncConfig, SyncResult } from '../services/api/integrations.service';

export interface TasksContextType {
  tasks: Task[]; // Local tasks
  isLoading: boolean; // Loading state for local tasks

  // TickTick specific state
  tickTickTasks: TickTickTask[];
  isTickTickLoading: boolean;
  tickTickError: string | null;
  fetchTickTickTasks: () => Promise<void>; // Function to trigger fetch
  isTickTickConnected: boolean; // Add a flag to know if TickTick is connected
  refreshTickTickConnection: () => Promise<void>; // Add a method to refresh the connection status
  tickTickProjectId: string; // Store the currently selected project ID
  updateTickTickProjectId: (projectId: string) => Promise<void>; // Update the project ID
  getTickTickTask: (projectId: string, taskId: string) => Promise<TickTickTask | null>; // Fetch single TickTick task
  updateTickTickTask: (taskId: string, task: Partial<TickTickTask> & { id: string; projectId: string }) => Promise<TickTickTask | null>; // Update a TickTick task
  completeTickTickTask: (projectId: string, taskId: string) => Promise<boolean>; // Complete a TickTick task
  deleteTickTickTask: (projectId: string, taskId: string) => Promise<boolean>; // Delete a TickTick task

  // Sync functionality
  syncWithTickTick: (config: SyncConfig) => Promise<SyncResult>;
  getSyncStatus: () => Promise<{
    lastSynced: string | null;
    taskCount: { local: number; tickTick: number; mapped: number };
  }>;
  resetSyncData: () => Promise<boolean>;
  isSyncing: boolean;
  syncError: string | null;

  // Add the new function type here
  createTickTickTask: (projectId: string, taskData: Partial<TickTickTask>) => Promise<TickTickTask | null>;

  // Existing actions
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