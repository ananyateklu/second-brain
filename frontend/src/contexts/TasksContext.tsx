import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { taskService } from '../api/services/taskService';  // Import the taskService
import { Task } from '../api/types/task';
import { useAuth } from './AuthContext';


interface TasksContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  addTaskLink: (taskId: string, itemId: string, type: 'note' | 'idea') => void;
  removeTaskLink: (taskId: string, itemId: string, type: 'note' | 'idea') => void;
}

const TasksContext = createContext<TasksContextType | null>(null);


export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks from the backend API when the component mounts
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const response = await taskService.getTasks();
      const fetchedTasks = response.data;
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      const response = await taskService.createTask(taskData);
      const newTask = response.data;
      setTasks(prev => [newTask, ...prev]);
    } catch (err) {
      console.error('Failed to create task:', err);
      throw err;
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const response = await taskService.updateTask(id, updates);
      const updatedTask = response.data;
      setTasks(prev => prev.map(task => task.id === id ? updatedTask : task));
    } catch (err) {
      console.error('Failed to update task:', err);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await taskService.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
      throw err;
    }
  }, []);

  const toggleTaskStatus = useCallback(async (id: string) => {
    try {
      const task = tasks.find(task => task.id === id);
      if (!task) return;

      const updatedStatus = task.status === 'completed' ? 'incomplete' : 'completed';
      const response = await taskService.updateTask(id, { status: updatedStatus });
      const updatedTask = response.data;

      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
    } catch (err) {
      console.error('Failed to toggle task status:', err);
      throw err;
    }
  }, [tasks]);

  const addTaskLink = useCallback((taskId: string, itemId: string, type: 'note' | 'idea') => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const linkField = type === 'note' ? 'linkedNotes' : 'linkedIdeas';
        const currentLinks = task[linkField];
        if (!currentLinks.includes(itemId)) {
          return {
            ...task,
            [linkField]: [...currentLinks, itemId],
            updatedAt: new Date().toISOString()
          };
        }
      }
      return task;
    }));
  }, []);

  const removeTaskLink = useCallback((taskId: string, itemId: string, type: 'note' | 'idea') => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const linkField = type === 'note' ? 'linkedNotes' : 'linkedIdeas';
        return {
          ...task,
          [linkField]: task[linkField].filter(id => id !== itemId),
          updatedAt: new Date().toISOString()
        };
      }
      return task;
    }));
  }, []);

  return (
    <TasksContext.Provider value={{ tasks, addTask, updateTask, deleteTask, toggleTaskStatus, addTaskLink, removeTaskLink }}>
      {children}
    </TasksContext.Provider>
  );
}


export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}