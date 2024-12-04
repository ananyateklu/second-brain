import { Square, CheckSquare, Calendar, Tag as TagIcon, Link2 } from 'lucide-react';
import { Task } from '../../../api/types/task';
import { useTasks } from '../../../contexts/tasksContextUtils';
import { formatTimeAgo } from '../Recent/utils';

interface TaskCardProps {
  task: Task;
  onEdit?: () => void;
  viewMode?: 'grid' | 'list';
  isSelected?: boolean;
  context?: 'default' | 'trash' | 'archive' | 'favorites';
  onSelect?: () => void;
  onClick?: () => void;
  contextData?: {
    expiresAt?: string;
    deletedAt?: string;
    archivedAt?: string;
  };
}

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

  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.stopPropagation();
      onSelect();
    } else if (onClick) {
      onClick();
    }
  };

  // Calculate days until expiration for trash items
  const getDaysUntilExpiration = () => {
    if (contextData?.expiresAt) {
      return Math.ceil(
        (new Date(contextData.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }
    return null;
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`
        bg-emerald-50/5 dark:bg-emerald-900/5
        border ${isSelected 
          ? 'border-primary-400/50 dark:border-primary-400/50' 
          : 'border-gray-200/30 dark:border-gray-700/30'
        }
        hover:border-primary-400/50 dark:hover:border-primary-400/50
        shadow-sm p-4 rounded-xl transition-all duration-200
        ${viewMode === 'list' ? 'w-full' : ''}
        ${onSelect || onClick ? 'cursor-pointer' : ''}
        ${task.status.toLowerCase() === 'completed' ? 'opacity-75' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        {context === 'trash' && onSelect && (
          <div className="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect()}
              className="w-4 h-4 text-primary-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (context === 'default') {
                  const newStatus = task.status.toLowerCase() === 'completed' ? 'Incomplete' : 'Completed';
                  updateTask(task.id, { status: newStatus });
                }
              }}
              className="flex-shrink-0 p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400"
            >
              {context === 'default' ? (
                task.status.toLowerCase() === 'completed' ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )
              ) : (
                <CheckSquare className="w-4 h-4" />
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`text-base font-medium text-gray-900 dark:text-white truncate ${
                  task.status.toLowerCase() === 'completed' ? 'line-through' : ''
                }`}>
                  {task.title}
                </h3>
                {context === 'trash' && getDaysUntilExpiration() !== null && (
                  <span className="flex-shrink-0 text-sm text-red-600 dark:text-red-400 whitespace-nowrap">
                    {getDaysUntilExpiration()}d left
                  </span>
                )}
              </div>
              {context === 'trash' && contextData?.deletedAt && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Deleted {formatTimeAgo(contextData.deletedAt)}
                </p>
              )}
              {context === 'archive' && contextData?.archivedAt && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Archived {formatTimeAgo(contextData.archivedAt)}
                </p>
              )}
            </div>

            {task.priority && (
              <span className={`
                inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                ${task.priority.toLowerCase() === 'high'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : task.priority.toLowerCase() === 'medium'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                }
              `}>
                {task.priority}
              </span>
            )}
          </div>

          {task.description && (
            <p className={`mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 break-words ${
              task.status.toLowerCase() === 'completed' ? 'line-through' : ''
            }`}>
              {task.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {task.linkedItems && task.linkedItems.length > 0 && (
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Link2 className="w-4 h-4" />
                <span>{task.linkedItems.length} linked</span>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {task.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 max-w-full"
                >
                  <TagIcon className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}