export interface DashboardStat {
  id: string;
  type: 'notes' | 'new-notes' | 'categories' | 'word-count' | 'tasks' | 'tags' | 'time' | 'ideas' | 'activity' | 'connections' | 'collaboration' | 'reminders' | 'connection-types' | 'notes-stats' | 'content-freshness' | 'task-completion-rate' | 'tasks-due-soon';
  title: string;
  icon: string;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
  gridPosition?: { row: number; col: number };
} 