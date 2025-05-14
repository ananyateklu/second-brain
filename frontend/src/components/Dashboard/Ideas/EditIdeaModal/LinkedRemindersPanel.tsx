import { Bell, Clock, Check, X, Plus, Loader, Sparkles } from 'lucide-react';
import { Reminder as ReminderType } from '../../../../contexts/remindersContextUtils'; // For Reminder type from context
import { formatDistanceToNow } from 'date-fns';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import { EditReminderModal } from '../../Reminders/EditReminderModal';
import { useState, useEffect } from 'react';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';

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

interface SuggestedReminderCardProps {
    reminder: ReminderType & { similarity: number };
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

    const getContainerBackground = () => {
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

    if (displayableReminders.length === 0) {
        return (
            <div className={`p-3 ${getContainerBackground()}`}>
                {(processedSuggestions.length > 0 || isLoadingSuggestions) ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <p className="text-xs font-medium text-[var(--color-text)]">Suggested Reminders</p>
                            {isLoadingSuggestions && <Loader className="w-2.5 h-2.5 text-purple-500 animate-spin ml-auto" />}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {processedSuggestions.map(reminder => (
                                <SuggestedReminderCard
                                    key={reminder.id}
                                    reminder={reminder}
                                    onLink={handleLinkReminder}
                                    isLinking={linkingReminderId === reminder.id}
                                />
                            ))}
                            {processedSuggestions.length === 0 && !isLoadingSuggestions && (
                                <p className="text-xs text-[var(--color-textSecondary)] w-full text-center">
                                    {suggestedReminders && suggestedReminders.length > 0
                                        ? "Could not process reminder suggestions"
                                        : "No relevant reminders found"}
                                </p>
                            )}
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
                    {displayableReminders.map(fullReminder => { // Iterate over displayableReminders
                        if (!fullReminder) return null; // Should be filtered by now, but as a safeguard

                        return (
                            <MiniReminderCard
                                key={fullReminder.id} // Use fullReminder.id
                                reminder={fullReminder}
                                onUnlink={onUnlink}
                                onClick={() => setSelectedReminder(fullReminder)}
                            />
                        );
                    })}
                </div>
            </div>

            {(processedSuggestions.length > 0 || isLoadingSuggestions) && (
                <div className={`px-1.5 pb-1.5 ${getContainerBackground()}`}>
                    <div className="border-t border-[var(--color-border)]/10 dark:border-white/5 midnight:border-white/5 pt-1.5 mt-1">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <p className="text-xs font-medium text-[var(--color-text)]">Suggested Reminders</p>
                            {isLoadingSuggestions && <Loader className="w-2.5 h-2.5 text-purple-500 animate-spin ml-auto" />}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {processedSuggestions.map(reminder => (
                                <SuggestedReminderCard
                                    key={reminder.id}
                                    reminder={reminder}
                                    onLink={handleLinkReminder}
                                    isLinking={linkingReminderId === reminder.id}
                                />
                            ))}
                            {processedSuggestions.length === 0 && !isLoadingSuggestions && (
                                <p className="text-xs text-[var(--color-textSecondary)] w-full text-center">No relevant reminders found</p>
                            )}
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