import { Note } from '../types/note';

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

export const getLastUpdateTime = (notes: Note[]) => {
  if (notes.length === 0) return 'No notes yet';
  const lastUpdate = Math.max(...notes.map(note => new Date(note.updatedAt).getTime()));
  return formatTimeAgo(new Date(lastUpdate));
};

export const DEFAULT_STATS = [
  {
    id: 'total-notes',
    type: 'notes',
    title: 'Total Notes',
    icon: 'Files',
    enabled: true,
    order: 0,
    size: 'medium'
  },
  {
    id: 'new-notes',
    type: 'new-notes',
    title: 'New Notes',
    icon: 'FolderPlus',
    enabled: true,
    order: 1,
    size: 'medium'
  },
  {
    id: 'categories',
    type: 'categories',
    title: 'Categories',
    icon: 'Tags',
    enabled: true,
    order: 2,
    size: 'small'
  },
  {
    id: 'word-count',
    type: 'word-count',
    title: 'Word Count',
    icon: 'AlignLeft',
    enabled: true,
    order: 3,
    size: 'small'
  },
  {
    id: 'ideas-count',
    type: 'ideas',
    title: 'Ideas',
    icon: 'Lightbulb',
    enabled: true,
    order: 4,
    size: 'small'
  },
  {
    id: 'active-tasks',
    type: 'tasks',
    title: 'Active Tasks',
    icon: 'CheckSquare',
    enabled: true,
    order: 5,
    size: 'small'
  },
  {
    id: 'completed-tasks',
    type: 'tasks',
    title: 'Completed',
    icon: 'CheckSquare',
    enabled: false,
    order: 6,
    size: 'small'
  },
  {
    id: 'daily-activity',
    type: 'activity',
    title: 'Activity',
    icon: 'Activity',
    enabled: true,
    order: 7,
    size: 'medium'
  },
  {
    id: 'search-frequency',
    type: 'search',
    title: 'Searches',
    icon: 'Search',
    enabled: false,
    order: 8,
    size: 'small'
  },
  {
    id: 'shared-notes',
    type: 'collaboration',
    title: 'Shared Notes',
    icon: 'Share2',
    enabled: false,
    order: 9,
    size: 'small'
  },
  {
    id: 'last-update',
    type: 'time',
    title: 'Last Update',
    icon: 'Clock',
    enabled: true,
    order: 10,
    size: 'medium'
  }
]; 