import { useState, useMemo, useCallback, memo, Suspense, lazy } from 'react';
import { Calendar, Tag as TagIcon, Clock, Type, Lightbulb, Square, CheckSquare, Link2, Archive } from 'lucide-react';
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
  context?: 'default' | 'trash' | 'archive' | 'favorites';
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
}

interface MetadataProps {
  task: Task;
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
      <div className="flex items-center gap-2 text-[11px] text-red-500 mt-1">
        <Clock className="w-3 h-3" />
        <span>Deleted {formatTimeAgo(contextData.deletedAt)}</span>
        {daysLeft !== null && (
          <span className="text-red-600 dark:text-red-400">({daysLeft}d left)</span>
        )}
      </div>
    );
  }
  if (context === 'archive' && contextData?.archivedAt) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[var(--color-textSecondary)] mt-1">
        <Archive className="w-3 h-3" />
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

  const isDark = useMemo(() => theme === 'dark' || theme === 'midnight', [theme]);

  const containerClasses = useMemo(() => {
    const base = `
      relative group w-full
      ${isSelected ? 'ring-2 ring-[var(--color-accent)]' : ''}
      ${theme === 'dark'
        ? 'bg-gray-900/30'
        : theme === 'midnight'
          ? 'bg-white/5'
          : 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]'} 
      backdrop-blur-xl 
      border border-green-200/30 dark:border-green-700/30
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
      ${task.status.toLowerCase() === 'completed' ? 'opacity-85' : ''}
    `;
    return base.trim();
  }, [isSelected, theme, onSelect, onClick, task.status]);

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

  const MAX_VISIBLE_ITEMS = viewMode === 'list' ? 8 : 7;

  const allItems = useMemo(() => [
    ...(task.tags || []).map(tag => ({ type: 'tag', id: tag, title: tag })),
    ...(task.linkedItems || [])
  ], [task.tags, task.linkedItems]);

  const visibleItems = useMemo(() => allItems.slice(0, MAX_VISIBLE_ITEMS), [allItems, MAX_VISIBLE_ITEMS]);
  const remainingCount = useMemo(() => Math.max(0, allItems.length - MAX_VISIBLE_ITEMS), [allItems.length, MAX_VISIBLE_ITEMS]);

  const itemColorClasses = useCallback((type: string) => {
    if (type === 'tag') return isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600';
    if (type === 'idea') return isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600';
    return isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600';
  }, [isDark]);

  const itemIcon = useCallback((type: string) => {
    if (type === 'tag') return <TagIcon className="w-2.5 h-2.5 flex-shrink-0" />;
    if (type === 'idea') return <Lightbulb className="w-2.5 h-2.5 flex-shrink-0" />;
    return <Type className="w-2.5 h-2.5 flex-shrink-0" />;
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
    />
  ), [visibleItems, remainingCount, itemColorClasses, itemIcon, viewMode]);

  const metadataMemo = useMemo(() => (
    <Metadata task={task} />
  ), [task]);

  const titleClasses = useMemo(() =>
    `text-sm font-medium text-[var(--color-text)] truncate ${task.status.toLowerCase() === 'completed' ? 'line-through text-[var(--color-textSecondary)]' : ''
    }`,
    [task.status]
  );

  const descriptionClasses = useMemo(() =>
    `text-xs text-[var(--color-textSecondary)] ${viewMode === 'list' ? 'truncate' : 'line-clamp-2'} ${task.status.toLowerCase() === 'completed' ? 'line-through opacity-75' : ''
    }`,
    [task.status, viewMode]
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
        className={`${containerClasses} w-[160px] min-h-[90px] max-h-[90px]`}
      >
        <div className="p-2 h-full flex flex-col gap-1.5 relative">
          <div className="flex items-start gap-1.5">
            <div className="flex-shrink-0 p-1 rounded-lg bg-green-100/80 dark:bg-green-900/50 text-green-600 dark:text-green-400">
              <CheckSquare className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-xs font-medium text-gray-900 dark:text-gray-100 truncate leading-tight ${task.status.toLowerCase() === 'completed' ? 'line-through text-[var(--color-textSecondary)]' : ''
                }`}>
                {task.title}
              </h3>
              {task.description && (
                <p className={`text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 ${task.status.toLowerCase() === 'completed' ? 'line-through opacity-75' : ''
                  }`}>
                  {task.description}
                </p>
              )}
            </div>
          </div>
          <div className="mt-auto flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100/5 dark:border-gray-800/50 pt-1.5">
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
          <div className="px-3 py-2.5 h-full flex items-center gap-3">
            {checkboxMemo}
            <div className="flex-1 min-w-0 flex items-center gap-4">
              <div className="min-w-[200px] max-w-[300px]">
                <h3 className={titleClasses}>{task.title}</h3>
                {task.description && (
                  <p className={descriptionClasses}>{task.description}</p>
                )}
                {contextInfoMemo}
              </div>
              <div className="min-w-[180px]">{metadataMemo}</div>
              <div className="flex-1 min-w-0">{tagsMemo}</div>
              {priorityBadgeMemo}
            </div>
          </div>
        ) : (
          <div className="p-3 h-full flex flex-col">
            <div className="flex items-start gap-2 mb-2">
              {checkboxMemo}
              <div className="flex-1 min-w-0">
                <h3 className={titleClasses}>{task.title}</h3>
                {task.description && (
                  <p className={`mt-0.5 ${descriptionClasses}`}>{task.description}</p>
                )}
                {contextInfoMemo}
              </div>
              {priorityBadgeMemo}
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-hidden">
                <div className="min-h-[44px] max-h-[66px] overflow-hidden">
                  {tagsMemo}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-auto border-t border-[var(--color-border)]">
                {metadataMemo}
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
      completed: 'bg-green-900/30 text-green-400',
      pending: 'text-emerald-400'
    },
    light: {
      completed: 'bg-green-100 text-green-600',
      pending: 'text-emerald-600'
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
        <CheckSquare className="w-3.5 h-3.5" />
      ) : (
        <Square className="w-3.5 h-3.5" />
      )}
    </button>
  );
});

const PriorityBadge = memo(function PriorityBadge({ priority, priorityColorClasses }: PriorityBadgeProps) {
  if (!priority) return null;
  return (
    <span className={`
      flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded whitespace-nowrap
      ${priorityColorClasses(priority.toLowerCase())}
    `}>
      <Clock className="w-3 h-3" />
      {priority}
    </span>
  );
});

const TagList = memo(function TagList({ visibleItems, remainingCount, itemColorClasses, itemIcon, viewMode }: TagListProps) {
  if (visibleItems.length === 0) return null;
  return (
    <div className={`
      flex flex-wrap gap-1
      ${viewMode === 'list' ? 'items-center' : 'items-start'}
      ${viewMode === 'grid' ? 'max-h-[44px]' : ''}
      min-h-[20px] overflow-hidden
    `}>
      {visibleItems.map(item => (
        <span
          key={item.id}
          className={`
            inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap
            ${itemColorClasses(item.type)}
          `}
        >
          {itemIcon(item.type)}
          <span className="truncate max-w-[120px]">{item.title}</span>
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-secondary)] text-[var(--color-textSecondary)] whitespace-nowrap">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
});

const Metadata = memo(function Metadata({ task }: MetadataProps) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[var(--color-textSecondary)]">
      {task.dueDate && (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span className="whitespace-nowrap">
            {new Date(task.dueDate).toLocaleString(undefined, {
              dateStyle: 'short',
              timeStyle: 'short'
            })}
          </span>
        </div>
      )}
      {task.linkedItems && task.linkedItems.length > 0 && (
        <div className="flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          <span>{task.linkedItems.length} linked</span>
        </div>
      )}
    </div>
  );
});