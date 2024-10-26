import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'incomplete' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  tags: string[];
  linkedNotes: string[];
  linkedIdeas: string[];
  createdAt: string;
  updatedAt: string;
  reminders: string[];
}

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

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Review Project Proposal',
    description: 'Review and provide feedback on the Q2 project proposal document.',
    status: 'incomplete',
    priority: 'high',
    dueDate: '2024-03-20T10:00:00Z',
    tags: ['project', 'review'],
    linkedNotes: [],
    linkedIdeas: [],
    createdAt: '2024-03-15T08:00:00Z',
    updatedAt: '2024-03-15T08:00:00Z',
    reminders: ['2024-03-19T15:00:00Z']
  },
  {
    id: '2',
    title: 'Update Documentation',
    description: 'Update the API documentation with new endpoints.',
    status: 'completed',
    priority: 'medium',
    dueDate: '2024-03-18T16:00:00Z',
    tags: ['documentation', 'api'],
    linkedNotes: [],
    linkedIdeas: [],
    createdAt: '2024-03-14T11:00:00Z',
    updatedAt: '2024-03-18T15:30:00Z',
    reminders: []
  }
];

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTasks(prev => [newTask, ...prev]);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    ));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  const toggleTaskStatus = useCallback((id: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? {
            ...task,
            status: task.status === 'completed' ? 'incomplete' : 'completed',
            updatedAt: new Date().toISOString()
          }
        : task
    ));
  }, []);

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
    <TasksContext.Provider value={{
      tasks,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskStatus,
      addTaskLink,
      removeTaskLink
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