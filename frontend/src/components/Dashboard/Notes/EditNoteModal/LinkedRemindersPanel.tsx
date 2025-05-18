import { Bell, Clock, Check, X, Plus, Loader, Sparkles } from 'lucide-react';
import { LinkedReminder } from '../../../../types/note';
import { formatDistanceStrict } from 'date-fns';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { EditReminderModal } from '../../Reminders/EditReminderModal';
import { useState, useEffect } from 'react';
import type { Reminder as ReminderType } from '../../../../contexts/remindersContextUtils';
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
  reminder: ReminderType;
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

// New component for suggested reminders (aligning with Ideas version)
interface SuggestedReminderCardProps {
  reminder: ReminderType & { similarity: number };
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
  onLink?: (reminderId: string) => Promise<boolean | void>;
  suggestedReminders?: SuggestionItem[];
  isLoadingSuggestions?: boolean;
}

export function LinkedRemindersPanel({
  reminders: linkedRemindersFromProp,
  onUnlink,
  onLink,
  suggestedReminders = [],
  isLoadingSuggestions = false
}: LinkedRemindersPanelProps) {
  const { reminders: allRemindersFromContext } = useReminders();
  const { theme } = useTheme();
  const [selectedReminder, setSelectedReminder] = useState<ReminderType | null>(null);
  const [linkingReminderId, setLinkingReminderId] = useState<string | null>(null);
  const [processedSuggestions, setProcessedSuggestions] = useState<Array<ReminderType & { similarity: number }>>([]);

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

  // Process suggestion items into full reminder objects (aligning with Ideas version)
  useEffect(() => {
    if (!suggestedReminders?.length) {
      setProcessedSuggestions([]);
      return;
    }

    const reminderSuggestions = suggestedReminders.filter(s => s.type === 'reminder');

    if (reminderSuggestions.length === 0) {
      setProcessedSuggestions([]);
      return;
    }

    const processed = reminderSuggestions
      .map(suggestion => {
        const fullReminder = allRemindersFromContext.find(r => r.id === suggestion.id);
        // Ensure fullReminder is found before spreading, and add similarity
        return fullReminder ? { ...fullReminder, similarity: suggestion.similarity } : null;
      })
      .filter(Boolean) as Array<ReminderType & { similarity: number }>; // Filter out nulls and assert type

    setProcessedSuggestions(processed);
  }, [suggestedReminders, allRemindersFromContext]);

  const handleLinkReminder = async (reminderId: string) => {
    if (!onLink) return;

    setLinkingReminderId(reminderId);
    try {
      await onLink(reminderId);
      // No need to manually remove from suggestions here, parent should refresh suggestions
    } catch (error) {
      console.error('Failed to link reminder:', error);
      // Potentially show an error to the user
    } finally {
      setLinkingReminderId(null);
    }
  };

  // Use allRemindersFromContext to find full reminder details for display
  // The `linkedRemindersFromProp` are of type `LinkedReminder` from `note.ts`
  const displayableLinkedReminders = linkedRemindersFromProp.map(linkedReminder => {
    return allRemindersFromContext.find(r => r.id === linkedReminder.id);
  }).filter(Boolean) as ReminderType[];


  const showSuggestionsSection = isLoadingSuggestions || processedSuggestions.length > 0 || (suggestedReminders && suggestedReminders.length > 0 && !isLoadingSuggestions && processedSuggestions.length === 0);

  // Combined empty state check
  if (displayableLinkedReminders.length === 0 && !showSuggestionsSection) {
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
      {displayableLinkedReminders.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--color-text)]">Linked Reminders</p>
          <div className="flex flex-wrap gap-1.5">
            {displayableLinkedReminders.map(reminder => (
              // MiniReminderCard expects a full ReminderType
              <MiniReminderCard
                key={reminder.id}
                reminder={reminder}
                onUnlink={onUnlink ? () => onUnlink(reminder.id) : undefined}
                onClick={() => setSelectedReminder(reminder)}
                consistentBorderColor={consistentBorderColor}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggested Reminders Section */}
      {showSuggestionsSection && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-purple-500" />
            <p className="text-xs font-medium text-[var(--color-text)]">Suggested Reminders</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {isLoadingSuggestions ? (
              <>
                <GenericSuggestionSkeleton type="reminder" />
                <GenericSuggestionSkeleton type="reminder" />
              </>
            ) : processedSuggestions.length > 0 ? (
              processedSuggestions.map(suggestion => (
                <SuggestedReminderCard
                  key={suggestion.id}
                  // The `suggestion` here is already a `ReminderType & { similarity: number }`
                  reminder={suggestion}
                  onLink={handleLinkReminder}
                  isLinking={linkingReminderId === suggestion.id}
                  consistentBorderColor={consistentBorderColor}
                />
              ))
            ) : (
              <p className="text-xs text-[var(--color-textSecondary)] w-full text-center py-2">
                {suggestedReminders && suggestedReminders.filter(s => s.type === 'reminder').length > 0
                  ? "Could not process reminder suggestions at this time."
                  : "No relevant reminders found to suggest."}
              </p>
            )}
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
    </div>
  );
} 