export interface DashboardStat {
  id: string;
  type: 'notes' | 'new-notes' | 'categories' | 'word-count' | 'tasks' | 'tags' | 'time' | 'ideas' | 'activity' | 'connections' | 'collaboration' | 'reminders';
  title: string;
  icon: string;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
  gridPosition?: { row: number; col: number };
} 