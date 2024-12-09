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

export interface DashboardStat {
  id: string;
  type: DashboardStatType;
  title: string;
  icon: string;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
  gridPosition?: {
    row: number;
    col: number;
  };
} 