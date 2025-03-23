import { Bell, Clock, Check, X } from 'lucide-react';
import { LinkedReminder } from '../../../../types/note';
import { formatDistanceToNow } from 'date-fns';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { EditReminderModal } from '../../Reminders/EditReminderModal';
import { useState } from 'react';
import type { Reminder } from '../../../../contexts/remindersContextUtils';
import { useTheme } from '../../../../contexts/themeContextUtils';

interface MiniReminderCardProps {
  reminder: Reminder;
  onUnlink?: (reminderId: string) => void;
  onClick: () => void;
}

function MiniReminderCard({ reminder, onUnlink, onClick }: MiniReminderCardProps) {
  const { theme } = useTheme();

  const getItemBackground = () => {
    if (theme === 'dark') return 'bg-[#111827]';
    if (theme === 'midnight') return 'bg-[#1e293b]';
    return 'bg-[var(--color-surface)]';
  };

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border-white/5';
    return 'border-[var(--color-border)]';
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-1.5 p-1.5 ${getItemBackground()} rounded-lg border ${getBorderStyle()} group hover:bg-[var(--color-note)]/5 transition-colors cursor-pointer`}
    >
      <div className="shrink-0 p-1 bg-[var(--color-note)]/10 rounded-lg">
        <Bell className="w-3 h-3 text-[var(--color-note)]" />
      </div>

      <div className="min-w-0 max-w-[180px]">
        <h6 className="text-xs font-medium text-[var(--color-text)] truncate">
          {reminder.title}
        </h6>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 text-xs text-[var(--color-textSecondary)]">
            <Clock className="w-2.5 h-2.5" />
            {formatDistanceToNow(new Date(reminder.dueDateTime), { addSuffix: true })}
          </span>
          {reminder.isCompleted && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-xs font-medium bg-green-900/20 text-green-400 rounded">
              <Check className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
      </div>

      {onUnlink && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUnlink(reminder.id);
          }}
          className={`absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 ${getItemBackground()} text-[var(--color-textSecondary)] hover:text-[var(--color-note)] hover:bg-[var(--color-note)]/10 rounded-full border ${getBorderStyle()} transition-all z-10`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

interface LinkedRemindersPanelProps {
  reminders: LinkedReminder[];
  onUnlink?: (reminderId: string) => void;
}

export function LinkedRemindersPanel({ reminders, onUnlink }: LinkedRemindersPanelProps) {
  const { reminders: allReminders } = useReminders();
  const { theme } = useTheme();
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-[#111827]';
    if (theme === 'midnight') return 'bg-[#1e293b]';
    return 'bg-[var(--color-surface)]';
  };

  if (reminders.length === 0) {
    return (
      <div className={`p-3 flex items-center justify-center ${getContainerBackground()}`}>
        <p className="text-xs text-[var(--color-textSecondary)]">No linked reminders</p>
      </div>
    );
  }

  return (
    <>
      <div className={`p-1.5 ${getContainerBackground()}`}>
        <div className="flex flex-wrap gap-1.5">
          {reminders.map(linkedReminder => {
            // Find the full reminder object from the reminders context
            const fullReminder = allReminders.find(r => r.id === linkedReminder.id);
            if (!fullReminder) return null;

            return (
              <MiniReminderCard
                key={linkedReminder.id}
                reminder={fullReminder}
                onUnlink={onUnlink}
                onClick={() => setSelectedReminder(fullReminder)}
              />
            );
          })}
        </div>
      </div>

      {selectedReminder && (
        <EditReminderModal
          isOpen={true}
          onClose={() => setSelectedReminder(null)}
          reminder={selectedReminder}
        />
      )}
    </>
  );
} 