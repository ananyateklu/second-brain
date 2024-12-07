import { useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const filteredReminders = reminders.filter(reminder => {
    // Filter out already linked reminders
    if (currentLinkedReminderIds.includes(reminder.id)) return false;
    
    // Filter by search query
    return reminder.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           reminder.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleLinkReminder = async (reminderId: string) => {
    setIsLoading(true);
    try {
      await onSelect(reminderId);
      onClose();
    } catch (error) {
      console.error('Failed to link reminder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[var(--color-background)] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              Link Reminder
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reminders..."
              className="w-full h-10 pl-10 pr-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-textSecondary)]" />
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredReminders.length > 0 ? (
              filteredReminders.map(reminder => (
                <button
                  key={reminder.id}
                  onClick={() => handleLinkReminder(reminder.id)}
                  disabled={isLoading}
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-[var(--color-surface)] rounded-lg transition-colors disabled:opacity-50"
                >
                  <div className="shrink-0 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--color-text)] truncate">
                      {reminder.title}
                    </h3>
                    {reminder.description && (
                      <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">
                        {reminder.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--color-textSecondary)]">
                        Due {new Date(reminder.dueDateTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 bg-[var(--color-surface)]/50 rounded-full mb-3">
                  <Bell className="w-5 h-5 text-[var(--color-textSecondary)]" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  No reminders found
                </p>
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 