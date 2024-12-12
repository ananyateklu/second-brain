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
  const isDark = theme === 'dark' || theme === 'midnight';
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') {
      return isSafari 
        ? 'bg-[var(--note-bg-color)] bg-opacity-[var(--note-bg-opacity,0.3)]'
        : 'bg-[#1e293b]/30';
    }
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const getContainerClasses = () => {
    const base = `
      relative group w-full
      ${getContainerBackground()}
      backdrop-blur-xl 
      border-[0.25px] border-blue-200/30 dark:border-blue-700/30
      hover:border-blue-400/50 dark:hover:border-blue-500/50
      transition-all duration-300 
      rounded-lg
      shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.08)]
      dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.3)]
      hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.2),0_6px_12px_-4px_rgba(0,0,0,0.15)]
      dark:hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),0_6px_12px_-4px_rgba(0,0,0,0.4)]
      ring-1 ring-black/5 dark:ring-white/10
      hover:ring-black/10 dark:hover:ring-white/20
      cursor-pointer hover:-translate-y-1 hover:scale-[1.02]
    `;
    return base.trim();
  };

  const getItemTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'note':
        return isDark
          ? 'bg-blue-500/20 text-blue-400'
          : 'bg-blue-100 text-blue-600';
      case 'task':
        return isDark
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'bg-emerald-100 text-emerald-600';
      case 'reminder':
        return isDark
          ? 'bg-purple-500/20 text-purple-400'
          : 'bg-purple-100 text-purple-600';
      case 'idea':
        return isDark
          ? 'bg-amber-500/20 text-amber-400'
          : 'bg-amber-100 text-amber-600';
      default:
        return isDark
          ? 'bg-zinc-500/20 text-zinc-400'
          : 'bg-zinc-100 text-zinc-600';
    }
  };

  const getActionTypeColor = (type: string) => {
    const lowercaseType = type.toLowerCase();
    if (['create', 'complete'].includes(lowercaseType)) {
      return isDark ? 'text-emerald-400' : 'text-emerald-600';
    }
    if (['update', 'edit'].includes(lowercaseType)) {
      return isDark ? 'text-blue-400' : 'text-blue-600';
    }
    if (lowercaseType === 'delete') {
      return isDark ? 'text-red-400' : 'text-red-600';
    }
    return isDark ? 'text-zinc-400' : 'text-zinc-600';
  };

  return (
    <div
      onClick={onClick}
      className={getContainerClasses()}
    >
      <div className="flex gap-4 p-4 items-start">
        <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${getItemTypeColor(activity.itemType)} shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)] ring-1 ring-black/5 dark:ring-white/10 transition-shadow duration-200`}>
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
                      className="px-2 py-0.5 bg-[var(--color-tagBg)] text-xs rounded-full text-[var(--color-tagText)] ring-1 ring-black/5 dark:ring-white/10"
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
    </div>
  );
}