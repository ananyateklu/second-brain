import { Bell, Clock, Check, X } from 'lucide-react';
import { LinkedReminder } from '../../../../types/note';
import { formatDistanceToNow } from 'date-fns';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { EditReminderModal } from '../../Reminders/EditReminderModal';
import { useState } from 'react';
import type { Reminder } from '../../../../contexts/remindersContextUtils';

interface MiniReminderCardProps {
  reminder: Reminder;
  onUnlink?: (reminderId: string) => void;
  onClick: () => void;
}

function MiniReminderCard({ reminder, onUnlink, onClick }: MiniReminderCardProps) {
  return (
    <div
      onClick={onClick}
      className="relative flex items-center gap-2 p-2 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)] group hover:bg-[var(--color-surfaceHover)] transition-colors cursor-pointer"
    >
      <div className="shrink-0 p-1.5 bg-[var(--color-reminder)]/10 rounded-lg">
        <Bell className="w-3.5 h-3.5 text-[var(--color-reminder)]" />
      </div>
      
      <div className="min-w-0 max-w-[200px]">
        <h6 className="text-sm font-medium text-[var(--color-text)] truncate">
          {reminder.title}
        </h6>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(reminder.dueDateTime), { addSuffix: true })}
          </span>
          {reminder.isCompleted && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-green-900/20 text-green-400 rounded">
              <Check className="w-3 h-3" />
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
          className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 p-1 bg-[var(--color-background)] text-[var(--color-textSecondary)] hover:text-red-400 hover:bg-red-900/20 rounded-full border border-[var(--color-border)] transition-all z-10"
        >
          <X className="w-3 h-3" />
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
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  if (reminders.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center bg-[var(--color-surface)]">
        <p className="text-sm text-[var(--color-textSecondary)]">No linked reminders</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-2 bg-[var(--color-surface)]">
        <div className="flex flex-wrap gap-2">
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
          isOpen={!!selectedReminder}
          onClose={() => setSelectedReminder(null)}
          reminder={selectedReminder}
        />
      )}
    </>
  );
} 