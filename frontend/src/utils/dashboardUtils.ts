export const getIconBg = (type: string) => {
  switch (type) {
    case 'notes':
      return 'bg-blue-100 dark:bg-blue-900/30 midnight:bg-blue-900/20';
    case 'new-notes':
      return 'bg-green-100 dark:bg-green-900/30 midnight:bg-green-900/20';
    case 'categories':
      return 'bg-yellow-100 dark:bg-yellow-900/30 midnight:bg-yellow-900/20';
    case 'word-count':
      return 'bg-purple-100 dark:bg-purple-900/30 midnight:bg-purple-900/20';
    case 'tags':
      return 'bg-primary-100 dark:bg-primary-900/30 midnight:bg-primary-900/20';
    case 'time':
      return 'bg-purple-100 dark:bg-purple-900/30 midnight:bg-purple-900/20';
    case 'ideas':
      return 'bg-amber-100 dark:bg-amber-900/30 midnight:bg-amber-900/20';
    case 'tasks':
      return 'bg-green-100 dark:bg-green-900/30 midnight:bg-green-900/20';
    case 'activity':
      return 'bg-rose-100 dark:bg-rose-900/30 midnight:bg-rose-900/20';
    case 'search':
      return 'bg-indigo-100 dark:bg-indigo-900/30 midnight:bg-indigo-900/20';
    case 'collaboration':
      return 'bg-teal-100 dark:bg-teal-900/30 midnight:bg-teal-900/20';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30 midnight:bg-gray-900/20';
  }
};

export const getIconColor = (type: string) => {
  switch (type) {
    case 'notes':
      return 'text-blue-600 dark:text-blue-400 midnight:text-blue-300';
    case 'new-notes':
      return 'text-green-600 dark:text-green-400 midnight:text-green-300';
    case 'categories':
      return 'text-yellow-600 dark:text-yellow-400 midnight:text-yellow-300';
    case 'word-count':
      return 'text-purple-600 dark:text-purple-400 midnight:text-purple-300';
    case 'tags':
      return 'text-primary-600 dark:text-primary-400 midnight:text-primary-300';
    case 'time':
      return 'text-purple-600 dark:text-purple-400 midnight:text-purple-300';
    case 'ideas':
      return 'text-amber-600 dark:text-amber-400 midnight:text-amber-300';
    case 'tasks':
      return 'text-green-600 dark:text-green-400 midnight:text-green-300';
    case 'activity':
      return 'text-rose-600 dark:text-rose-400 midnight:text-rose-300';
    case 'search':
      return 'text-indigo-600 dark:text-indigo-400 midnight:text-indigo-300';
    case 'collaboration':
      return 'text-teal-600 dark:text-teal-400 midnight:text-teal-300';
    default:
      return 'text-gray-600 dark:text-gray-400 midnight:text-gray-300';
  }
}; 