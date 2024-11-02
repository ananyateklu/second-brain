import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { taskService } from '../api/services/taskService';  // Import the taskService
import { Task } from '../api/types/task';
import { useAuth } from './AuthContext';
import { mapPriorityToNumber } from '../utils/priorityMapping';
import { UpdateTaskDto } from '../api/types/task';
import { useActivities } from './ActivityContext';


interface TasksContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addTaskLink: (taskId: string, itemId: string, type: 'note' | 'idea') => void;
  removeTaskLink: (taskId: string, itemId: string, type: 'note' | 'idea') => void;
  toggleTaskStatus: (id: string) => Promise<void>;
}

const TasksContext = createContext<TasksContextType | null>(null);


export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user } = useAuth();
  const { addActivity } = useActivities();

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
      const priorityNumber = mapPriorityToNumber(taskData.priority);
      const response = await taskService.createTask({
        ...taskData,
        priority: priorityNumber,
      });
      const newTask = response.data;
      setTasks(prev => [newTask, ...prev]);

      // Add activity
      addActivity({
        id: newTask.id,
        actionType: 'create',
        itemType: 'task',
        itemId: newTask.id,
        itemTitle: newTask.title,
        timestamp: new Date().toISOString(),
        description: `Created task "${newTask.title}"`,
        metadata: {
          tags: newTask.tags,
          priority: newTask.priority,
          dueDate: newTask.dueDate,
        },
      });
    } catch (err) {
      console.error('Failed to create task:', err);
      throw err;
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      const updatesToSend: UpdateTaskDto = {};

      if (updates.title !== undefined) updatesToSend.title = updates.title;
      if (updates.description !== undefined) updatesToSend.description = updates.description;
      if (updates.dueDate !== undefined) updatesToSend.dueDate = updates.dueDate;
      if (updates.tags !== undefined) updatesToSend.tags = updates.tags;

      if (updates.priority !== undefined) {
        updatesToSend.priority = mapPriorityToNumber(updates.priority);
      }


      const response = await taskService.updateTask(id, updatesToSend);
      const updatedTask = response.data;
      setTasks(prev => prev.map(task => task.id === id ? updatedTask : task));

      // Add activity
      addActivity({
        id,
        actionType: 'edit',
        itemType: 'task',
        itemId: updatedTask.id,
        itemTitle: updatedTask.title,
        timestamp: new Date().toISOString(),
        description: `Updated task "${updatedTask.title}"`,
        metadata: {
          tags: updatedTask.tags,
          priority: updatedTask.priority,
          dueDate: updatedTask.dueDate,
        },
      });
    } catch (err) {
      console.error('Failed to update task:', err);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const taskToDelete = tasks.find(task => task.id === id);
      if (!taskToDelete) throw new Error('Task not found');

      await taskService.deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));

      // Add activity
      addActivity({
        id,
        actionType: 'delete',
        itemType: 'task',
        itemId: taskToDelete.id,
        itemTitle: taskToDelete.title,
        timestamp: new Date().toISOString(),
        description: `Deleted task "${taskToDelete.title}"`,
        metadata: {
          tags: taskToDelete.tags,
          priority: taskToDelete.priority,
          dueDate: taskToDelete.dueDate,
        },
      });
    } catch (err) {
      console.error('Failed to delete task:', err);
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

  const toggleTaskStatus = useCallback(async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const newStatus = task.status === 'completed' ? 'incomplete' : 'completed';
      
      // Send update to backend with all existing task data
      await taskService.updateTask(id, {
        status: newStatus === 'completed' ? 1 : 0,
        title: task.title,
        description: task.description,
        priority: mapPriorityToNumber(task.priority),
        dueDate: task.dueDate,
        tags: task.tags
      });

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === id 
          ? { ...task, status: newStatus }
          : task
      ));

      // Add activity
      addActivity({
        id,
        actionType: 'edit',
        itemType: 'task',
        itemId: id,
        itemTitle: task.title,
        timestamp: new Date().toISOString(),
        description: `Marked task "${task.title}" as ${newStatus}`,
        metadata: {
          status: newStatus,
        },
      });
    } catch (err) {
      console.error('Failed to toggle task status:', err);
      throw err;
    }
  }, [tasks, addActivity]);

  return (
    <TasksContext.Provider value={{
      tasks,
      addTask,
      updateTask,
      deleteTask,
      addTaskLink,
      removeTaskLink,
      toggleTaskStatus,
    }}>
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