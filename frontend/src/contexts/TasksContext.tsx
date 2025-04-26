import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { TasksContext } from './tasksContextUtils';
import type { Task, UpdateTaskDto } from '../api/types/task';
import { TickTickTask } from '../types/integrations';
import { useAuth } from '../hooks/useAuth';
import { useActivities } from './activityContextUtils';
import { tasksService, TaskLinkData, CreateTaskData } from '../services/api/tasks.service';
import { integrationsService } from '../services/api/integrations.service';

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { createActivity } = useActivities();

  const [tickTickTasks, setTickTickTasks] = useState<TickTickTask[]>([]);
  const [isTickTickLoading, setIsTickTickLoading] = useState(false);
  const [tickTickError, setTickTickError] = useState<string | null>(null);
  const [isTickTickConnected, setIsTickTickConnected] = useState<boolean>(() => {
    const stored = localStorage.getItem('ticktick_connected');
    return stored === 'true';
  });
  const [tickTickProjectId, setTickTickProjectId] = useState<string>(() => {
    return localStorage.getItem('ticktick_project_id') || '';
  });

  // Persist TickTick connection status to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ticktick_connected', isTickTickConnected.toString());
  }, [isTickTickConnected]);

  // Persist TickTick project ID to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ticktick_project_id', tickTickProjectId);
  }, [tickTickProjectId]);

  // Check TickTick connection status
  const checkTickTickStatus = useCallback(async (forceCheck: boolean = false) => {
    try {
      // Skip network request if we already know we're connected and this isn't a forced check
      if (isTickTickConnected && !forceCheck) {
        return;
      }

      const status = await integrationsService.getTickTickStatus(isTickTickConnected);

      // Only update the state if it's different from current state or we're forcing a check
      if (status.isConnected !== isTickTickConnected || forceCheck) {
        console.log(`TickTick connection status changed: ${isTickTickConnected} → ${status.isConnected}`);
        setIsTickTickConnected(status.isConnected);
      }
    } catch (error) {
      console.error('Failed to check TickTick connection status:', error);
      // Don't change state on errors to avoid flickering during network issues
    }
  }, [isTickTickConnected]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedTasks = await tasksService.getTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Failed to fetch local tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchTickTickTasks = useCallback(async () => {
    if (!user || !isTickTickConnected) return;
    setIsTickTickLoading(true);
    setTickTickError(null);
    try {
      const fetchedTickTickTasks = await integrationsService.getTickTickTasks(tickTickProjectId);
      setTickTickTasks(fetchedTickTickTasks);
    } catch (error: unknown) {
      console.error('Failed to fetch TickTick tasks:', error);
      let message = "Failed to load TickTick tasks.";
      if (error instanceof Error) {
        message = error.message;
      }
      setTickTickError(message);
    } finally {
      setIsTickTickLoading(false);
    }
  }, [user, isTickTickConnected, tickTickProjectId]);

  // Update TickTick project ID and refetch tasks
  const updateTickTickProjectId = useCallback(async (projectId: string) => {
    setTickTickProjectId(projectId);
    // If there's a project ID and we're connected, fetch tasks immediately
    if (projectId && isTickTickConnected) {
      await fetchTickTickTasks();
    }
  }, [isTickTickConnected, fetchTickTickTasks]);

  useEffect(() => {
    fetchTasks();
    if (isTickTickConnected && tickTickProjectId) {
      fetchTickTickTasks();
    }
  }, [fetchTasks, fetchTickTickTasks, isTickTickConnected, tickTickProjectId]);

  // Add a separate effect to check TickTick connection status on mount and when auth changes
  useEffect(() => {
    if (user) {
      // If user is authenticated, validate our localStorage connection status with backend
      checkTickTickStatus(true); // Force a check on authentication

      // Subscribe to SignalR reconnection events to revalidate TickTick connection
      const handleReconnect = () => {
        console.log("SignalR reconnected - validating TickTick connection status");
        // Delay check slightly to ensure backend services are fully available
        setTimeout(() => checkTickTickStatus(true), 1000);
      };

      window.addEventListener('signalr:reconnected', handleReconnect);

      return () => {
        window.removeEventListener('signalr:reconnected', handleReconnect);
      };
    }
  }, [user, checkTickTickStatus]);

  const addTask = useCallback(async (taskData: CreateTaskData) => {
    try {
      const newTask = await tasksService.createTask(taskData);
      setTasks(prev => [newTask, ...prev]);

      if (createActivity) {
        createActivity({
          actionType: 'create',
          itemType: 'task',
          itemId: newTask.id,
          itemTitle: newTask.title,
          description: `Created task "${newTask.title}"`,
          metadata: {
            tags: newTask.tags,
            dueDate: newTask.dueDate,
            priority: newTask.priority,
            status: newTask.status
          }
        });
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }, [createActivity]);

  const updateTask = useCallback(async (id: string, updates: UpdateTaskDto) => {
    try {
      const updatedTask = await tasksService.updateTask(id, updates);
      setTasks(prev => prev.map(task => {
        if (task.id === id) {
          return {
            ...updatedTask,
            linkedItems: task.linkedItems
          };
        }
        return task;
      }));

      if (createActivity) {
        createActivity({
          actionType: 'edit',
          itemType: 'task',
          itemId: id,
          itemTitle: updatedTask.title,
          description: `Updated task "${updatedTask.title}"`,
          metadata: {
            tags: updatedTask.tags,
            dueDate: updatedTask.dueDate,
            priority: updatedTask.priority,
            status: updatedTask.status
          }
        });
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }, [createActivity]);

  const addTaskLink = useCallback(async (data: TaskLinkData) => {
    try {
      const updatedTask = await tasksService.addTaskLink(data);
      setTasks(prev => prev.map(task =>
        task.id === data.taskId ? updatedTask : task
      ));

      window.dispatchEvent(new Event('taskChange'));
    } catch (error) {
      console.error('Failed to add task link:', error);
      throw error;
    }
  }, []);

  const removeTaskLink = useCallback(async (taskId: string, linkedItemId: string) => {
    try {
      const updatedTask = await tasksService.removeTaskLink(taskId, linkedItemId);
      setTasks(prev => prev.map(task => task.id === taskId ? updatedTask : task));

      window.dispatchEvent(new Event('taskChange'));
    } catch (error) {
      console.error('Failed to remove task link:', error);
      throw error;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await tasksService.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }, []);

  const fetchDeletedTasks = useCallback(async () => {
    try {
      return await tasksService.getDeletedTasks();
    } catch (error) {
      console.error('Failed to fetch deleted tasks:', error);
      throw error;
    }
  }, []);

  const restoreTask = useCallback(async (id: string) => {
    try {
      const restoredTask = await tasksService.restoreTask(id);
      setTasks(prev => [...prev, restoredTask]);
    } catch (error) {
      console.error('Failed to restore task:', error);
      throw error;
    }
  }, []);

  const toggleTaskStatus = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === 'Completed' ? 'Incomplete' : 'Completed';
    await updateTask(id, { status: newStatus });
  }, [tasks, updateTask]);

  const duplicateTask = useCallback(async (taskId: string): Promise<Task> => {
    try {
      const duplicatedTask = await tasksService.duplicateTask(taskId);
      setTasks(prev => [duplicatedTask, ...prev]);

      if (createActivity) {
        createActivity({
          actionType: 'create',
          itemType: 'task',
          itemId: duplicatedTask.id,
          itemTitle: duplicatedTask.title,
          description: `Duplicated task: ${duplicatedTask.title}`,
          metadata: {
            tags: duplicatedTask.tags,
            dueDate: duplicatedTask.dueDate,
            priority: duplicatedTask.priority,
            status: duplicatedTask.status
          }
        });
      }

      return duplicatedTask;
    } catch (error) {
      console.error('Failed to duplicate task:', error);
      throw error;
    }
  }, [createActivity]);

  const duplicateTasks = useCallback(async (taskIds: string[]): Promise<Task[]> => {
    try {
      const duplicatedTasks = await tasksService.duplicateTasks(taskIds);
      setTasks(prev => [...duplicatedTasks, ...prev]);

      for (const task of duplicatedTasks) {
        if (createActivity) {
          createActivity({
            actionType: 'create',
            itemType: 'task',
            itemId: task.id,
            itemTitle: task.title,
            description: `Duplicated task: ${task.title}`,
            metadata: {
              tags: task.tags,
              dueDate: task.dueDate,
              priority: task.priority,
              status: task.status
            }
          });
        }
      }

      return duplicatedTasks;
    } catch (error) {
      console.error('Failed to duplicate tasks:', error);
      throw error;
    }
  }, [createActivity]);

  const getTickTickTask = useCallback(async (projectId: string, taskId: string): Promise<TickTickTask | null> => {
    try {
      const task = await integrationsService.getTickTickTask(projectId, taskId);
      return task;
    } catch (error) {
      console.error('Failed to fetch TickTick task:', error);
      return null;
    }
  }, []);

  const updateTickTickTask = useCallback(async (taskId: string, task: Partial<TickTickTask> & { id: string; projectId: string }): Promise<TickTickTask | null> => {
    try {
      const updatedTask = await integrationsService.updateTickTickTask(taskId, task);

      // After successful update, refresh the TickTick tasks list to show updated data
      await fetchTickTickTasks();

      return updatedTask;
    } catch (error) {
      console.error('Failed to update TickTick task:', error);
      return null;
    }
  }, [fetchTickTickTasks]);

  const completeTickTickTask = useCallback(async (projectId: string, taskId: string): Promise<boolean> => {
    try {
      const success = await integrationsService.completeTickTickTask(projectId, taskId);

      // After successful completion, refresh the TickTick tasks list to show updated data
      if (success) {
        await fetchTickTickTasks();
      }

      return success;
    } catch (error) {
      console.error('Failed to complete TickTick task:', error);
      return false;
    }
  }, [fetchTickTickTasks]);

  const deleteTickTickTask = useCallback(async (projectId: string, taskId: string): Promise<boolean> => {
    try {
      const success = await integrationsService.deleteTickTickTask(projectId, taskId);

      // After successful deletion, refresh the TickTick tasks list to show updated data
      if (success) {
        await fetchTickTickTasks();
      }

      return success;
    } catch (error) {
      console.error('Failed to delete TickTick task:', error);
      return false;
    }
  }, [fetchTickTickTasks]);

  const contextValue = useMemo(() => ({
    tasks,
    isLoading,
    tickTickTasks,
    isTickTickLoading,
    tickTickError,
    fetchTickTickTasks,
    isTickTickConnected,
    refreshTickTickConnection: checkTickTickStatus,
    tickTickProjectId,
    updateTickTickProjectId,
    addTask,
    updateTask,
    deleteTask,
    addTaskLink,
    removeTaskLink,
    toggleTaskStatus,
    fetchDeletedTasks,
    restoreTask,
    duplicateTask,
    duplicateTasks,
    getTickTickTask,
    updateTickTickTask,
    completeTickTickTask,
    deleteTickTickTask,
  }), [
    tasks,
    isLoading,
    tickTickTasks,
    isTickTickLoading,
    tickTickError,
    fetchTickTickTasks,
    isTickTickConnected,
    checkTickTickStatus,
    tickTickProjectId,
    updateTickTickProjectId,
    addTask,
    updateTask,
    deleteTask,
    addTaskLink,
    removeTaskLink,
    toggleTaskStatus,
    fetchDeletedTasks,
    restoreTask,
    duplicateTask,
    duplicateTasks,
    getTickTickTask,
    updateTickTickTask,
    completeTickTickTask,
    deleteTickTickTask,
  ]);

  return (
    <TasksContext.Provider value={contextValue}>
      {children}
    </TasksContext.Provider>
  );
}