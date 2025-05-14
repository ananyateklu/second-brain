import { Bell, Clock, Check, X, Plus, Loader, Sparkles } from 'lucide-react';
import { Reminder as ReminderType } from '../../../../contexts/remindersContextUtils'; // For Reminder type from context
import { formatDistanceStrict } from 'date-fns';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { EditReminderModal } from '../../Reminders/EditReminderModal';
import { useState, useEffect } from 'react';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import { GenericSuggestionSkeleton } from './GenericSuggestionSkeleton';

// Interface for suggestion items passed from parent
interface SuggestionItem {
    id: string;
    title: string;
    similarity: number;
    type: 'note' | 'idea' | 'task' | 'reminder';
    status?: string;
    dueDate?: string | null;
}

// Re-using LinkedReminder type for simplicity, assuming it just needs id and title for display in some contexts
// If specific idea-related reminder fields are needed, this might need adjustment.
interface LinkedReminderDisplay {
    id: string;
    title: string;
    // Add other fields from ReminderType if needed by MiniReminderCard
    dueDateTime: string;
    isCompleted: boolean;
    isSnoozed?: boolean; // Optional as it's not in LinkedReminder from note.ts
    createdAt?: string; // Optional
    updatedAt?: string; // Optional
}

interface MiniReminderCardProps {
    reminder: ReminderType; // Use full ReminderType from context
    onUnlink?: (reminderId: string) => void;
    onClick: () => void;
    consistentBorderColor: string; // Passed from parent
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

interface SuggestedReminderCardProps {
    reminder: ReminderType & { similarity: number };
    onLink: (reminderId: string) => void;
    isLinking?: boolean;
    consistentBorderColor: string; // Passed from parent
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
    // Use the simplified display type for linked reminders passed in
    reminders: LinkedReminderDisplay[];
    onUnlink?: (reminderId: string) => void;
    onLink?: (reminderId: string) => Promise<boolean | void>; // Match EditIdeaModal handleLinkReminder
    suggestedReminders?: SuggestionItem[]; // Accept suggestions passed from parent instead of fetching
    isLoadingSuggestions?: boolean; // Loading state passed from parent
}

export function LinkedRemindersPanel({
    reminders,
    onUnlink,
    onLink,
    suggestedReminders = [],
    isLoadingSuggestions = false
}: LinkedRemindersPanelProps) {
    const { reminders: allRemindersFromContext } = useReminders(); // Renamed to avoid conflict
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
        // This function is used for the panel background itself, not individual cards.
        // Keeping its logic separate for clarity or if panel needs different styling later.
        if (theme === 'dark') return 'bg-[#111827]';
        if (theme === 'midnight') return 'bg-[#1e293b]';
        return 'bg-[var(--color-surface)]';
    };

    // Process suggestion items into full reminder objects
    useEffect(() => {
        console.log("Processing reminder suggestions:", suggestedReminders);

        if (!suggestedReminders?.length) {
            console.log("No reminder suggestions provided");
            setProcessedSuggestions([]);
            return;
        }

        // Filter to only include reminder type
        const reminderSuggestions = suggestedReminders.filter(s => s.type === 'reminder');
        console.log(`Found ${reminderSuggestions.length} reminder suggestions with type 'reminder'`);

        if (reminderSuggestions.length === 0) {
            console.log("No suggestions with type 'reminder' found");
            setProcessedSuggestions([]);
            return;
        }

        // Log reminder IDs for comparison
        console.log("Reminder suggestion IDs:", reminderSuggestions.map(r => r.id));
        console.log("Available reminder IDs:", allRemindersFromContext.map(r => r.id));

        // Convert suggestion items to full reminder objects
        const processed = reminderSuggestions
            .map(suggestion => {
                const fullReminder = allRemindersFromContext.find(r => r.id === suggestion.id);

                // Log for debugging
                if (!fullReminder) {
                    console.log(`Could not find full reminder with ID: ${suggestion.id}`);
                    return null;
                }

                console.log(`Found matching reminder: "${fullReminder.title}" for suggestion ID: ${suggestion.id}`);
                return {
                    ...fullReminder,
                    similarity: suggestion.similarity
                };
            })
            .filter(Boolean) as Array<ReminderType & { similarity: number }>;

        console.log(`Processed ${processed.length} suggestions into full reminders`);
        setProcessedSuggestions(processed);
    }, [suggestedReminders, allRemindersFromContext]);

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

