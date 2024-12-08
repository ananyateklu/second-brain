import { Activity } from '../../../api/services/activityService';
import { getActivityIcon } from './utils';
import { useTheme } from '../../../contexts/themeContextUtils';

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
  const { theme } = useTheme();
  const Icon = getActivityIcon(activity.itemType);
  const metadata = activity.metadata as ActivityMetadata | undefined;

  const getItemTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'note':
        return theme === 'light'
          ? 'text-blue-600 bg-blue-100'
          : 'text-blue-400 bg-blue-500/20';
      case 'task':
        return theme === 'light'
          ? 'text-emerald-600 bg-emerald-100'
          : 'text-emerald-400 bg-emerald-500/20';
      case 'reminder':
        return theme === 'light'
          ? 'text-purple-600 bg-purple-100'
          : 'text-purple-400 bg-purple-500/20';
      case 'idea':
        return theme === 'light'
          ? 'text-amber-600 bg-amber-100'
          : 'text-amber-400 bg-amber-500/20';
      default:
        return theme === 'light'
          ? 'text-zinc-600 bg-zinc-100'
          : 'text-zinc-400 bg-zinc-500/20';
    }
  };

  const getActionTypeColor = (type: string) => {
    const lowercaseType = type.toLowerCase();
    if (['create', 'complete'].includes(lowercaseType)) {
      return theme === 'light' ? 'text-emerald-600' : 'text-emerald-400';
    }
    if (['update', 'edit'].includes(lowercaseType)) {
      return theme === 'light' ? 'text-blue-600' : 'text-blue-400';
    }
    if (lowercaseType === 'delete') {
      return theme === 'light' ? 'text-red-600' : 'text-red-400';
    }
    return theme === 'light' ? 'text-zinc-600' : 'text-zinc-400';
  };

  const getBackgroundClass = () => {
    if (theme === 'midnight') {
      return 'bg-[color-mix(in_srgb,var(--color-background)_70%,var(--color-surface))]';
    }
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex gap-4 ${getBackgroundClass()} hover:bg-[var(--color-surfaceHover)] border border-[var(--color-border)] rounded-lg p-4 cursor-pointer transition-all items-start`}
    >
      <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${getItemTypeColor(activity.itemType)}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-[var(--color-text)] truncate">
            {activity.itemTitle}
          </h4>
          <span className={`text-xs font-medium ${getActionTypeColor(activity.actionType)}`}>
            {activity.actionType}
          </span>
        </div>

        <p className="mt-1 text-sm text-[var(--color-textSecondary)]">
          {activity.description}
        </p>

        {metadata && (
          <div className="mt-3 text-sm text-[var(--color-textSecondary)]">
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
                    className="px-2 py-0.5 bg-[var(--color-tagBg)] text-xs rounded-full text-[var(--color-tagText)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-2 text-xs text-[var(--color-textSecondary)]">
          {new Date(activity.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}