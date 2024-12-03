import React, { useState, useCallback, useEffect } from 'react';
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

  const addTask = async (taskData: CreateTaskData) => {
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
  };

  const updateTask = async (id: string, updates: UpdateTaskDto) => {
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
  };

  const addTaskLink = async (data: TaskLinkData) => {
    try {
      const updatedTask = await tasksService.addTaskLink(data);
      setTasks(prev => prev.map(task => task.id === data.taskId ? updatedTask : task));
    } catch (error) {
      console.error('Failed to add task link:', error);
      throw error;
    }
  };

  const removeTaskLink = async (taskId: string, linkedItemId: string) => {
    try {
      const updatedTask = await tasksService.removeTaskLink(taskId, linkedItemId);
      setTasks(prev => prev.map(task => task.id === taskId ? updatedTask : task));
    } catch (error) {
      console.error('Failed to remove task link:', error);
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await tasksService.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  const fetchDeletedTasks = async () => {
    try {
      return await tasksService.getDeletedTasks();
    } catch (error) {
      console.error('Failed to fetch deleted tasks:', error);
      throw error;
    }
  };

  const restoreTask = async (id: string) => {
    try {
      const restoredTask = await tasksService.restoreTask(id);
      setTasks(prev => [...prev, restoredTask]);
    } catch (error) {
      console.error('Failed to restore task:', error);
      throw error;
    }
  };

  const toggleTaskStatus = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = task.status === 'Completed' ? 'Incomplete' : 'Completed';
    await updateTask(id, { status: newStatus });
  };

  return (
    <TasksContext.Provider value={{
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
    }}>
      {children}
    </TasksContext.Provider>
  );
}