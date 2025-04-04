import { useState, useMemo, useCallback, memo, Suspense, lazy } from 'react';
import { Calendar, Tag as TagIcon, Clock, Type, Lightbulb, Square, CheckSquare, Link2, Archive, Bell } from 'lucide-react';
import { Task } from '../../../api/types/task';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { formatTimeAgo } from '../Recent/utils';

// Lazy load the WarningModal
const WarningModal = lazy(() => import('../../shared/WarningModal').then(module => ({ default: module.WarningModal })));

interface TaskCardProps {
  task: Task;
  viewMode?: 'grid' | 'list' | 'mindMap';
  isSelected?: boolean;
  context?: 'default' | 'trash' | 'archive' | 'favorites' | 'duplicate';
  onSelect?: () => void;
  onClick?: (task: Task) => void;
  contextData?: {
    expiresAt?: string;
    deletedAt?: string;
    archivedAt?: string;
  };
}

interface LinkedItem {
  id: string;
  type: string;
  title: string;
}

interface CheckboxProps {
  task: Task;
  context: TaskCardProps['context'];
  updateTask: (id: string, updates: Partial<Task>) => void;
  isDark: boolean;
}

interface PriorityBadgeProps {
  priority?: string;
  priorityColorClasses: (priority: string) => string;
}

interface TagListProps {
  visibleItems: LinkedItem[];
  remainingCount: number;
  itemColorClasses: (type: string) => string;
  itemIcon: (type: string) => JSX.Element;
  viewMode: TaskCardProps['viewMode'];
  isDark: boolean;
}

interface DateDisplayProps {
  dueDate: string | null | undefined;
}

interface MetadataProps {
  task: Task;
  isMidnight?: boolean;
}

interface ContextInfoProps {
  context: TaskCardProps['context'];
  contextData?: TaskCardProps['contextData'];
  getDaysUntilExpiration: () => number | null;
}

function ContextInfo({ context, contextData, getDaysUntilExpiration }: ContextInfoProps) {
  if (context === 'trash' && contextData?.deletedAt) {
    const daysLeft = getDaysUntilExpiration();
    return (
      <div className="flex items-center gap-2 text-[10px] text-red-500 mt-1">
        <Clock className="w-2.5 h-2.5" />
        <span>Deleted {formatTimeAgo(contextData.deletedAt)}</span>
        {daysLeft !== null && (
          <span className="text-red-600 dark:text-red-400">({daysLeft}d left)</span>
        )}
      </div>
    );
  }
  if (context === 'archive' && contextData?.archivedAt) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-[var(--color-textSecondary)] mt-1">
        <Archive className="w-2.5 h-2.5" />
        <span>Archived {formatTimeAgo(contextData.archivedAt)}</span>
      </div>
    );
  }
  return null;
}
const MemoizedContextInfo = memo(ContextInfo);

