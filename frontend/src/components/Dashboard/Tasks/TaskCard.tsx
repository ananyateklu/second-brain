import { Calendar, Tag as TagIcon, Clock, Type, Lightbulb, Square, CheckSquare, Link2 } from 'lucide-react';
import { Task } from '../../../api/types/task';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { useTheme } from '../../../contexts/themeContextUtils';

interface TaskCardProps {
  task: Task;
  viewMode?: 'grid' | 'list';
  isSelected?: boolean;
  context?: 'default' | 'trash' | 'archive' | 'favorites';
  onSelect?: () => void;
  onClick?: (task: Task) => void;
}

export function TaskCard({
  task,
  viewMode = 'grid',
  isSelected,
  context = 'default',
  onSelect,
  onClick
}: TaskCardProps) {
  const { updateTask } = useTasks();
  const { theme } = useTheme();

  const isDark = theme === 'dark' || theme === 'midnight';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
    } else if (onClick) {
      onClick(task);
    }
  };

  // Calculate visible and remaining items
  const MAX_VISIBLE_ITEMS = viewMode === 'list' ? 8 : 7;
  const allItems = [
    ...(task.tags || []).map(tag => ({ type: 'tag', id: tag, title: tag })),
    ...(task.linkedItems || [])
  ];
  const visibleItems = allItems.slice(0, MAX_VISIBLE_ITEMS);
  const remainingCount = Math.max(0, allItems.length - MAX_VISIBLE_ITEMS);

  const getItemColorClasses = (type: string) => {
    if (type === 'tag') return isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600';
    if (type === 'idea') return isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600';
    return isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600';
  };

  const getItemIcon = (type: string) => {
    if (type === 'tag') return <TagIcon className="w-2.5 h-2.5 flex-shrink-0" />;
    if (type === 'idea') return <Lightbulb className="w-2.5 h-2.5 flex-shrink-0" />;
    return <Type className="w-2.5 h-2.5 flex-shrink-0" />;
  };

  const getPriorityColorClasses = (priority: string) => {
    if (isDark) {
      if (priority === 'high') return 'bg-red-900/30 text-red-400';
      if (priority === 'medium') return 'bg-yellow-900/30 text-yellow-400';
      return 'bg-green-900/30 text-green-400';
    }
    
    if (priority === 'high') return 'bg-red-100 text-red-600';
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-600';
    return 'bg-green-100 text-green-600';
  };

  const renderCheckbox = () => {
    const colorVariants = {
      dark: {
        completed: 'bg-green-900/30 text-green-400',
        pending: 'bg-emerald-900/30 text-emerald-400'
      },
      light: {
        completed: 'bg-green-100 text-green-600',
        pending: 'bg-emerald-100 text-emerald-600'
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
  };

  const renderPriorityBadge = () => (
    task.priority && (
      <span className={`
        flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded whitespace-nowrap
        ${getPriorityColorClasses(task.priority.toLowerCase())}
      `}>
        <Clock className="w-3 h-3" />
        {task.priority}
      </span>
    )
  );

  const renderTags = () => (
    allItems.length > 0 && (
      <div className={`
        flex flex-wrap gap-1
        ${viewMode === 'list' ? 'items-center' : 'items-start'}
        max-h-[44px] min-h-[20px] overflow-hidden
      `}>
        {visibleItems.map(item => (
          <span
            key={item.id}
            className={`
              inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap
              ${getItemColorClasses(item.type)}
            `}
          >
            {getItemIcon(item.type)}
            <span className="truncate max-w-[120px]">{item.title}</span>
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-secondary)] text-[var(--color-textSecondary)] whitespace-nowrap">
            +{remainingCount} more
          </span>
        )}
      </div>
    )
  );

  const renderMetadata = () => (
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

  return (
    <div 
      onClick={handleClick}
      className={`
        relative group
        w-full
        ${onSelect || onClick ? 'cursor-pointer' : ''}
        ${task.status.toLowerCase() === 'completed' ? 'opacity-85' : ''}
        bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]
        border border-[var(--color-border)]
        hover:border-emerald-400/50
        rounded-lg
        transition-all duration-200
        overflow-hidden
        ${isSelected ? 'ring-2 ring-emerald-400/50' : ''}
        ${viewMode === 'list' ? 'h-[84px]' : 'h-[156px]'}
      `}
    >
      {viewMode === 'list' ? (
        // List View Layout
        <div className="px-3 py-2.5 h-full flex items-center gap-3">
          {renderCheckbox()}
          <div className="flex-1 min-w-0 flex items-center gap-4">
            <div className="min-w-[200px] max-w-[300px]">
              <h3 className={`text-sm font-medium text-[var(--color-text)] truncate ${task.status.toLowerCase() === 'completed' ? 'line-through text-[var(--color-textSecondary)]' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className={`text-xs text-[var(--color-textSecondary)] truncate ${task.status.toLowerCase() === 'completed' ? 'line-through opacity-75' : ''}`}>
                  {task.description}
                </p>
              )}
            </div>
            <div className="min-w-[180px]">
              {renderMetadata()}
            </div>
            <div className="flex-1 min-w-0">
              {renderTags()}
            </div>
            {renderPriorityBadge()}
          </div>
        </div>
      ) : (
        // Grid View Layout
        <div className="p-3 h-full flex flex-col">
          <div className="flex items-start gap-2 mb-2">
            {renderCheckbox()}
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-medium text-[var(--color-text)] truncate ${task.status.toLowerCase() === 'completed' ? 'line-through text-[var(--color-textSecondary)]' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className={`mt-0.5 text-xs text-[var(--color-textSecondary)] line-clamp-2 ${task.status.toLowerCase() === 'completed' ? 'line-through opacity-75' : ''}`}>
                  {task.description}
                </p>
              )}
            </div>
            {renderPriorityBadge()}
          </div>

          <div className="flex-1 flex flex-col justify-between">
            <div className="min-h-[44px] mb-3">
              {renderTags()}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-700/30">
              {renderMetadata()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}