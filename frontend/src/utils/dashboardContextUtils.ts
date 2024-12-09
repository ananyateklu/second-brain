import { createContext } from 'react';
import { DashboardStat } from '../types/dashboard';
import { Note } from '../types/note';

export interface StatValue {
  value: number | string;
  change?: number;
  timeframe?: string;
  description?: string;
  additionalInfo?: Array<{
    icon?: React.ComponentType<{ className?: string }>;
    label?: string;
    value: string | number;
  }>;
  metadata?: {
    breakdown?: {
      total: number;
      created: number;
      edited: number;
      deleted: number;
    }
  };
  topBreakdown?: {
    active: number;
    archived: number;
  };
}

export interface DashboardContextType {
  availableStats: DashboardStat[];
  enabledStats: DashboardStat[];
  toggleStat: (statId: string) => void;
  reorderStats: (startIndex: number, endIndex: number, newOrder?: DashboardStat[]) => void;
  getStatValue: (statId: string) => StatValue;
  updateStatSize: (statId: string, size: 'small' | 'medium' | 'large') => void;
  isLoading: boolean;
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const calculateWeeklyChange = (notes: Note[], type: 'created' | 'updated') => {
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

export const getNewNotesCount = (notes: Note[]) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return notes.filter(note => new Date(note.createdAt) > weekAgo).length;
};

export const getLastUpdateTime = (notes: Note[]) => {
  if (notes.length === 0) return 'No notes yet';
  const lastUpdate = Math.max(...notes.map(note => new Date(note.updatedAt).getTime()));
  return formatTimeAgo(new Date(lastUpdate));
};

export const formatTimeAgo = (date: Date) => {
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

export const isDashboardStat = (obj: unknown): obj is DashboardStat => {
  const validTypes = [
    'notes',
    'tasks',
    'reminders',
    'connections',
    'categories',
    'new-notes',
    'word-count',
    'tags',
    'time',
    'ideas',
    'activity',
    'collaboration',
    'notes-stats'
  ] as const;
  
  type ValidType = typeof validTypes[number];
  
  if (typeof obj !== 'object' || obj === null) return false;
  
  const stat = obj as Record<string, unknown>;
  const type = stat.type;
  
  return (
    typeof stat.id === 'string' &&
    typeof type === 'string' &&
    validTypes.includes(type as ValidType) &&
    typeof stat.title === 'string' &&
    typeof stat.icon === 'string' &&
    typeof stat.enabled === 'boolean' &&
    typeof stat.order === 'number' &&
    typeof stat.size === 'string' &&
    ['small', 'medium', 'large'].includes(stat.size)
  );
};

export const DEFAULT_STATS: DashboardStat[] = [
  {
    id: 'total-notes-v2',
    type: 'notes',
    title: 'Total Notes',
    icon: 'Files',
    enabled: true,
    order: 0,
    size: 'medium'
  },
  {
    id: 'notes-stats',
    type: 'notes',
    title: 'Notes Overview',
    icon: 'FileText',
    enabled: true,
    order: 1,
    size: 'medium'
  },
  {
    id: 'new-notes',
    type: 'new-notes',
    title: 'New Notes',
    icon: 'FolderPlus',
    enabled: true,
    order: 2,
    size: 'medium'
  },
  {
    id: 'categories',
    type: 'categories',
    title: 'Categories',
    icon: 'Tags',
    enabled: true,
    order: 3,
    size: 'small'
  },
  {
    id: 'word-count',
    type: 'word-count',
    title: 'Word Count',
    icon: 'AlignLeft',
    enabled: true,
    order: 4,
    size: 'small'
  },
  {
    id: 'ideas-count',
    type: 'ideas',
    title: 'Ideas',
    icon: 'Lightbulb',
    enabled: true,
    order: 5,
    size: 'small'
  },
  {
    id: 'active-tasks',
    type: 'tasks',
    title: 'Active Tasks',
    icon: 'CheckSquare',
    enabled: true,
    order: 6,
    size: 'small'
  },
  {
    id: 'completed-tasks',
    type: 'tasks',
    title: 'Completed Tasks',
    icon: 'CheckSquare',
    enabled: false,
    order: 7,
    size: 'small'
  },
  {
    id: 'daily-activity',
    type: 'activity',
    title: 'Activity',
    icon: 'Activity',
    enabled: true,
    order: 8,
    size: 'large'
  },
  {
    id: 'connections',
    type: 'connections',
    title: 'Connections',
    icon: 'Network',
    enabled: true,
    order: 9,
    size: 'medium'
  },
  {
    id: 'reminders',
    type: 'reminders',
    title: 'Reminders',
    icon: 'Bell',
    enabled: false,
    order: 10,
    size: 'small'
  }
]; 