export function TaskCard({
  task,
  viewMode = 'grid',
  isSelected,
  context = 'default',
  onSelect,
  onClick,
  contextData
}: TaskCardProps) {
  const { updateTask } = useTasks();
  const { theme } = useTheme();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [isSafari] = useState(() => /^((?!chrome|android).)*safari/i.test(navigator.userAgent));

  const isDark = useMemo(() => theme === 'dark' || theme === 'midnight', [theme]);
  const isMidnight = useMemo(() => theme === 'midnight', [theme]);

  const getBackgroundClass = useMemo(() => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') {
      return isSafari ? 'bg-[var(--note-bg-color)] bg-opacity-[var(--note-bg-opacity,0.3)]' : 'bg-[#1e293b]/30';
    }
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  }, [theme, isSafari]);

  const containerClasses = useMemo(() => {
    const base = `
      relative group w-full
      ${isSelected ? 'ring-2 ring-[var(--color-accent)]' : ''}
      ${getBackgroundClass}
      backdrop-blur-xl 
      border ${isMidnight ? 'border-white/10' : 'border-transparent'}
      hover:border-green-300/40 dark:hover:border-green-400/40
      transition-all duration-300 
      rounded-lg
      shadow-[0_2px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]
      dark:shadow-[0_2px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-1px_rgba(0,0,0,0.15)]
      hover:shadow-[0_4px_10px_-2px_rgba(0,0,0,0.15),0_3px_6px_-2px_rgba(0,0,0,0.1)]
      dark:hover:shadow-[0_4px_10px_-2px_rgba(0,0,0,0.25),0_3px_6px_-2px_rgba(0,0,0,0.2)]
      ring-1 ring-black/5 dark:ring-white/10
      hover:ring-black/10 dark:hover:ring-white/15
      ${onSelect || onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:scale-[1.01]' : ''}
      ${task.status.toLowerCase() === 'completed' ? 'opacity-85' : ''}
    `;
    return base.trim();
  }, [isSelected, getBackgroundClass, onSelect, onClick, task.status, isMidnight]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
    } else if (onClick) {
      onClick(task);
    }
  }, [onSelect, onClick, task]);


  const handleArchiveConfirm = useCallback(() => {
    updateTask(task.id, { status: 'Completed' });
    setShowArchiveWarning(false);
  }, [updateTask, task.id]);

  const getDaysUntilExpiration = useCallback(() => {
    if (contextData?.expiresAt) {
      return Math.ceil(
        (new Date(contextData.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }
    return null;
  }, [contextData?.expiresAt]);

  const MAX_VISIBLE_ITEMS = viewMode === 'list' ? 8 : 5;

  const allItems = useMemo(() => [
    ...(task.tags || []).map(tag => ({ type: 'tag', id: tag, title: tag })),
    ...(task.linkedItems || [])
  ], [task.tags, task.linkedItems]);

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
    return ''; // Default case
  }, [isDark]);

  const itemIcon = useCallback((type: string) => {
    if (type === 'tag') return <TagIcon className="w-2.5 h-2.5 flex-shrink-0" />;
    if (type === 'idea') return <Lightbulb className="w-2.5 h-2.5 flex-shrink-0" />;
    if (type === 'note') return <Type className="w-2.5 h-2.5 flex-shrink-0" />;
    return <Type className="w-2.5 h-2.5 flex-shrink-0" />; // Default case returns note icon
  }, []);

  const checkboxMemo = useMemo(() => (
    <Checkbox
      task={task}
      context={context}
      updateTask={updateTask}
      isDark={isDark}
    />
  ), [task, context, updateTask, isDark]);

  const priorityBadgeMemo = useMemo(() => (
    <PriorityBadge
      priority={task.priority}
      priorityColorClasses={itemColorClasses}
    />
  ), [task.priority, itemColorClasses]);

  const tagsMemo = useMemo(() => (
    <TagList
      visibleItems={visibleItems}
      remainingCount={remainingCount}
      itemColorClasses={itemColorClasses}
      itemIcon={itemIcon}
      viewMode={viewMode}
      isDark={isDark}
    />
  ), [visibleItems, remainingCount, itemColorClasses, itemIcon, viewMode, isDark]);

  const dateDisplayMemo = useMemo(() => (
    <DateDisplay
      dueDate={task.dueDate}
    />
  ), [task.dueDate]);

  const metadataMemo = useMemo(() => (
    <Metadata
      task={task}
      isMidnight={isMidnight}
    />
  ), [task, isMidnight]);

  const titleClasses = useMemo(() =>
    `text-xs font-medium text-[var(--color-text)] truncate ${task.status.toLowerCase() === 'completed' ? 'line-through text-[var(--color-textSecondary)]' : ''
    }`,
    [task.status]
  );

  const contextInfoMemo = useMemo(() => (
    <MemoizedContextInfo
      context={context}
      contextData={contextData}
      getDaysUntilExpiration={getDaysUntilExpiration}
    />
  ), [context, contextData, getDaysUntilExpiration]);

  if (viewMode === 'mindMap') {
    return (
      <div
        onClick={handleClick}
        className={`${containerClasses} w-[160px] min-h-[70px] max-h-[70px]`}
      >
        <div className="p-2 h-full flex flex-col gap-1.5 relative">
          <div className="flex items-start gap-1.5">
            <div className="flex-shrink-0 p-1 rounded-lg bg-green-100/80 dark:bg-green-900/50 text-green-600 dark:text-green-400">
              <CheckSquare className="w-2.5 h-2.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-xs font-medium text-gray-900 dark:text-gray-100 truncate leading-tight ${task.status.toLowerCase() === 'completed' ? 'line-through text-[var(--color-textSecondary)]' : ''
                }`}>
                {task.title}
              </h3>
            </div>
          </div>
          <div className="mt-auto flex items-center gap-2 text-[8px] text-gray-400 dark:text-gray-500 border-t border-gray-100/5 dark:border-gray-800/50 pt-1.5">
            {metadataMemo}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div onClick={handleClick} className={containerClasses}>
        {viewMode === 'list' ? (
          <div className="px-2 py-1.5 h-full flex items-center gap-2">
            {checkboxMemo}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="min-w-0 flex-shrink overflow-hidden">
                <h3 className={titleClasses}>{task.title}</h3>
                {contextInfoMemo}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {priorityBadgeMemo}
                {tagsMemo}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2 h-[110px] flex flex-col">
            <div className="flex items-center gap-2 w-full">
              {checkboxMemo}
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className={titleClasses}>{task.title}</h3>
                {contextInfoMemo}
              </div>
              <div className="flex items-center gap-1 ml-auto">
                {priorityBadgeMemo}
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-grow">
              <div className="mt-1 pl-[27px]">
                {tagsMemo}
              </div>

              <div className="flex justify-end mt-auto pr-1">
                {dateDisplayMemo}
              </div>
            </div>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        {showArchiveWarning && (
          <WarningModal
            isOpen={showArchiveWarning}
            onClose={() => setShowArchiveWarning(false)}
            onConfirm={handleArchiveConfirm}
            type="archive"
            title={task.title}
          />
        )}
      </Suspense>
    </>
  );
}

// Define memoized subcomponents

const Checkbox = memo(function Checkbox({ task, context, updateTask, isDark }: CheckboxProps) {
  const colorVariants = {
    dark: {
      completed: 'bg-green-900/25 text-green-300',
      pending: 'text-green-300'
    },
    light: {
      completed: 'bg-green-100/80 text-green-500',
      pending: 'text-green-500'
    }
  };

  const themeMode = isDark ? 'dark' : 'light';
  const status = task.status.toLowerCase() === 'completed' ? 'completed' : 'pending';
  const colorClasses = colorVariants[themeMode][status];

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (context === 'default') {
          updateTask(task.id, {
            status: task.status.toLowerCase() === 'completed' ? 'Incomplete' : 'Completed'
          });
        }
      }}
      className={`flex-shrink-0 p-1.5 rounded transition-colors ${colorClasses}`}
    >
      {task.status.toLowerCase() === 'completed' ? (
        <CheckSquare className="w-4 h-4" />
      ) : (
        <Square className="w-4 h-4" />
      )}
    </button>
  );
});

const PriorityBadge = memo(function PriorityBadge({ priority, priorityColorClasses }: PriorityBadgeProps) {
  if (!priority) return null;
  return (
    <span className={`
      flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded whitespace-nowrap
      ${priorityColorClasses(priority.toLowerCase())}
    `}>
      <Clock className="w-2.5 h-2.5" />
      {priority}
    </span>
  );
});

const TagList = memo(function TagList({ visibleItems, remainingCount, itemColorClasses, itemIcon, viewMode, isDark }: TagListProps) {
  if (visibleItems.length === 0) return null;
  return (
    <div className={`
      flex flex-wrap gap-1
      ${viewMode === 'list' ? 'items-center' : 'items-start'}
      ${viewMode === 'grid' ? '' : ''}
      min-h-[20px] overflow-hidden
    `}>
      {visibleItems.map(item => (
        <span
          key={item.id}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${itemColorClasses(item.type)}`}
        >
          {itemIcon(item.type)}
          <span className="truncate max-w-[120px]">{item.title}</span>
        </span>
      ))}
      {remainingCount > 0 && (
        <span className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium
          ${isDark
            ? 'bg-gray-800 text-gray-400'
            : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] border border-[var(--color-border)]'
          }
          whitespace-nowrap
        `}>
          +{remainingCount} more
        </span>
      )}
    </div>
  );
});

const DateDisplay = memo(function DateDisplay({ dueDate }: DateDisplayProps) {
  if (!dueDate) return null;

  return (
    <div className="flex items-center gap-0.5 text-[8px] text-[var(--color-textSecondary)]">
      <Calendar className="w-2 h-2" />
      <span className="whitespace-nowrap">
        {new Date(dueDate).toLocaleString(undefined, {
          dateStyle: 'short'
        })}
      </span>
    </div>
  );
});

const Metadata = memo(function Metadata({ task, isMidnight }: MetadataProps) {
  // Maximum number of linked items to display
  const MAX_LINKED_ITEMS = 2;

  if (!task.linkedItems || task.linkedItems.length === 0) return null;

  // Function to determine icon based on item type
  const getItemIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'note':
        return <Type className="w-2 h-2 flex-shrink-0" />;
      case 'idea':
        return <Lightbulb className="w-2 h-2 flex-shrink-0" />;
      case 'reminder':
        return <Bell className="w-2 h-2 flex-shrink-0" />;
      default:
        return <Link2 className="w-2 h-2 flex-shrink-0" />;
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
        case 'reminder':
          return 'bg-purple-900/40 border border-purple-700/50';
        default:
          return 'bg-green-900/40 border border-green-700/50';
      }
    }

    switch (itemType) {
      case 'note':
        return 'bg-blue-100/20 dark:bg-blue-950/30 border border-blue-200/30 dark:border-blue-800/30';
      case 'idea':
        return 'bg-amber-100/20 dark:bg-amber-900/20 border border-amber-200/30 dark:border-amber-800/30';
      case 'reminder':
        return 'bg-purple-100/15 dark:bg-purple-900/15 border border-purple-200/30 dark:border-purple-800/30';
      default:
        return 'bg-green-100/15 dark:bg-green-900/15 border border-green-200/30 dark:border-green-800/30';
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
        case 'reminder':
          return 'text-purple-200';
        default:
          return 'text-green-200';
      }
    }

    switch (itemType) {
      case 'note':
        return 'text-blue-800 dark:text-blue-400';
      case 'idea':
        return 'text-amber-800 dark:text-amber-400';
      case 'reminder':
        return 'text-purple-800 dark:text-purple-400';
      default:
        return 'text-green-800 dark:text-green-400';
    }
  };

  const linkedItems = task.linkedItems.slice(0, MAX_LINKED_ITEMS);
  const hasMoreItems = task.linkedItems.length > MAX_LINKED_ITEMS;

  return (
    <div className="flex flex-wrap gap-1">
      {linkedItems.map(item => (
        <span
          key={item.id}
          className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] ${getItemBgClass(item.type)} ${getItemTextClass(item.type)}`}
        >
          {getItemIcon(item.type)}
          <span className="truncate">{item.title}</span>
        </span>
      ))}
      {hasMoreItems && (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] bg-gray-100/30 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 border border-gray-200/30 dark:border-gray-700/30">
          +{task.linkedItems.length - MAX_LINKED_ITEMS} more
        </span>
      )}
    </div>
  );
});