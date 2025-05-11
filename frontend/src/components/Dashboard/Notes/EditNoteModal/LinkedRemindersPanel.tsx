import { Bell, Clock, Check, X, Plus, Loader, Sparkles } from 'lucide-react';
import { LinkedReminder } from '../../../../types/note';
import { formatDistanceToNow } from 'date-fns';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { EditReminderModal } from '../../Reminders/EditReminderModal';
import { useState, useEffect } from 'react';
import type { Reminder } from '../../../../contexts/remindersContextUtils';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { similarContentService } from '../../../../services/ai/similarContentService';
import { motion } from 'framer-motion';
import { Note } from '../../../../types/note';

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
      className={`relative flex items-center gap-1.5 p-1.5 ${getItemBackground()} rounded-lg border ${getBorderStyle()} group hover:bg-purple-400/5 transition-colors cursor-pointer`}
    >
      <div className="shrink-0 p-1 bg-purple-400/10 rounded-lg">
        <Bell className="w-3 h-3 text-purple-500" />
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
          className={`absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 ${getItemBackground()} text-[var(--color-textSecondary)] hover:text-purple-500 hover:bg-purple-400/10 rounded-full border ${getBorderStyle()} transition-all z-10`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

// New component for suggested reminders
interface SuggestedReminderCardProps {
  reminder: Reminder & { similarity: number };
  onLink: (reminderId: string) => void;
  isLinking?: boolean;
}

function SuggestedReminderCard({ reminder, onLink, isLinking = false }: SuggestedReminderCardProps) {
  const { theme } = useTheme();

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border-white/5';
    return 'border-[var(--color-border)]';
  };

  const formatSimilarity = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex items-center gap-1.5 p-1.5 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800/30 group hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors cursor-pointer`}
      onClick={() => !isLinking && onLink(reminder.id)}
    >
      <div className="shrink-0 p-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
        <Bell className="w-3 h-3 text-purple-500" />
      </div>

      <div className="min-w-0 max-w-[180px]">
        <h6 className="text-xs font-medium text-[var(--color-text)] truncate flex items-center gap-1">
          {reminder.title}
          {isLinking && <Loader className="w-2 h-2 animate-spin text-purple-500" />}
        </h6>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 text-xs text-[var(--color-textSecondary)]">
            <Clock className="w-2.5 h-2.5" />
            {formatDistanceToNow(new Date(reminder.dueDateTime), { addSuffix: true })}
          </span>
          <span className="inline-flex items-center px-1 py-0.5 text-[8px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-500 rounded">
            Match: {formatSimilarity(reminder.similarity)}
          </span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLink(reminder.id);
        }}
        className={`absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-500 hover:text-purple-600 rounded-full border ${getBorderStyle()} transition-all z-10`}
        disabled={isLinking}
      >
        <Plus className="w-2.5 h-2.5" />
      </button>
    </motion.div>
  );
}

interface LinkedRemindersPanelProps {
  reminders: LinkedReminder[];
  onUnlink?: (reminderId: string) => void;
  onLink?: (reminderId: string) => Promise<void>;
  currentNote?: Note;
}

export function LinkedRemindersPanel({
  reminders,
  onUnlink,
  onLink,
  currentNote
}: LinkedRemindersPanelProps) {
  const { reminders: allReminders } = useReminders();
  const { theme } = useTheme();
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [suggestedReminders, setSuggestedReminders] = useState<Array<Reminder & { similarity: number }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [linkingReminderId, setLinkingReminderId] = useState<string | null>(null);

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-[#111827]';
    if (theme === 'midnight') return 'bg-[#1e293b]';
    return 'bg-[var(--color-surface)]';
  };

  // Load suggested reminders when there are no linked reminders
  useEffect(() => {
    if (!currentNote || !allReminders.length || !onLink) return;

    const loadSuggestedReminders = async () => {
      setIsLoadingSuggestions(true);
      try {
        const linkedReminderIds = reminders.map(r => r.id);
        const suggestions = await similarContentService.findSimilarContent(
          {
            id: currentNote.id,
            title: currentNote.title,
            content: currentNote.content,
            tags: currentNote.tags
          },
          [], // No notes needed
          [], // No tasks needed
          [], // No ideas needed
          allReminders,
          linkedReminderIds,
          3 // Show max 3 suggestions
        );

        // Filter to only reminder type suggestions
        const reminderSuggestions = suggestions
          .filter(s => s.type === 'reminder' && s.similarity > 0.3)
          .map(s => {
            const fullReminder = allReminders.find(r => r.id === s.id);
            if (!fullReminder) return null;
            return {
              ...fullReminder,
              similarity: s.similarity
            };
          })
          .filter(Boolean) // Remove nulls
          .sort((a, b) => b!.similarity - a!.similarity) as Array<Reminder & { similarity: number }>;

        setSuggestedReminders(reminderSuggestions);
      } catch (err) {
        console.error('Failed to get suggested reminders:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    loadSuggestedReminders();
  }, [currentNote, allReminders, onLink, reminders]);

  const handleLinkReminder = async (reminderId: string) => {
    if (!onLink) return;

    setLinkingReminderId(reminderId);
    try {
      await onLink(reminderId);
      // After successful linking, remove from suggestions
      setSuggestedReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Failed to link reminder:', error);
    } finally {
      setLinkingReminderId(null);
    }
  };

  if (reminders.length === 0) {
    return (
      <div className={`p-3 ${getContainerBackground()}`}>
        {suggestedReminders.length > 0 || isLoadingSuggestions ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3 h-3 text-purple-500" />
              <p className="text-xs font-medium text-[var(--color-text)]">Suggested Reminders</p>
              {isLoadingSuggestions && <Loader className="w-2.5 h-2.5 text-purple-500 animate-spin ml-auto" />}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {suggestedReminders.map(reminder => (
                <SuggestedReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onLink={handleLinkReminder}
                  isLinking={linkingReminderId === reminder.id}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--color-textSecondary)] text-center">No linked reminders</p>
        )}
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

      {/* Show suggestions below linked reminders if available */}
      {(suggestedReminders.length > 0 || isLoadingSuggestions) && (
        <div className={`px-1.5 pb-1.5 ${getContainerBackground()}`}>
          <div className="border-t border-[var(--color-border)]/10 dark:border-white/5 midnight:border-white/5 pt-1.5 mt-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3 h-3 text-purple-500" />
              <p className="text-xs font-medium text-[var(--color-text)]">Suggested Reminders</p>
              {isLoadingSuggestions && <Loader className="w-2.5 h-2.5 text-purple-500 animate-spin ml-auto" />}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {suggestedReminders.map(reminder => (
                <SuggestedReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onLink={handleLinkReminder}
                  isLinking={linkingReminderId === reminder.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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