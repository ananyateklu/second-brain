import { useMemo, useCallback, memo } from 'react';
import { Calendar, AlertCircle, CheckSquare, Square, Bell, Repeat, FileText, Lightbulb, CheckCircle } from 'lucide-react';
import { Reminder, useReminders } from '../../../contexts/remindersContextUtils';
import { useTheme } from '../../../contexts/themeContextUtils';

interface ReminderCardProps {
  reminder: Reminder;
  viewMode?: 'grid' | 'list';
  isSelected?: boolean;
  context?: 'default' | 'trash' | 'archive' | 'favorites';
  onSelect?: () => void;
  onClick?: (reminder: Reminder) => void;
}

interface CheckboxProps {
  reminder: Reminder;
  context: ReminderCardProps['context'];
  toggleReminderCompletion: (id: string) => void;
  isDark: boolean;
}

interface StatusBadgesProps {
  isOverdue: boolean;
  isSnoozed: boolean;
  isDark: boolean;
}

interface RepeatBadgeProps {
  repeatInterval: string | null | undefined;
  isDark: boolean;
}

interface MetadataProps {
  reminder: Reminder;
  isMidnight?: boolean;
}

interface DateDisplayProps {
  dueDateTime: string;
}

export function ReminderCard({
  reminder,
  viewMode = 'grid',
  isSelected,
  context = 'default',
  onSelect,
  onClick
}: ReminderCardProps) {
  const { theme } = useTheme();
  const { toggleReminderCompletion } = useReminders();
  const isDark = useMemo(() => theme === 'dark' || theme === 'midnight', [theme]);
  const isMidnight = useMemo(() => theme === 'midnight', [theme]);
  const isOverdue = useMemo(() =>
    new Date(reminder.dueDateTime) < new Date() && !reminder.isSnoozed && !reminder.isCompleted,
    [reminder.dueDateTime, reminder.isSnoozed, reminder.isCompleted]
  );

  const containerClasses = useMemo(() => {
    const getBackgroundColor = () => {
      if (theme === 'dark') return 'bg-gray-900/30';
      if (theme === 'midnight') return 'bg-white/5';
      return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const base = `
      relative group w-full
      ${isSelected ? 'ring-2 ring-[var(--color-accent)]' : ''}
      ${getBackgroundColor()}
      backdrop-blur-xl 
      border-[0.25px] border-transparent
      hover:border-purple-300/40 dark:hover:border-purple-400/40
      transition-all duration-300 
      rounded-lg
      shadow-[0_2px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]
      dark:shadow-[0_2px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-1px_rgba(0,0,0,0.15)]
      hover:shadow-[0_4px_10px_-2px_rgba(0,0,0,0.15),0_3px_6px_-2px_rgba(0,0,0,0.1)]
      dark:hover:shadow-[0_4px_10px_-2px_rgba(0,0,0,0.25),0_3px_6px_-2px_rgba(0,0,0,0.2)]
      ring-1 ring-black/5 dark:ring-white/10
      hover:ring-black/10 dark:hover:ring-white/15
      ${onSelect || onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:scale-[1.01]' : ''}
      ${reminder.isCompleted ? 'opacity-85' : ''}
    `;
    return base.trim();
  }, [isSelected, theme, onSelect, onClick, reminder.isCompleted]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
    } else if (onClick) {
      onClick(reminder);
    }
  }, [onSelect, onClick, reminder]);

  const checkboxMemo = useMemo(() => (
    <Checkbox
      reminder={reminder}
      context={context}
      toggleReminderCompletion={toggleReminderCompletion}
      isDark={isDark}
    />
  ), [reminder, context, toggleReminderCompletion, isDark]);

  const statusBadgesMemo = useMemo(() => (
    <StatusBadges
      isOverdue={isOverdue}
      isSnoozed={reminder.isSnoozed}
      isDark={isDark}
    />
  ), [isOverdue, reminder.isSnoozed, isDark]);

  const repeatBadgeMemo = useMemo(() => (
    <RepeatBadge
      repeatInterval={reminder.repeatInterval}
      isDark={isDark}
    />
  ), [reminder.repeatInterval, isDark]);

  const metadataMemo = useMemo(() => (
    <Metadata
      reminder={reminder}
      isMidnight={isMidnight}
    />
  ), [reminder, isMidnight]);

  const titleClasses = useMemo(() =>
    `text-xs font-medium text-[var(--color-text)] truncate ${reminder.isCompleted ? 'line-through text-[var(--color-textSecondary)]' : ''}`,
    [reminder.isCompleted]
  );

  const dateDisplayMemo = useMemo(() => (
    <DateDisplay
      dueDateTime={reminder.dueDateTime}
    />
  ), [reminder.dueDateTime]);

  return (
    <div onClick={handleClick} className={containerClasses}>
      {viewMode === 'list' ? (
        <div className="px-2 py-1.5 h-full flex items-center gap-2">
          {checkboxMemo}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="min-w-0 flex-shrink overflow-hidden">
              <h3 className={titleClasses}>{reminder.title}</h3>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {repeatBadgeMemo}
              {metadataMemo}
              {statusBadgesMemo}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-2 min-h-[60px] flex flex-col justify-between">
          <div className="flex items-center gap-2 w-full">
            {checkboxMemo}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h3 className={titleClasses}>{reminder.title}</h3>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              {repeatBadgeMemo}
              {statusBadgesMemo}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="mt-1 pl-[27px] min-h-[16px]">
              {reminder.linkedItems && reminder.linkedItems.length > 0 && metadataMemo}
            </div>

            <div className="flex justify-end mt-1 pr-1">
              {dateDisplayMemo}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoized subcomponents
const Checkbox = memo(function Checkbox({ reminder, context, toggleReminderCompletion, isDark }: CheckboxProps) {
  const colorVariants = {
    dark: {
      completed: 'bg-purple-900/25 text-purple-300',
      pending: 'text-purple-300'
    },
    light: {
      completed: 'bg-purple-100/80 text-purple-500',
      pending: 'text-purple-500'
    }
  };

  const themeMode = isDark ? 'dark' : 'light';
  const status = reminder.isCompleted ? 'completed' : 'pending';
  const colorClasses = colorVariants[themeMode][status];

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (context === 'default') {
          toggleReminderCompletion(reminder.id);
        }
      }}
      className={`flex-shrink-0 p-1.5 rounded transition-colors ${colorClasses}`}
    >
      {reminder.isCompleted ? (
        <CheckSquare className="w-3.5 h-3.5" />
      ) : (
        <Square className="w-3.5 h-3.5" />
      )}
    </button>
  );
});

