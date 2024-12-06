import { Bell, Clock, Check, X } from 'lucide-react';
import { LinkedReminder } from '../../../../types/note';
import { formatDistanceToNow } from 'date-fns';

interface LinkedRemindersPanelProps {
  reminders: LinkedReminder[];
  onUnlink?: (reminderId: string) => void;
}

export function LinkedRemindersPanel({ reminders, onUnlink }: LinkedRemindersPanelProps) {
  if (reminders.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-[var(--color-textSecondary)]">No linked reminders</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {reminders.map(reminder => (
        <div
          key={reminder.id}
          className="group relative hover:bg-[var(--color-surface)] transition-colors"
        >
          <div className="flex items-start gap-3 p-4">
            <div className="shrink-0 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h6 className="font-medium text-[var(--color-text)] truncate">
                {reminder.title}
              </h6>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3.5 h-3.5 text-[var(--color-textSecondary)]" />
                <span className="text-xs text-[var(--color-textSecondary)]">
                  Due {formatDistanceToNow(new Date(reminder.dueDateTime), { addSuffix: true })}
                </span>
                {reminder.isCompleted && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                    <Check className="w-3 h-3" />
                    Completed
                  </span>
                )}
                {reminder.isSnoozed && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                    Snoozed
                  </span>
                )}
              </div>
              {reminder.description && (
                <p className="mt-1 text-sm text-[var(--color-textSecondary)] line-clamp-2">
                  {reminder.description}
                </p>
              )}
            </div>
            {onUnlink && (
              <button
                onClick={() => onUnlink(reminder.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 