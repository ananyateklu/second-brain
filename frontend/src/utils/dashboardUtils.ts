export const getIconBg = (type: string) => {
  const baseClass = 'bg-opacity-20 backdrop-blur-sm';

  switch (type) {
    case 'notes':
      return `${baseClass} bg-[var(--color-note)]/10`;
    case 'new-notes':
      return `${baseClass} bg-[var(--color-task)]/10`;
    case 'categories':
      return `${baseClass} bg-[var(--color-tag)]/10`;
    case 'word-count':
      return `${baseClass} bg-[var(--color-reminder)]/10`;
    case 'tags':
      return `${baseClass} bg-[var(--color-tag)]/10`;
    case 'time':
      return `${baseClass} bg-[var(--color-reminder)]/10`;
    case 'ideas':
      return `${baseClass} bg-[var(--color-idea)]/10`;
    case 'tasks':
      return `${baseClass} bg-[var(--color-task)]/10`;
    case 'activity':
      return `${baseClass} bg-[var(--color-note)]/10`;
    case 'connections':
      return `${baseClass} bg-[var(--color-note)]/10`;
    case 'collaboration':
      return `${baseClass} bg-[var(--color-task)]/10`;
    case 'reminders':
      return `${baseClass} bg-[var(--color-reminder)]/10`;
    case 'content-freshness':
      return `${baseClass} bg-teal-500/10`;
    case 'task-completion-rate':
      return `${baseClass} bg-green-500/10`;
    case 'tasks-due-soon':
      return `${baseClass} bg-orange-500/10`;
    default:
      return `${baseClass} bg-[var(--color-text)]/10`;
  }
};

export const getIconColor = (type: string) => {
  const baseClass = 'transition-colors duration-200';

  switch (type.toUpperCase()) {
    case 'NOTES':
      return `${baseClass} text-blue-600 dark:text-blue-400 midnight:text-blue-400`;
    case 'NEW-NOTES':
      return `${baseClass} text-green-600 dark:text-green-400 midnight:text-green-400`;
    case 'CATEGORIES':
      return `${baseClass} text-yellow-600 dark:text-yellow-400 midnight:text-yellow-400`;
    case 'WORD-COUNT':
      return `${baseClass} text-red-600 dark:text-red-400 midnight:text-red-400`;
    case 'TAGS':
      return `${baseClass} text-primary-600 dark:text-primary-400 midnight:text-primary-400`;
    case 'TIME':
      return `${baseClass} text-purple-600 dark:text-purple-400 midnight:text-purple-400`;
    case 'IDEAS':
      return `${baseClass} text-amber-600 dark:text-amber-400 midnight:text-amber-400`;
    case 'TASKS':
      return `${baseClass} text-green-600 dark:text-green-400 midnight:text-green-400`;
    case 'ACTIVITY':
      return `${baseClass} text-indigo-600 dark:text-indigo-400 midnight:text-indigo-400`;
    case 'CONNECTIONS':
      return `${baseClass} text-blue-600 dark:text-blue-400 midnight:text-blue-400`;
    case 'COLLABORATION':
      return `${baseClass} text-teal-600 dark:text-teal-400 midnight:text-teal-400`;
    case 'REMINDERS':
      return `${baseClass} text-purple-600 dark:text-purple-400 midnight:text-purple-400`;
    case 'CONTENT-FRESHNESS':
      return `${baseClass} text-teal-600 dark:text-teal-400 midnight:text-teal-400`;
    case 'TASK-COMPLETION-RATE':
      return `${baseClass} text-green-600 dark:text-green-400 midnight:text-green-400`;
    case 'TASKS-DUE-SOON':
      return `${baseClass} text-orange-600 dark:text-orange-400 midnight:text-orange-400`;
    case 'TICKTICK_TASK':
      return `${baseClass} text-pink-600 dark:text-pink-400 midnight:text-pink-400`;
    case 'TICKTICK_NOTE':
      return `${baseClass} text-sky-600 dark:text-sky-400 midnight:text-sky-400`;
    default:
      return `${baseClass} text-gray-600 dark:text-gray-400 midnight:text-gray-400`;
  }
};

export function getNoteCardBg() {
  return 'backdrop-blur-[2px] bg-white/50 dark:bg-gray-900/50';
} 