import { Activity } from '../../../services/api/activities.service';
import { getActivityIcon } from './utils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { TickTickActivityMeta } from './TickTickActivityMeta';

interface ActivityItemProps {
  activity: Activity;
  onClick: () => void;
}

interface ActivityMetadata {
  dueDate?: string;
  tags?: string[];
  additionalInfo?: Record<string, string | number | boolean>;
}

interface AIMetadata {
  agentId: string;
  agentName: string;
  agentProvider: string;
  agentColor?: string;
  messageContent?: string;
  chatId?: string;
  reaction?: string;
  executionStats?: {
    tokenUsage?: {
      total: number;
      prompt: number;
      completion: number;
    };
    coreMetrics?: {
      executionTime: number;
      toolsAttempted: number;
      successful: number;
      failed: number;
    };
  };
}

interface TickTickMetadata {
  projectId?: string;
  dueDate?: string;
  priority?: number;
  tags?: string[];
  direction?: string;
  created?: number;
  updated?: number;
  deleted?: number;
  errors?: number;
  provider?: string;
  method?: string;
}

const isAIMetadata = (metadata: unknown): metadata is AIMetadata => {
  if (typeof metadata !== 'object' || !metadata) return false;
  const m = metadata as Record<string, unknown>;
  return 'agentId' in m && 'agentName' in m && 'agentProvider' in m;
};

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const { theme } = useTheme();
  const Icon = getActivityIcon(activity.itemType);
  const metadata = activity.metadata as ActivityMetadata | undefined;
  const isDark = theme === 'dark' || theme === 'midnight' || theme === 'full-dark';
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isFullDark = theme === 'full-dark';

  const isTickTickRelated = activity.itemType === 'TICKTICK_TASK' ||
    activity.itemType === 'TICKTICK_INTEGRATION' ||
    activity.itemType === 'INTEGRATION';

  const getContainerBackground = () => {
    if (theme === 'dark' || theme === 'full-dark') return 'bg-gray-900/30';
    if (theme === 'midnight') {
      return isSafari
        ? 'bg-[var(--note-bg-color)] bg-opacity-[var(--note-bg-opacity,0.3)]'
        : 'bg-[#1e293b]/30';
    }
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
  };

  const getBorderClasses = () => {
    if (theme === 'full-dark') {
      return 'border-[0.25px] border-gray-700/30 hover:border-gray-600/50';
    }
    if (theme === 'dark' || theme === 'midnight') {
      return 'border-[0.25px] border-blue-700/30 hover:border-blue-500/50';
    }
    return 'border-[0.25px] border-blue-200/30 hover:border-blue-400/50';
  };

  const getShadowClasses = () => {
    if (isFullDark) {
      return `
        shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.3)]
        hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),0_6px_12px_-4px_rgba(0,0,0,0.4)]
      `;
    }

    if (isDark) {
      return `
        shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.3)]
        hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),0_6px_12px_-4px_rgba(0,0,0,0.4)]
      `;
    }

    return `
      shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.08)]
      hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.2),0_6px_12px_-4px_rgba(0,0,0,0.15)]
    `;
  };

  const getRingClasses = () => {
    if (isFullDark) {
      return 'ring-1 ring-black/5 dark:ring-gray-700/30 hover:ring-black/10 dark:hover:ring-gray-600/40';
    }
    return 'ring-1 ring-black/5 dark:ring-white/10 hover:ring-black/10 dark:hover:ring-white/20';
  };

  const getContainerClasses = () => {
    const base = `
      relative group w-full
      ${getContainerBackground()}
      backdrop-blur-xl 
      ${getBorderClasses()}
      transition-all duration-300 
      rounded-lg
      ${getShadowClasses()}
      ${getRingClasses()}
      cursor-pointer hover:-translate-y-1 hover:scale-[1.02]
    `;
    return base.trim();
  };

  const itemTypeColors = {
    note: {
      dark: 'bg-blue-500/20 text-blue-400',
      light: 'bg-blue-100 text-blue-600'
    },
    task: {
      dark: 'bg-emerald-500/20 text-emerald-400',
      light: 'bg-emerald-100 text-emerald-600'
    },
    ticktick_task: {
      dark: 'bg-pink-500/20 text-pink-400',
      light: 'bg-pink-100 text-pink-600'
    },
    ticktick_note: {
      dark: 'bg-sky-500/20 text-sky-400',
      light: 'bg-sky-100 text-sky-600'
    },
    reminder: {
      dark: 'bg-purple-500/20 text-purple-400',
      light: 'bg-purple-100 text-purple-600'
    },
    idea: {
      dark: 'bg-amber-500/20 text-amber-400',
      light: 'bg-amber-100 text-amber-600'
    },
    integration: {
      dark: 'bg-cyan-500/20 text-cyan-400',
      light: 'bg-cyan-100 text-cyan-600'
    },
    ticktick_integration: {
      dark: 'bg-pink-500/20 text-pink-400',
      light: 'bg-pink-100 text-pink-600'
    },
    ai_chat: {
      dark: 'bg-[#4c9959]/20 text-[#4c9959]',
      light: 'bg-[#4c9959]/10 text-[#4c9959]'
    },
    ai_message: {
      dark: 'bg-[#4c9959]/20 text-[#4c9959]',
      light: 'bg-[#4c9959]/10 text-[#4c9959]'
    },
    default: {
      dark: 'bg-zinc-500/20 text-zinc-400',
      light: 'bg-zinc-100 text-zinc-600'
    }
  };

  const actionTypeColors = {
    create: { dark: 'text-emerald-400', light: 'text-emerald-600' },
    complete: { dark: 'text-emerald-400', light: 'text-emerald-600' },
    connect: { dark: 'text-cyan-400', light: 'text-cyan-600' },
    disconnect: { dark: 'text-red-400', light: 'text-red-600' },
    sync: { dark: 'text-indigo-400', light: 'text-indigo-600' },
    ai_chat_create: { dark: 'text-violet-400', light: 'text-violet-600' },
    ai_message_receive: { dark: 'text-indigo-400', light: 'text-indigo-600' },
    update: { dark: 'text-blue-400', light: 'text-blue-600' },
    edit: { dark: 'text-blue-400', light: 'text-blue-600' },
    ai_message_send: { dark: 'text-blue-400', light: 'text-blue-600' },
    delete: { dark: 'text-red-400', light: 'text-red-600' },
    ai_chat_delete: { dark: 'text-red-400', light: 'text-red-600' },
    ai_message_react: { dark: 'text-amber-400', light: 'text-amber-600' },
    default: { dark: 'text-zinc-400', light: 'text-zinc-600' }
  };

  const getItemTypeColor = (type: string) => {
    const key = type.toLowerCase();
    if (['ai_chat', 'ai_message'].includes(key) && activity.metadata?.agentColor) {
      return isDark
        ? `bg-[color:var(--agent-color-bg,rgba(99,102,241,0.2))] text-[color:var(--agent-color,rgb(99,102,241))]`
        : `bg-[color:var(--agent-color-bg-light,rgba(99,102,241,0.1))] text-[color:var(--agent-color,rgb(99,102,241))]`;
    }
    const colors = itemTypeColors[key as keyof typeof itemTypeColors] || itemTypeColors.default;
    return isDark ? colors.dark : colors.light;
  };

  const getActionTypeColor = (type: string) => {
    const key = type.toLowerCase();
    const colors = actionTypeColors[key as keyof typeof actionTypeColors] || actionTypeColors.default;
    return isDark ? colors.dark : colors.light;
  };

  const getIconRingClasses = () => {
    if (isFullDark) {
      return 'ring-1 ring-black/5 dark:ring-gray-700/30';
    }
    return 'ring-1 ring-black/5 dark:ring-white/10';
  };

  const renderAIMetadata = (metadata: AIMetadata) => {
    if (!metadata) return null;

    return (
      <div className="mt-2 space-y-1">
        {metadata.executionStats && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
            {metadata.executionStats.tokenUsage && (
              <span>
                {metadata.executionStats.tokenUsage.total.toLocaleString()} tokens
              </span>
            )}
            {metadata.executionStats.coreMetrics && (
              <>
                <span className="opacity-60">•</span>
                <span>{metadata.executionStats.coreMetrics.executionTime}s</span>
              </>
            )}
          </div>
        )}
        {metadata.messageContent && (
          <div className="text-xs text-[var(--color-textSecondary)] italic">
            "{metadata.messageContent}"
          </div>
        )}
        {metadata.reaction && (
          <div className="text-sm">
            {metadata.reaction}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={getContainerClasses()}
    >
      <div className="flex gap-4 p-4 items-start">
        <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${getItemTypeColor(activity.itemType)} shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)] ${getIconRingClasses()} transition-shadow duration-200`}>
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

          {(activity.itemType === 'AI_CHAT' || activity.itemType === 'AI_MESSAGE') &&
            activity.metadata && isAIMetadata(activity.metadata) && renderAIMetadata(activity.metadata)}

          {isTickTickRelated && activity.metadata && (
            <TickTickActivityMeta
              actionType={activity.actionType}
              itemType={activity.itemType}
              metadata={activity.metadata as TickTickMetadata}
            />
          )}

          {metadata && !isTickTickRelated && activity.itemType !== 'AI_CHAT' && activity.itemType !== 'AI_MESSAGE' && (
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
                      className={`px-2 py-0.5 bg-[var(--color-tagBg)] text-xs rounded-full text-[var(--color-tagText)] ${isFullDark ? 'ring-1 ring-gray-700/30' : 'ring-1 ring-black/5 dark:ring-white/10'}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-2 text-xs text-[var(--color-textSecondary)]">
            {new Date(activity.timestamp.endsWith('Z') ? activity.timestamp : activity.timestamp + 'Z')
              .toLocaleString(undefined, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}
          </div>
        </div>
      </div>
    </div>
  );
}