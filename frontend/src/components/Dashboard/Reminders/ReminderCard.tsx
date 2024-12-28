import { useMemo, useCallback, memo } from 'react';
import { Calendar, Tag as TagIcon, AlertCircle, CheckSquare, Square, Bell, Type, Lightbulb } from 'lucide-react';
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

interface TagListProps {
  visibleItems: Array<{ type: string; id: string; title: string; }>;
  remainingCount: number;
  itemColorClasses: (type: string) => string;
  itemIcon: (type: string) => JSX.Element;
  viewMode: ReminderCardProps['viewMode'];
}

interface MetadataProps {
  reminder: Reminder;
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
  const { snoozeReminder, toggleReminderCompletion } = useReminders();
  const isDark = useMemo(() => theme === 'dark' || theme === 'midnight', [theme]);
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
      border-[0.25px] border-green-200/30 dark:border-green-700/30
      hover:border-green-400/50 dark:hover:border-green-500/50
      transition-all duration-300 
      rounded-lg
      shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.08)]
      dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.3)]
      hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.2),0_6px_12px_-4px_rgba(0,0,0,0.15)]
      dark:hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),0_6px_12px_-4px_rgba(0,0,0,0.4)]
      ring-1 ring-black/5 dark:ring-white/10
      hover:ring-black/10 dark:hover:ring-white/20
      ${onSelect || onClick ? 'cursor-pointer hover:-translate-y-1 hover:scale-[1.02]' : ''}
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

  const handleSnooze = useCallback((duration: number) => {
    const until = new Date(Date.now() + duration);
    snoozeReminder(reminder.id, until.toISOString());
  }, [snoozeReminder, reminder.id]);

  // Calculate visible and remaining items
  const MAX_VISIBLE_ITEMS = viewMode === 'list' ? 8 : 7;
  const allItems = useMemo(() => [
    ...(reminder.tags || []).map(tag => ({ type: 'tag', id: tag, title: tag })),
    ...(reminder.linkedItems || [])
  ], [reminder.tags, reminder.linkedItems]);

  const visibleItems = useMemo(() => allItems.slice(0, MAX_VISIBLE_ITEMS), [allItems, MAX_VISIBLE_ITEMS]);
  const remainingCount = useMemo(() => Math.max(0, allItems.length - MAX_VISIBLE_ITEMS), [allItems.length, MAX_VISIBLE_ITEMS]);

  const itemColorClasses = useCallback((type: string) => {
    if (type === 'tag') return isDark
      ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[0.5px] border-gray-700'
      : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/30';
    if (type === 'idea') return isDark
      ? 'bg-[var(--color-idea)]/10 text-[var(--color-idea)] border-[0.5px] border-gray-700'
      : 'bg-[var(--color-idea)]/10 text-[var(--color-idea)] border border-[var(--color-idea)]/30';
    if (type === 'note') return isDark
      ? 'bg-[var(--color-note)]/10 text-[var(--color-note)] border-[0.5px] border-gray-700'
      : 'bg-[var(--color-note)]/10 text-[var(--color-note)] border border-[var(--color-note)]/30';
    return isDark
      ? 'bg-[var(--color-note)]/10 text-[var(--color-note)] border-[0.5px] border-gray-700'
      : 'bg-[var(--color-note)]/10 text-[var(--color-note)] border border-[var(--color-note)]/30';
  }, [isDark]);

  const itemIcon = useCallback((type: string) => {
    if (type === 'tag') return <TagIcon className="w-3 h-3 flex-shrink-0" />;
    if (type === 'idea') return <Lightbulb className="w-3 h-3 flex-shrink-0" />;
    return <Type className="w-3 h-3 flex-shrink-0" />;
  }, []);

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

  const tagsMemo = useMemo(() => (
    <TagList
      visibleItems={visibleItems}
      remainingCount={remainingCount}
      itemColorClasses={itemColorClasses}
      itemIcon={itemIcon}
      viewMode={viewMode}
    />
  ), [visibleItems, remainingCount, itemColorClasses, itemIcon, viewMode]);

  const metadataMemo = useMemo(() => (
    <Metadata reminder={reminder} />
  ), [reminder]);

  const titleClasses = useMemo(() =>
    `text-sm font-medium text-[var(--color-text)] truncate ${reminder.isCompleted ? 'line-through text-[var(--color-textSecondary)]' : ''}`,
    [reminder.isCompleted]
  );

  const descriptionClasses = useMemo(() =>
    `text-xs text-[var(--color-textSecondary)] ${viewMode === 'list' ? 'truncate' : 'line-clamp-2'} ${reminder.isCompleted ? 'line-through opacity-75' : ''}`,
    [reminder.isCompleted, viewMode]
  );

  return (
    <div onClick={handleClick} className={containerClasses}>
      {viewMode === 'list' ? (
        <div className="px-3 py-2.5 h-full flex items-center gap-3">
          {checkboxMemo}
          <div className="flex-1 min-w-0 flex items-center gap-4">
            <div className="min-w-[200px] max-w-[300px] flex-shrink overflow-hidden">
              <h3 className={titleClasses}>{reminder.title}</h3>
              {reminder.description && (
                <p className={descriptionClasses}>{reminder.description}</p>
              )}
            </div>
            <div className="min-w-[180px]">{metadataMemo}</div>
            <div className="flex-1 min-w-0">{tagsMemo}</div>
            {statusBadgesMemo}
          </div>
        </div>
      ) : (
        <div className="p-3 h-[180px] flex flex-col">
          <div className="flex items-start gap-2 mb-2">
            {checkboxMemo}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h3 className={titleClasses}>{reminder.title}</h3>
              {reminder.description && (
                <p className={`mt-0.5 ${descriptionClasses}`}>{reminder.description}</p>
              )}
            </div>
            {statusBadgesMemo}
          </div>

          <div className="flex-1 flex flex-col justify-between min-h-0">
            <div className="overflow-hidden">
              <div className="h-[56px] overflow-hidden">
                {tagsMemo}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border)]">
              {metadataMemo}
              {!reminder.isSnoozed && !reminder.isCompleted && context === 'default' && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSnooze(5 * 60 * 1000);
                    }}
                    className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-textSecondary)] hover:bg-[var(--color-secondary)] rounded transition-colors"
                  >
                    5m
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSnooze(60 * 60 * 1000);
                    }}
                    className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-textSecondary)] hover:bg-[var(--color-secondary)] rounded transition-colors"
                  >
                    1h
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSnooze(24 * 60 * 60 * 1000);
                    }}
                    className="px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-textSecondary)] hover:bg-[var(--color-secondary)] rounded transition-colors"
                  >
                    1d
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoized subcomponents
const Checkbox = memo(function Checkbox({ reminder, context, toggleReminderCompletion, isDark }: CheckboxProps) {
  const hasTag = reminder.tags && reminder.tags.length > 0;

  const colorVariants = {
    dark: {
      completed: hasTag ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'bg-purple-900/30 text-purple-400',
      pending: hasTag ? 'text-[var(--color-accent)]' : 'text-purple-400'
    },
    light: {
      completed: hasTag ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'bg-purple-100 text-purple-600',
      pending: hasTag ? 'text-[var(--color-accent)]' : 'text-purple-600'
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

const StatusBadges = memo(function StatusBadges({ isOverdue, isSnoozed, isDark }: StatusBadgesProps) {
  if (!isOverdue && !isSnoozed) return null;

  return (
    <div className="flex items-center gap-1.5">
      {isOverdue && (
        <span className={`
          flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded whitespace-nowrap
          ${isDark
            ? 'bg-red-900/30 text-red-400 border-[0.5px] border-red-500/50'
            : 'bg-red-100 text-red-600 border border-red-200'}
        `}>
          <AlertCircle className="w-3 h-3" />
          Overdue
        </span>
      )}
      {isSnoozed && (
        <span className={`
          flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded whitespace-nowrap
          ${isDark
            ? 'bg-blue-900/30 text-blue-400 border-[0.5px] border-blue-500/50'
            : 'bg-blue-100 text-blue-600 border border-blue-200'}
        `}>
          <Bell className="w-3 h-3" />
          Snoozed
        </span>
      )}
    </div>
  );
});

const TagList = memo(function TagList({ visibleItems, remainingCount, itemColorClasses, itemIcon, viewMode }: TagListProps) {
  if (visibleItems.length === 0) return null;
  return (
    <div className={`
      flex flex-wrap gap-1
      ${viewMode === 'list' ? 'items-center' : 'items-start'}
      min-h-[20px] overflow-hidden
    `}>
      {visibleItems.map(item => (
        <span
          key={item.id}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${itemColorClasses(item.type)}`}
        >
          {itemIcon(item.type)}
          <span className="truncate max-w-[120px]">{item.title}</span>
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-surface)] text-[var(--color-textSecondary)] border border-[var(--color-border)] whitespace-nowrap">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
});

const Metadata = memo(function Metadata({ reminder }: MetadataProps) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[var(--color-textSecondary)]">
      {reminder.dueDateTime && (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span className="whitespace-nowrap">
            {new Date(reminder.dueDateTime).toLocaleString(undefined, {
              dateStyle: 'short',
              timeStyle: 'short'
            })}
          </span>
        </div>
      )}
      {reminder.linkedItems && reminder.linkedItems.length > 0 && (
        <div className="flex items-center gap-1">
          <Bell className="w-3 h-3" />
          <span>{reminder.linkedItems.length} linked</span>
        </div>
      )}
    </div>
  );
});