export const getIconColor = (type: string) => {
  switch (type) {
    case 'notes':
      return 'text-blue-600 dark:text-blue-400';
    case 'tags':
      return 'text-primary-600 dark:text-primary-400';
    case 'time':
      return 'text-purple-600 dark:text-purple-400';
    case 'ideas':
      return 'text-amber-600 dark:text-amber-400';
    case 'collaboration':
      return 'text-green-600 dark:text-green-400';
    case 'tasks':
      return 'text-red-600 dark:text-red-400';
    case 'search':
      return 'text-indigo-600 dark:text-indigo-400';
    case 'activity':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

export const getIconBg = (type: string) => {
  switch (type) {
    case 'notes':
      return 'bg-blue-100 dark:bg-blue-900/30';
    case 'tags':
      return 'bg-primary-100 dark:bg-primary-900/30';
    case 'time':
      return 'bg-purple-100 dark:bg-purple-900/30';
    case 'ideas':
      return 'bg-amber-100 dark:bg-amber-900/30';
    case 'collaboration':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'tasks':
      return 'bg-red-100 dark:bg-red-900/30';
    case 'search':
      return 'bg-indigo-100 dark:bg-indigo-900/30';
    case 'activity':
      return 'bg-orange-100 dark:bg-orange-900/30';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30';
  }
}; 