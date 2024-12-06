import { useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
import { Reminder } from '../../../../api/types/reminder';
import { useReminders } from '../../../../contexts/remindersContextUtils';

interface AddReminderLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (reminderId: string) => void;
  currentLinkedReminderIds?: string[];
}

export function AddReminderLinkModal({
  isOpen,
  onClose,
  onSelect,
  currentLinkedReminderIds = []
}: AddReminderLinkModalProps) {
  const { reminders } = useReminders();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredReminders = reminders.filter(reminder => {
    // Filter out already linked reminders
    if (currentLinkedReminderIds.includes(reminder.id)) return false;
    
    // Filter by search query
    if (searchQuery) {
      return reminder.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             reminder.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] rounded-xl shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--color-textSecondary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              Link Reminder
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-textSecondary)]" />
            <input
              type="text"
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[var(--color-surface-hover)] text-[var(--color-text)] placeholder-[var(--color-textSecondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {filteredReminders.length > 0 ? (
              <div className="space-y-2">
                {filteredReminders.map(reminder => (
                  <button
                    key={reminder.id}
                    onClick={() => {
                      onSelect(reminder.id);
                      onClose();
                    }}
                    className="w-full flex items-start gap-3 p-3 text-left rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <div className="shrink-0 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[var(--color-text)] truncate">
                        {reminder.title}
                      </h3>
                      {reminder.description && (
                        <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2 mt-1">
                          {reminder.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {reminder.isCompleted && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            Completed
                          </span>
                        )}
                        <span className="text-xs text-[var(--color-textSecondary)]">
                          Due {new Date(reminder.dueDateTime).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[var(--color-textSecondary)]">
                  {searchQuery ? 'No reminders found' : 'No reminders available'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 