    // Use allRemindersFromContext to find full reminder details for display
    const displayableReminders = reminders.map(linkedReminder => {
        return allRemindersFromContext.find(r => r.id === linkedReminder.id);
    }).filter(Boolean) as ReminderType[];

    if (displayableReminders.length === 0 && processedSuggestions.length === 0 && !isLoadingSuggestions) {
        // This case is when there are no linked reminders, no suggestions to show (after loading), and not currently loading.
        // The original component had a slightly different conditional structure here.
        // We want to show the empty state for suggestions if there are no linked items AND no suggestions.
        // If there ARE linked items, but no suggestions, this part of the UI (suggestions) would just be empty or show "no suggestions".
        // For now, let's adjust the primary return for when there are truly NO items (linked or suggested) to show, 
        // and handle suggestions separately.

        // If no linked reminders AND no processed suggestions (and not loading them), show an empty panel.
        // The suggestions part will be handled below.
        return (
            <div className={`p-3 ${getContainerBackground()} rounded-lg border ${consistentBorderColor}`}>
                <p className="text-xs text-center text-[var(--color-textSecondary)]">
                    No reminders linked or suggested yet.
                </p>
            </div>
        );
    }

    // Determine if we should show the "Suggested Reminders" section at all
    const showSuggestionsSection = isLoadingSuggestions || processedSuggestions.length > 0 || (suggestedReminders && suggestedReminders.length > 0 && !isLoadingSuggestions && processedSuggestions.length === 0); // last case for when suggestions provided but failed to process

    return (
        <div className={`p-3 ${getContainerBackground()} rounded-lg border ${consistentBorderColor} space-y-3`}>
            {/* Linked Reminders Section */}
            {displayableReminders.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--color-text)]">Linked Reminders</p>
                    <div className="flex flex-wrap gap-1.5">
                        {displayableReminders.map(reminder => (
                            reminder && (
                                <MiniReminderCard
                                    key={reminder.id}
                                    reminder={reminder}
                                    onUnlink={onUnlink ? () => onUnlink(reminder.id) : undefined}
                                    onClick={() => setSelectedReminder(reminder)}
                                    consistentBorderColor={consistentBorderColor}
                                />
                            )
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
                        {/* {isLoadingSuggestions && <Loader className="w-2.5 h-2.5 text-purple-500 animate-spin ml-auto" />} Removed loader */}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {isLoadingSuggestions ? (
                            <>
                                <GenericSuggestionSkeleton type="reminder" />
                                <GenericSuggestionSkeleton type="reminder" />
                            </>
                        ) : processedSuggestions.length > 0 ? (
                            processedSuggestions.map(reminder => (
                                <SuggestedReminderCard
                                    key={reminder.id}
                                    reminder={reminder}
                                    onLink={handleLinkReminder}
                                    isLinking={linkingReminderId === reminder.id}
                                    consistentBorderColor={consistentBorderColor}
                                />
                            ))
                        ) : (
                            // Only show this if not loading and no processed suggestions
                            <p className="text-xs text-[var(--color-textSecondary)] w-full text-center py-2">
                                {suggestedReminders && suggestedReminders.length > 0
                                    ? "Could not process reminder suggestions at this time."
                                    : "No relevant reminders found to suggest."}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Empty state for the whole panel if absolutely nothing to show */}
            {displayableReminders.length === 0 && !showSuggestionsSection && (
                <p className="text-xs text-center text-[var(--color-textSecondary)] py-4">
                    No reminders linked or suggested yet.
                </p>
            )}

            {selectedReminder && (
                <EditReminderModal
                    isOpen={!!selectedReminder}
                    onClose={() => setSelectedReminder(null)}
                    reminder={selectedReminder}
                />
            )}
        </div>
    );
} 