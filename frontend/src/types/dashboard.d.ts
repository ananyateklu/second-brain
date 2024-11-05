export interface DashboardStat {
  id: string;
  type: 'notes' | 'tags' | 'time' | 'ideas' | 'tasks' | 'activity' | 'search' | 'collaboration';
  title: string;
  icon: string;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
} 