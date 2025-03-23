export type DashboardStatType =
  | 'notes'
  | 'tasks'
  | 'reminders'
  | 'connections'
  | 'categories'
  | 'new-notes'
  | 'word-count'
  | 'tags'
  | 'time'
  | 'ideas'
  | 'activity'
  | 'collaboration'
  | 'notes-stats';

export type StatType =
  | 'notes'
  | 'tasks'
  | 'reminders'
  | 'activity'
  | 'ideas'
  | 'tags'
  | 'connections'
  | 'archive'
  | 'trash'
  | 'categories'
  | 'new-notes'
  | 'word-count'
  | 'notes-stats';
export type ChartType = 'line' | 'bar' | 'progress' | 'none';

export interface DashboardStat {
  id: string;
  title: string;
  description?: string;
  icon: string;
  type: StatType;
  order: number;
  enabled: boolean;
  size?: 'small' | 'medium' | 'large';
  chartType?: ChartType;
  colSpan?: number;
  gridPosition?: {
    row: number;
    col: number;
  };
  graphVisible?: boolean;
} 