const RepeatBadge = memo(function RepeatBadge({ repeatInterval, isDark }: RepeatBadgeProps) {
  if (!repeatInterval) return null;

  return (
    <span className={`
      flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded whitespace-nowrap
      ${isDark
        ? 'bg-purple-900/25 text-purple-300 border-[0.5px] border-purple-500/40'
        : 'bg-purple-50 text-purple-500 border border-purple-200/70'}
    `}>
      <Repeat className="w-2.5 h-2.5" />
      {repeatInterval}
    </span>
  );
});

const StatusBadges = memo(function StatusBadges({ isOverdue, isSnoozed, isDark }: StatusBadgesProps) {
  if (!isOverdue && !isSnoozed) return null;

  return (
    <div className="flex items-center gap-1">
      {isOverdue && (
        <span className={`
          flex items-center justify-center w-5 h-5 rounded-full
          ${isDark
            ? 'bg-red-900/40 text-red-400 border-[0.5px] border-red-500/50'
            : 'bg-red-100 text-red-600 border border-red-200'}
        `}>
          <AlertCircle className="w-3 h-3" />
        </span>
      )}
      {isSnoozed && (
        <span className={`
          flex items-center justify-center w-5 h-5 rounded-full
          ${isDark
            ? 'bg-teal-900/40 text-teal-400 border-[0.5px] border-teal-500/50'
            : 'bg-teal-100 text-teal-600 border border-teal-200'}
        `}>
          <Bell className="w-3 h-3" />
        </span>
      )}
    </div>
  );
});

