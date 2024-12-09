export const getIconBg = (type: string) => {
  const baseClass = 'bg-opacity-20 backdrop-blur-sm';
  
  switch (type) {
    case 'notes':
      return `${baseClass} bg-blue-100/80 dark:bg-blue-900/30 midnight:bg-blue-900/20`;
    case 'new-notes':
      return `${baseClass} bg-green-100/80 dark:bg-green-900/30 midnight:bg-green-900/20`;
    case 'categories':
      return `${baseClass} bg-yellow-100 dark:bg-yellow-900/30 midnight:bg-yellow-900/20`;
    case 'word-count':
      return `${baseClass} bg-purple-100 dark:bg-purple-900/30 midnight:bg-purple-900/20`;
    case 'tags':
      return `${baseClass} bg-primary-100 dark:bg-primary-900/30 midnight:bg-primary-900/20`;
    case 'time':
      return `${baseClass} bg-purple-100 dark:bg-purple-900/30 midnight:bg-purple-900/20`;
    case 'ideas':
      return `${baseClass} bg-amber-100 dark:bg-amber-900/30 midnight:bg-amber-900/20`;
    case 'tasks':
      return `${baseClass} bg-green-100 dark:bg-green-900/30 midnight:bg-green-900/20`;
    case 'activity':
      return `${baseClass} bg-rose-100 dark:bg-rose-900/30 midnight:bg-rose-900/20`;
    case 'connections':
      return `${baseClass} bg-blue-100 dark:bg-blue-900/30 midnight:bg-blue-900/20`;
    case 'collaboration':
      return `${baseClass} bg-teal-100 dark:bg-teal-900/30 midnight:bg-teal-900/20`;
    case 'reminders':
      return `${baseClass} bg-indigo-100 dark:bg-indigo-900/30 midnight:bg-indigo-900/20`;
    default:
      return `${baseClass} bg-gray-100/80 dark:bg-gray-900/30 midnight:bg-gray-900/20`;
  }
};

export const getIconColor = (type: string) => {
  const baseClass = 'transition-colors duration-200';
  
  switch (type) {
    case 'notes':
      return `${baseClass} text-blue-600 dark:text-blue-400 midnight:text-blue-300`;
    case 'new-notes':
      return `${baseClass} text-green-600 dark:text-green-400 midnight:text-green-300`;
    case 'categories':
      return `${baseClass} text-yellow-600 dark:text-yellow-400 midnight:text-yellow-300`;
    case 'word-count':
      return `${baseClass} text-purple-600 dark:text-purple-400 midnight:text-purple-300`;
    case 'tags':
      return `${baseClass} text-primary-600 dark:text-primary-400 midnight:text-primary-300`;
    case 'time':
      return `${baseClass} text-purple-600 dark:text-purple-400 midnight:text-purple-300`;
    case 'ideas':
      return `${baseClass} text-amber-600 dark:text-amber-400 midnight:text-amber-300`;
    case 'tasks':
      return `${baseClass} text-green-600 dark:text-green-400 midnight:text-green-300`;
    case 'activity':
      return `${baseClass} text-rose-600 dark:text-rose-400 midnight:text-rose-300`;
    case 'connections':
      return `${baseClass} text-blue-600 dark:text-blue-400 midnight:text-blue-300`;
    case 'collaboration':
      return `${baseClass} text-teal-600 dark:text-teal-400 midnight:text-teal-300`;
    case 'reminders':
      return `${baseClass} text-indigo-600 dark:text-indigo-400 midnight:text-indigo-300`;
    default:
      return `${baseClass} text-gray-600 dark:text-gray-400 midnight:text-gray-300`;
  }
};

export function getNoteCardBg(type?: 'note' | 'idea' | 'task' | 'reminder') {
  const baseClass = 'backdrop-blur-[2px]';
  
  switch (type) {
    case 'note':
      return `${baseClass} bg-white/50 dark:bg-gray-900/50`;
    case 'idea':
      return `${baseClass} bg-white/50 dark:bg-gray-900/50`;
    case 'task':
      return `${baseClass} bg-white/50 dark:bg-gray-900/50`;
    case 'reminder':
      return `${baseClass} bg-white/50 dark:bg-gray-900/50`;
    default:
      return `${baseClass} bg-white/50 dark:bg-gray-900/50`;
  }
} 