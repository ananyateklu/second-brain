import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { TasksContext } from './tasksContextUtils';
import type { Task, UpdateTaskDto } from '../api/types/task';
import { useAuth } from '../hooks/useAuth';
import { useActivities } from './activityContextUtils';
import { tasksService, TaskLinkData, CreateTaskData } from '../services/api/tasks.service';

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { createActivity } = useActivities();

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetchedTasks = await tasksService.getTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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

      // Dispatch event to notify note context
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

      // Dispatch event to notify note context
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

      // Log activity for each duplicated task
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

  const contextValue = useMemo(() => ({
    tasks,
    isLoading,
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
  }), [
    tasks,
    isLoading,
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
  ]);

  return (
    <TasksContext.Provider value={contextValue}>
      {children}
    </TasksContext.Provider>
  );
}