const DateDisplay = memo(function DateDisplay({ dueDateTime }: DateDisplayProps) {
  if (!dueDateTime) return null;

  return (
    <div className="flex items-center gap-0.5 text-[8px] text-[var(--color-textSecondary)]">
      <Calendar className="w-2 h-2" />
      <span className="whitespace-nowrap">
        {new Date(dueDateTime).toLocaleString(undefined, {
          dateStyle: 'short'
        })}
      </span>
    </div>
  );
});

const Metadata = memo(function Metadata({ reminder, isMidnight }: MetadataProps) {
  // Maximum number of linked items to display
  const MAX_LINKED_ITEMS = 2;

  // Function to determine icon based on item type
  const getItemIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'note':
        return <FileText className="w-2 h-2 flex-shrink-0" />;
      case 'idea':
        return <Lightbulb className="w-2 h-2 flex-shrink-0" />;
      case 'task':
        return <CheckCircle className="w-2 h-2 flex-shrink-0" />;
      default:
        return <Bell className="w-2 h-2 flex-shrink-0" />;
    }
  };

  // Function to determine background color based on item type
  const getItemBgClass = (type: string) => {
    const itemType = type?.toLowerCase();
    if (isMidnight) {
      switch (itemType) {
        case 'note':
          return 'bg-blue-900/40 border border-blue-700/50';
        case 'idea':
          return 'bg-amber-900/40 border border-amber-700/50';
        case 'task':
          return 'bg-green-900/40 border border-green-700/50';
        default:
          return 'bg-purple-900/40 border border-purple-700/50';
      }
    }

    switch (itemType) {
      case 'note':
        return 'bg-blue-100/20 dark:bg-blue-950/30 border border-blue-200/30 dark:border-blue-800/30';
      case 'idea':
        return 'bg-amber-100/20 dark:bg-amber-900/20 border border-amber-200/30 dark:border-amber-800/30';
      case 'task':
        return 'bg-green-100/15 dark:bg-green-900/15 border border-green-200/30 dark:border-green-800/30';
      default:
        return 'bg-purple-100/15 dark:bg-purple-900/15 border border-purple-200/30 dark:border-purple-800/30';
    }
  };

  // Function to determine text color based on item type
  const getItemTextClass = (type: string) => {
    const itemType = type?.toLowerCase();
    if (isMidnight) {
      switch (itemType) {
        case 'note':
          return 'text-blue-200';
        case 'idea':
          return 'text-amber-200';
        case 'task':
          return 'text-green-200';
        default:
          return 'text-purple-200';
      }
    }

    switch (itemType) {
      case 'note':
        return 'text-blue-800 dark:text-blue-400';
      case 'idea':
        return 'text-amber-800 dark:text-amber-400';
      case 'task':
        return 'text-green-800 dark:text-green-400';
      default:
        return 'text-purple-800 dark:text-purple-400';
    }
  };

  return (
    <div className="flex items-center flex-wrap gap-1.5 text-[9px] text-[var(--color-textSecondary)]">
      {/* Linked Items */}
      {reminder.linkedItems && reminder.linkedItems.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          {reminder.linkedItems.slice(0, MAX_LINKED_ITEMS).map((item, index) => (
            <div
              key={item.id || index}
              className={`flex items-center gap-0.5 ${getItemBgClass(item.type)} px-1.5 py-0.5 rounded-full max-w-[140px]`}
            >
              <span className={getItemTextClass(item.type)}>
                {getItemIcon(item.type)}
              </span>
              <span className={`truncate ${getItemTextClass(item.type)}`}>{item.title || "Item"}</span>
            </div>
          ))}
          {reminder.linkedItems.length > MAX_LINKED_ITEMS && (
            <div className={`flex items-center gap-0.5 ${isMidnight ? 'bg-gray-800/50 text-gray-300' : 'bg-gray-100/20 dark:bg-gray-800/20 text-gray-600 dark:text-gray-400'} px-1 py-0.5 rounded-full`}>
              +{reminder.linkedItems.length - MAX_LINKED_ITEMS}
            </div>
          )}
        </div>
      )}
    </div>
  );
});