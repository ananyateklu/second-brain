import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DashboardStat } from '../types/dashboard';
import { useNotes } from './NotesContext';
import { useTasks } from './TasksContext';
import { Note } from '../types/note';
import { Task } from '../types/task';
import { useActivities } from './ActivityContext';

// Helper functions first
const calculateWeeklyChange = (notes: Note[], type: 'created' | 'updated') => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = notes.filter(note => {
    const date = new Date(type === 'created' ? note.createdAt : note.updatedAt);
    return date >= oneWeekAgo;
  }).length;

  const lastWeek = notes.filter(note => {
    const date = new Date(type === 'created' ? note.createdAt : note.updatedAt);
    return date >= twoWeeksAgo && date < oneWeekAgo;
  }).length;

  return thisWeek - lastWeek;
};

const getNewNotesCount = (notes: Note[]) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return notes.filter(note => new Date(note.createdAt) > weekAgo).length;
};

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

const getLastUpdateTime = (notes: Note[]) => {
  if (notes.length === 0) return 'No notes yet';
  const lastUpdate = Math.max(...notes.map(note => new Date(note.updatedAt).getTime()));
  return formatTimeAgo(new Date(lastUpdate));
};

interface StatValue {
  value: number | string;
  change?: number;
  timeframe?: string;
}

interface DashboardContextType {
  availableStats: DashboardStat[];
  enabledStats: DashboardStat[];
  toggleStat: (statId: string) => void;
  reorderStats: (startIndex: number, endIndex: number, newOrder?: DashboardStat[]) => void;
  getStatValue: (statId: string) => StatValue;
  updateStatSize: (statId: string, size: 'small' | 'medium' | 'large') => void;
  isLoading: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const DEFAULT_STATS: DashboardStat[] = [
  {
    id: 'total-notes',
    type: 'notes',
    title: 'Total Notes',
    icon: 'FileText',
    enabled: true,
    order: 0,
    size: 'medium'
  },
  {
    id: 'new-notes',
    type: 'notes',
    title: 'New Notes',
    icon: 'Plus',
    enabled: true,
    order: 1,
    size: 'medium'
  },
  {
    id: 'categories',
    type: 'tags',
    title: 'Categories',
    icon: 'TagIcon',
    enabled: true,
    order: 2,
    size: 'medium'
  },
  {
    id: 'last-update',
    type: 'time',
    title: 'Last Update',
    icon: 'Clock',
    enabled: true,
    order: 3,
    size: 'medium'
  },
  {
    id: 'active-tasks',
    type: 'tasks',
    title: 'Active Tasks',
    icon: 'CheckSquare',
    enabled: true,
    order: 4,
    size: 'medium'
  },
  {
    id: 'completed-tasks',
    type: 'tasks',
    title: 'Completed Tasks',
    icon: 'CheckSquare',
    enabled: true,
    order: 5,
    size: 'medium'
  },
  {
    id: 'word-count',
    type: 'notes',
    title: 'Word Count',
    icon: 'AlignLeft',
    enabled: true,
    order: 6,
    size: 'medium'
  },
  {
    id: 'ideas-count',
    type: 'ideas',
    title: 'Ideas',
    icon: 'Lightbulb',
    enabled: true,
    order: 7,
    size: 'medium'
  },
  {
    id: 'shared-notes',
    type: 'collaboration',
    title: 'Shared Notes',
    icon: 'Share2',
    enabled: true,
    order: 8,
    size: 'medium'
  },
  {
    id: 'search-frequency',
    type: 'search',
    title: 'Searches',
    icon: 'Search',
    enabled: true,
    order: 9,
    size: 'medium'
  },
  {
    id: 'daily-activity',
    type: 'activity',
    title: 'Today\'s Activity',
    icon: 'Activity',
    enabled: true,
    order: 10,
    size: 'medium'
  }
];

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { notes, isLoading: notesLoading } = useNotes();
  const { tasks } = useTasks();
  const { activities } = useActivities();
  const [isLoading, setIsLoading] = useState(true);

