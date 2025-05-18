import { Bell, Clock, Check, X, Plus, Loader, Sparkles } from 'lucide-react';
import { LinkedReminder } from '../../../../types/note';
import { formatDistanceStrict } from 'date-fns';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { EditReminderModal } from '../../Reminders/EditReminderModal';
import { useState, useEffect } from 'react';
import type { Reminder } from '../../../../contexts/remindersContextUtils';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import { GenericSuggestionSkeleton } from './GenericSuggestionSkeleton';

// Define SuggestionItem interface (copied from Ideas version for consistency)
interface SuggestionItem {
  id: string;
  title: string;
  similarity: number;
  type: 'note' | 'idea' | 'task' | 'reminder'; // Ensure 'reminder' is a valid type
  status?: string;
  dueDate?: string | null;
}

interface MiniReminderCardProps {
  reminder: Reminder;
  onUnlink?: (reminderId: string) => void;
  onClick: () => void;
  consistentBorderColor: string;
}

function MiniReminderCard({ reminder, onUnlink, onClick, consistentBorderColor }: MiniReminderCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-1.5 p-1.5 bg-[var(--color-surface)] rounded-lg border ${consistentBorderColor} group hover:bg-[var(--color-surfaceHover)] transition-colors cursor-pointer`}
    >
      <div className="shrink-0 p-1 bg-[var(--color-surface)] rounded-lg">
        <Bell className="w-3 h-3 text-purple-500" />
      </div>

      <div className="min-w-0 max-w-[180px]">
        <h6 className="text-xs font-medium text-[var(--color-text)] truncate">
          {reminder.title}
        </h6>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 text-xs text-[var(--color-textSecondary)]">
            <Clock className="w-2.5 h-2.5" />
            {formatDistanceStrict(new Date(reminder.dueDateTime), new Date(), { addSuffix: true })}
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
          className={`absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-[var(--color-surface)] text-purple-500 hover:text-purple-600 hover:bg-[var(--color-surfaceHover)] rounded-full border ${consistentBorderColor} transition-all z-10`}
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
  consistentBorderColor: string;
}

function SuggestedReminderCard({ reminder, onLink, isLinking = false, consistentBorderColor }: SuggestedReminderCardProps) {
  const formatSimilarity = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex items-center gap-1.5 p-1.5 bg-[var(--color-surface)] rounded-lg border ${consistentBorderColor} group hover:bg-[var(--color-surfaceHover)] transition-colors cursor-pointer`}
      onClick={() => !isLinking && onLink(reminder.id)}
    >
      <div className="shrink-0 p-1 bg-[var(--color-surface)] rounded-lg">
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
            {formatDistanceStrict(new Date(reminder.dueDateTime), new Date(), { addSuffix: true })}
          </span>
          <span className="inline-flex items-center px-1 py-0.5 text-[8px] font-medium bg-[var(--color-surface)] text-purple-500 rounded">
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
        className={`absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-[var(--color-surface)] text-purple-500 hover:text-purple-600 hover:bg-[var(--color-surfaceHover)] rounded-full border ${consistentBorderColor} transition-all z-10`}
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
  suggestedReminders?: SuggestionItem[];
  isLoadingSuggestions?: boolean;
}

