import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DashboardStat } from '../types/dashboard';
import { useNotes } from './NotesContext';
import { useTasks } from './TasksContext';
import { useReminders } from './RemindersContext';
import { useActivities } from './ActivityContext';
import { calculateWeeklyChange, getNewNotesCount, getLastUpdateTime, DEFAULT_STATS } from '../utils/dashboardContextUtils';

interface StatValue {
  value: number | string;
  change?: number;
  timeframe?: string;
  metadata?: {
    breakdown?: {
      created: number;
      edited: number;
      deleted: number;
    }
  };
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

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Add type for activities
interface Activity {
  actionType: string;
  timestamp: string;
}

const isDashboardStat = (obj: any): obj is DashboardStat => {
  const validTypes = [
    'notes', 'new-notes', 'categories', 'word-count', 
    'tasks', 'tags', 'time', 'ideas', 'activity', 
    'search', 'collaboration'
  ] as const;
  
  return (
    typeof obj.id === 'string' &&
    validTypes.includes(obj.type) &&
    typeof obj.title === 'string' &&
    typeof obj.icon === 'string' &&
    typeof obj.enabled === 'boolean' &&
    typeof obj.order === 'number' &&
    ['small', 'medium', 'large'].includes(obj.size)
  );
};

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { notes, isLoading: notesLoading } = useNotes();
  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const { activities } = useActivities();
  const [isLoading, setIsLoading] = useState(true);

  // Define stats state
  const [stats, setStats] = useState<DashboardStat[]>(() => {
    const saved = localStorage.getItem('dashboard_stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.every(isDashboardStat)) {
        return parsed;
      }
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

    // Filter regular notes and ideas
    const regularNotes = notes.filter(note => !note.isIdea);
    const ideas = notes.filter(note => note.isIdea);

    // Move declarations outside switch
    let allTags: string[];
    let uniqueTags: Set<string>;
    let newRegularNotes: number;
    let today: Date;
    let todayActivities: Activity[];

    switch (statId) {
      case 'categories':
        allTags = [
          ...regularNotes.flatMap(note => note.tags),
          ...tasks.flatMap(task => task.tags),
          ...reminders.flatMap(reminder => reminder.tags)
        ];
        uniqueTags = new Set(allTags);
        return {
          value: uniqueTags.size,
          timeframe: 'Total Categories'
        };

      case 'active-tasks':
        return {
          value: tasks.filter(task => task.status === 'Incomplete').length,
          timeframe: 'Current'
        };

      case 'completed-tasks':
        return {
          value: tasks.filter(task => task.status === 'Completed').length,
          timeframe: 'Total'
        };

      case 'total-notes':
        return {
          value: regularNotes.length,
          change: calculateWeeklyChange(regularNotes, 'created'),
          timeframe: 'This week'
        };

      case 'new-notes':
        newRegularNotes = getNewNotesCount(regularNotes);
        return {
          value: newRegularNotes,
          change: calculateWeeklyChange(regularNotes, 'created'),
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
          value: ideas.length,
          timeframe: 'Total',
          change: calculateWeeklyChange(ideas, 'created')
        };

      case 'shared-notes':
        return {
          value: notes.filter(note => note.linkedTasks && note.linkedTasks.length > 0).length,
          timeframe: 'Total'
        };

      case 'search-frequency':
        // This would need integration with search history
        return {
          value: '0',
          timeframe: 'Today'
        };

      case 'daily-activity':
        today = new Date();
        today.setHours(0, 0, 0, 0);
        todayActivities = activities.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          return activityDate >= today;
        });
        return {
          value: todayActivities.length,
          timeframe: 'Today',
          metadata: {
            breakdown: {
              created: todayActivities.filter(a => a.actionType === 'create').length,
              edited: todayActivities.filter(a => a.actionType === 'edit').length,
              deleted: todayActivities.filter(a => a.actionType === 'delete').length,
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