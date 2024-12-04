import { Activity } from '../../../api/services/activityService';
import { getActivityIcon } from './utils';

interface ActivityItemProps {
  activity: Activity;
  onClick: () => void;
}

interface ActivityMetadata {
  dueDate?: string;
  tags?: string[];
  additionalInfo?: Record<string, string | number | boolean>;
}

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const Icon = getActivityIcon(activity.itemType);
  const metadata = activity.metadata as ActivityMetadata | undefined;

  const getItemTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'note':
        return 'text-blue-500 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-500/10';
      case 'task':
        return 'text-green-500 dark:text-green-400 bg-green-100/50 dark:bg-green-500/10';
      case 'reminder':
        return 'text-purple-500 dark:text-purple-400 bg-purple-100/50 dark:bg-purple-500/10';
      case 'idea':
        return 'text-yellow-500 dark:text-yellow-400 bg-yellow-100/50 dark:bg-yellow-500/10';
      default:
        return 'text-zinc-500 dark:text-zinc-400 bg-zinc-100/50 dark:bg-zinc-600/20';
    }
  };

  const getActionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'create':
        return 'text-emerald-500 dark:text-emerald-400';
      case 'update':
        return 'text-blue-500 dark:text-blue-400';
      case 'delete':
        return 'text-red-500 dark:text-red-400';
      case 'complete':
        return 'text-green-500 dark:text-green-400';
      case 'edit':
        return 'text-blue-500 dark:text-blue-400';
      default:
        return 'text-zinc-500 dark:text-zinc-400';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex gap-4 bg-white/20 dark:bg-zinc-800/40 hover:bg-white/30 dark:hover:bg-zinc-800/60 border border-zinc-200/30 dark:border-zinc-700/30 rounded-lg p-4 cursor-pointer transition-all items-start"
    >
      <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${getItemTypeColor(activity.itemType)}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {activity.itemTitle}
          </h4>
          <span className={`text-xs font-medium ${getActionTypeColor(activity.actionType)}`}>
            {activity.actionType}
          </span>
        </div>

        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {activity.description}
        </p>

        {metadata && (
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {metadata.dueDate && (
              <div>
                Due Date:{' '}
                {new Date(metadata.dueDate).toLocaleDateString()}
              </div>
            )}
            {metadata.tags && metadata.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {metadata.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700/50 text-xs rounded-full text-zinc-700 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {new Date(activity.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}