export function LinkedRemindersPanel({
  reminders,
  onUnlink,
  onLink,
  suggestedReminders = [],
  isLoadingSuggestions = false
}: LinkedRemindersPanelProps) {
  const { reminders: allReminders } = useReminders();
  const { theme } = useTheme();
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [linkingReminderId, setLinkingReminderId] = useState<string | null>(null);
  const [processedSuggestions, setProcessedSuggestions] = useState<Array<Reminder & { similarity: number }>>([]);

  const consistentBorderColor = (() => {
    switch (theme) {
      case 'midnight':
        return 'border-white/10';
      case 'dark':
        return 'border-gray-700/30';
      case 'full-dark':
        return 'border-white/10';
      case 'light':
      default:
        return 'border-[var(--color-border)]';
    }
  })();

  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-[#111827]';
    if (theme === 'midnight') return 'bg-[#1e293b]';
    return 'bg-[var(--color-surface)]';
  };

  // Load suggested reminders when there are no linked reminders
  useEffect(() => {
    if (!allReminders.length || !onLink) {
      setProcessedSuggestions([]);
      return;
    }

    const reminderSuggestionsFromProp = suggestedReminders.filter(s => s.type === 'reminder');

    const newProcessedSuggestions = reminderSuggestionsFromProp
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

    setProcessedSuggestions(newProcessedSuggestions);

  }, [suggestedReminders, allReminders, onLink]);

  const handleLinkReminder = async (reminderId: string) => {
    if (!onLink) return;

    setLinkingReminderId(reminderId);
    try {
      await onLink(reminderId);
    } catch (error) {
      console.error('Failed to link reminder:', error);
    } finally {
      setLinkingReminderId(null);
    }
  };

  const hasActualSuggestions = processedSuggestions && processedSuggestions.length > 0;
  const hasLinkedReminders = reminders && reminders.length > 0;

  // Determine if this section should render at all (if no linked and no suggested and not loading)
  if (!hasLinkedReminders && !hasActualSuggestions && !isLoadingSuggestions) {
    return (
      <div className={`p-3 ${getContainerBackground()} rounded-lg border ${consistentBorderColor}`}>
        <p className="text-xs text-center text-[var(--color-textSecondary)]">
          No reminders linked or suggested yet.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-3 ${getContainerBackground()} rounded-lg border ${consistentBorderColor} space-y-3`}>
      {/* Linked Reminders Section */}
      {hasLinkedReminders && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--color-text)]">Linked Reminders</p>
          <div className="flex flex-wrap gap-1.5">
            {reminders.map((reminder) => {
              // Find the full reminder details from allReminders or fetch if necessary
              const fullReminderDetails = allReminders.find(r => r.id === reminder.id);
              if (!fullReminderDetails) {
                // Optionally, show a placeholder or fetch the reminder
                // For now, skipping if not found in allReminders to prevent errors
                return null;
              }
              return (
                <MiniReminderCard
                  key={reminder.id}
                  reminder={fullReminderDetails}
                  onClick={() => setSelectedReminder(fullReminderDetails)}
                  onUnlink={onUnlink ? () => onUnlink(reminder.id) : undefined}
                  consistentBorderColor={consistentBorderColor}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested Reminders Section */}
      {(hasActualSuggestions || isLoadingSuggestions) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-purple-500" />
            <p className="text-xs font-medium text-[var(--color-text)]">Suggested Reminders</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {isLoadingSuggestions && !hasActualSuggestions ? (
              <>
                <GenericSuggestionSkeleton type="reminder" />
                <GenericSuggestionSkeleton type="reminder" />
              </>
            ) : hasActualSuggestions ? (
              processedSuggestions.map((suggestion) => (
                <SuggestedReminderCard
                  key={suggestion.id}
                  reminder={suggestion}
                  onLink={handleLinkReminder}
                  isLinking={linkingReminderId === suggestion.id}
                  consistentBorderColor={consistentBorderColor}
                />
              ))
            ) : (
              <p className="text-xs text-[var(--color-textSecondary)] w-full text-center py-2">
                No relevant reminders found to suggest.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state for the whole panel if absolutely nothing to show */}
      {!hasLinkedReminders && !hasActualSuggestions && !isLoadingSuggestions && (
        <p className="text-xs text-center text-[var(--color-textSecondary)] py-4">
          No reminders linked or suggested yet.
        </p>
      )}

      {selectedReminder && (
        <EditReminderModal
          isOpen={true}
          onClose={() => setSelectedReminder(null)}
          reminder={selectedReminder}
        />
      )}
    </div>
  );
} 