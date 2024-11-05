import React, { createContext, useContext, useState, useEffect } from 'react';
import { DashboardStat } from '../types/dashboard';

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
    size: 'small'
  },
  {
    id: 'new-notes',
    type: 'notes',
    title: 'New this week',
    icon: 'Plus',
    enabled: true,
    order: 1,
    size: 'small'
  },
  {
    id: 'categories',
    type: 'tags',
    title: 'Categories',
    icon: 'TagIcon',
    enabled: true,
    order: 2,
    size: 'small'
  },
  {
    id: 'last-update',
    type: 'time',
    title: 'Last Update',
    icon: 'Clock',
    enabled: true,
    order: 3,
    size: 'small'
  },
  {
    id: 'total-ideas',
    type: 'ideas',
    title: 'Total Ideas',
    icon: 'Lightbulb',
    enabled: false,
    order: 4,
    size: 'small'
  },
  {
    id: 'shared-notes',
    type: 'collaboration',
    title: 'Shared Notes',
    icon: 'Share2',
    enabled: false,
    order: 5,
    size: 'small'
  },
  {
    id: 'active-tasks',
    type: 'tasks',
    title: 'Active Tasks',
    icon: 'CheckSquare',
    enabled: false,
    order: 6,
    size: 'small'
  },
  {
    id: 'search-frequency',
    type: 'search',
    title: 'Most Searched',
    icon: 'Search',
    enabled: false,
    order: 7,
    size: 'small'
  },
  {
    id: 'daily-edits',
    type: 'activity',
    title: 'Today\'s Edits',
    icon: 'Edit3',
    enabled: false,
    order: 8,
    size: 'small'
  },
  {
    id: 'word-count',
    type: 'notes',
    title: 'Total Words',
    icon: 'AlignLeft',
    enabled: false,
    order: 9,
    size: 'small'
  },
  {
    id: 'completed-tasks',
    type: 'tasks',
    title: 'Completed Tasks',
    icon: 'CheckCircle',
    enabled: false,
    order: 10,
    size: 'small'
  }
];

export function DashboardProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [stats, setStats] = useState<DashboardStat[]>(() => {
    const saved = localStorage.getItem('dashboard_stats');
    return saved ? JSON.parse(saved) : DEFAULT_STATS;
  });

  useEffect(() => {
    localStorage.setItem('dashboard_stats', JSON.stringify(stats));
  }, [stats]);

  const toggleStat = (statId: string) => {
    setStats(prevStats => {
      const newStats = prevStats.map(stat => {
        if (stat.id === statId) {
          return { 
            ...stat, 
            enabled: !stat.enabled,
            order: stat.enabled ? 0 : Math.max(...prevStats.filter(s => s.enabled).map(s => s.order)) + 1 
          };
        }
        return stat;
      });
      return newStats;
    });
  };

  const reorderStats = (startIndex: number, endIndex: number, newOrder?: DashboardStat[]) => {
    setStats(prevStats => {
      if (newOrder) {
        // Create a map of new orders
        const orderMap = new Map(newOrder.map((stat, index) => [stat.id, index]));
        
        // Update all stats, maintaining enabled/disabled status
        return prevStats.map(stat => {
          const newOrder = orderMap.get(stat.id);
          return {
            ...stat,
            order: typeof newOrder === 'number' ? newOrder : stat.order
          };
        });
      }
      return prevStats;
    });
  };

  const getStatValue = (statId: string): StatValue => {
    switch (statId) {
      case 'total-notes':
        return { value: 142, change: 12, timeframe: 'This week' };
      case 'new-notes':
        return { value: 24, change: 8, timeframe: 'vs last week' };
      case 'categories':
        return { value: 16, change: 2, timeframe: 'This month' };
      case 'last-update':
        return { value: '2 hours ago', timeframe: 'Last activity' };
      case 'total-ideas':
        return { value: 57, change: 5, timeframe: 'This week' };
      case 'shared-notes':
        return { value: 8, change: 2, timeframe: 'This week' };
      case 'active-tasks':
        return { value: 12, change: -3, timeframe: 'vs last week' };
      case 'search-frequency':
        return { value: 'productivity', timeframe: 'Most used term' };
      case 'daily-edits':
        return { value: 15, change: 5, timeframe: 'Today' };
      case 'word-count':
        return { value: '24.5k', change: 1200, timeframe: 'This week' };
      case 'completed-tasks':
        return { value: 28, change: 8, timeframe: 'This week' };
      default:
        return { value: 0 };
    }
  };

  const updateStatSize = (statId: string, size: 'small' | 'medium' | 'large') => {
    setStats(prevStats => {
      const newStats = prevStats.map(stat => 
        stat.id === statId ? { ...stat, size } : stat
      );
      // Save to localStorage
      localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
      return newStats;
    });
  };

  return (
    <DashboardContext.Provider value={{
      availableStats: stats,
      enabledStats: stats.filter(stat => stat.enabled).sort((a, b) => a.order - b.order),
      toggleStat,
      reorderStats,
      getStatValue,
      updateStatSize
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