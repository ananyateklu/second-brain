import { useState, useEffect } from 'react';
import { Bell, Search, X, Loader, Sparkles } from 'lucide-react';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { similarContentService } from '../../../../services/ai/similarContentService';
import { motion } from 'framer-motion';
import { Note } from '../../../../types/note';

interface AddReminderLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (reminderId: string) => void;
  currentLinkedReminderIds?: string[];
  currentNote?: Note;
}

export function AddReminderLinkModal({
  isOpen,
  onClose,
  onSelect,
  currentLinkedReminderIds = [],
  currentNote
}: AddReminderLinkModalProps) {
  const { reminders } = useReminders();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedReminders, setSuggestedReminders] = useState<Array<{
    id: string;
    title: string;
    description?: string;
    dueDateTime: string;
    similarity: number;
  }>>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentNote || !reminders.length) return;

    const loadSuggestedReminders = async () => {
      setIsSuggestionsLoading(true);
      try {
        const excludeIds = [...currentLinkedReminderIds];
        const suggestions = await similarContentService.findSimilarContent(
          {
            id: currentNote.id,
            title: currentNote.title,
            content: currentNote.content,
            tags: currentNote.tags
          },
          [],
          [],
          reminders,
          excludeIds,
          3
        );

        const reminderSuggestions = suggestions
          .filter(s => s.type === 'reminder' && s.similarity > 0.3)
          .map(s => ({
            id: s.id,
            title: s.title,
            similarity: s.similarity,
            dueDateTime: s.dueDate || new Date().toISOString(),
            description: reminders.find(r => r.id === s.id)?.description
          }))
          .sort((a, b) => b.similarity - a.similarity);

        setSuggestedReminders(reminderSuggestions);
      } catch (err) {
        console.error('Failed to get suggested reminders:', err);
      } finally {
        setIsSuggestionsLoading(false);
      }
    };

    loadSuggestedReminders();
  }, [isOpen, currentNote, reminders, currentLinkedReminderIds]);

  if (!isOpen) return null;

  const filteredReminders = reminders.filter(reminder => {
    if (currentLinkedReminderIds.includes(reminder.id)) return false;

    if (suggestedReminders.some(s => s.id === reminder.id)) return false;

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

  const formatSimilarity = (score: number) => {
    return `${Math.round(score * 100)}%`;
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
          {(suggestedReminders.length > 0 || isSuggestionsLoading) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-medium text-[var(--color-text)]">
                  Suggested Reminders
                </h3>
                {isSuggestionsLoading && (
                  <Loader className="w-3 h-3 text-[var(--color-textSecondary)] animate-spin ml-1" />
                )}
              </div>

              {suggestedReminders.length > 0 ? (
                <div className="space-y-2">
                  {suggestedReminders.map(reminder => (
                    <motion.button
                      key={reminder.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleLinkReminder(reminder.id)}
                      disabled={isLoading}
                      className="w-full flex items-start gap-3 p-3 text-left bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800/30 transition-all disabled:opacity-50"
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
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                            Match: {formatSimilarity(reminder.similarity)}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : isSuggestionsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader className="w-5 h-5 text-purple-400 animate-spin" />
                </div>
              ) : null}
            </div>
          )}

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