  // Define stats state
  const [stats, setStats] = useState<DashboardStat[]>(() => {
    const saved = localStorage.getItem('dashboard_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.from(
        new Map(parsed.map((stat: DashboardStat) => [stat.id, stat])).values()
      );
    }
    return DEFAULT_STATS;
  });

  // Update loading state when both notes and tasks are ready
  useEffect(() => {
    if (!notesLoading && (notes.length > 0 || tasks.length > 0)) {
      setIsLoading(false);
    }
  }, [notes, tasks, notesLoading]);

  // Add debug logs
  useEffect(() => {
    console.log('Dashboard state:', {
      notesLoading,
      notesCount: notes.length,
      tasksCount: tasks.length,
      isLoading
    });
  }, [notes, tasks, notesLoading, isLoading]);

  const getStatValue = (statId: string): StatValue => {
    // If still loading, return placeholder values
    if (isLoading || notesLoading) {
      return {
        value: '-',
        timeframe: 'Loading...'
      };
    }

    switch (statId) {
      case 'categories':
        const uniqueTags = new Set(notes.flatMap(note => note.tags));
        return { 
          value: uniqueTags.size,
          timeframe: 'Total'
        };

      case 'active-tasks':
        return {
          value: tasks.filter(task => task.status === 'incomplete').length,
          timeframe: 'Current'
        };

      case 'completed-tasks':
        return {
          value: tasks.filter(task => task.status === 'completed').length,
          timeframe: 'Total'
        };

      case 'total-notes':
        return { 
          value: notes.length,
          change: calculateWeeklyChange(notes, 'created'),
          timeframe: 'This week'
        };
        
      case 'new-notes':
        const newNotes = getNewNotesCount(notes);
        return { 
          value: newNotes,
          change: calculateWeeklyChange(notes, 'created'),
          timeframe: 'vs last week'
        };
        
      case 'last-update':
        return { 
          value: getLastUpdateTime(notes),
          timeframe: 'Last activity'
        };
        
      case 'word-count':
        return {
          value: notes.reduce((total, note) => {
            const wordCount = note.content.trim().split(/\s+/).length;
            return total + wordCount;
          }, 0).toLocaleString(),
          timeframe: 'Total'
        };
        
      case 'ideas-count':
        return {
          value: notes.filter(note => note.tags.includes('idea')).length,
          timeframe: 'Total'
        };
        
      case 'shared-notes':
        return {
          value: notes.filter(note => note.shared?.length > 0).length,
          timeframe: 'Total'
        };
        
      case 'search-frequency':
        // This would need integration with search history
        return {
          value: '0',
          timeframe: 'Today'
        };
        
      case 'daily-activity':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Count all activities for today
        const todayActivities = activities.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          return activityDate >= today;
        });

        return {
          value: todayActivities.length,
          timeframe: 'Today',
          // Add metadata for tooltip
          metadata: {
            breakdown: {
              created: todayActivities.filter(a => a.actionType === 'create').length,
              edited: todayActivities.filter(a => a.actionType === 'edit').length,
              deleted: todayActivities.filter(a => a.actionType === 'delete').length,
              // Add other action types as needed
            }
          }
        };
        
      default:
        return { value: 0 };
    }
  };

  const toggleStat = useCallback((statId: string) => {
    setStats(prevStats => {
      const newStats = prevStats.map(stat => {
        if (stat.id === statId) {
          return { ...stat, enabled: !stat.enabled };
        }
        return stat;
      });
      localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
      return newStats;
    });
  }, []);

  const reorderStats = useCallback((startIndex: number, endIndex: number, newOrder?: DashboardStat[]) => {
    if (newOrder) {
      setStats(newOrder);
      localStorage.setItem('dashboard_stats', JSON.stringify(newOrder));
      return;
    }

    setStats(prevStats => {
      const enabledStats = prevStats.filter(stat => stat.enabled);
      const reorderedStats = Array.from(enabledStats);
      const [removed] = reorderedStats.splice(startIndex, 1);
      reorderedStats.splice(endIndex, 0, removed);
      
      const newStats = prevStats.map(stat => {
        if (!stat.enabled) return stat;
        const newIndex = reorderedStats.findIndex(s => s.id === stat.id);
        return { ...stat, order: newIndex };
      });

      localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
      return newStats;
    });
  }, []);

  const updateStatSize = useCallback((statId: string, size: 'small' | 'medium' | 'large') => {
    setStats(prevStats => {
      const newStats = prevStats.map(stat => {
        if (stat.id === statId) {
          return { ...stat, size };
        }
        return stat;
      });
      localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
      return newStats;
    });
  }, []);

  return (
    <DashboardContext.Provider value={{
      availableStats: stats,
      enabledStats: stats.filter(stat => stat.enabled).sort((a, b) => a.order - b.order),
      toggleStat,
      reorderStats,
      getStatValue,
      updateStatSize,
      isLoading
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}; 