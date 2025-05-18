import { useState, useEffect, useMemo } from 'react';
import { Reminder as ReminderType, useReminders } from '../../../../contexts/remindersContextUtils';
import { X, PlusCircle, Info, Loader, Sparkles } from 'lucide-react';
import { Idea } from '../../../../types/idea'; // Changed from Note to Idea
import { motion } from 'framer-motion';
import { useTheme } from '../../../../contexts/themeContextUtils';

interface SuggestionItem { // This interface might be provided by a shared types file eventually
    id: string;
    title: string;
    similarity: number;
    type: 'note' | 'idea' | 'task' | 'reminder';
    status?: string;
    dueDate?: string | null;
}

interface AddReminderLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (reminderId: string) => Promise<void | boolean>;
    currentLinkedReminderIds?: string[];
    currentIdea?: Idea; // Changed from currentNote to currentIdea
    passedSuggestedReminders?: SuggestionItem[];
    isLoadingSuggestions?: boolean;
}

export function IdeaAddReminderLinkModal({
    isOpen,
    onClose,
    onSelect,
    currentLinkedReminderIds = [],
    // currentIdea, // Keep for context if needed for filtering
    passedSuggestedReminders = [],
    isLoadingSuggestions = false,
}: AddReminderLinkModalProps) {
    const { reminders, isLoading: isLoadingRemindersContext } = useReminders();
    const { theme } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [linkingReminderId, setLinkingReminderId] = useState<string | null>(null);

    const [processedSuggestions, setProcessedSuggestions] = useState<Array<ReminderType & { similarity: number }>>([]);

    const getItemBackground = () => {
        if (theme === 'dark') return 'bg-gray-800';
        if (theme === 'midnight') return 'bg-[#1e293b]';
        return 'bg-white';
    };

    const getInputBorder = () => {
        if (theme === 'midnight') return 'border-white/10';
        return 'border-gray-300 dark:border-gray-600';
    };

    useEffect(() => {
        if (!passedSuggestedReminders || passedSuggestedReminders.length === 0) {
            setProcessedSuggestions(prev => prev.length === 0 ? prev : []);
            return;
        }

        const reminderSuggestions = passedSuggestedReminders.filter(s => s.type === 'reminder');

        const fullyProcessed = reminderSuggestions
            .map(suggestion => {
                const fullReminder = reminders.find(r => r.id === suggestion.id);
                if (fullReminder) {
                    return {
                        ...fullReminder,
                        similarity: suggestion.similarity,
                    };
                }
                return null;
            })
            .filter(Boolean) as Array<ReminderType & { similarity: number }>;

        setProcessedSuggestions(prevSuggestions => {
            const newKey = fullyProcessed.map(s => `${s.id}:${s.similarity}`).sort().join(',');
            const prevKey = prevSuggestions.map(s => `${s.id}:${s.similarity}`).sort().join(',');

            if (newKey === prevKey) {
                return prevSuggestions;
            }
            return fullyProcessed;
        });

    }, [passedSuggestedReminders, reminders]);

    const filteredReminders = useMemo(() => {
        return reminders
            .filter(reminder =>
                !currentLinkedReminderIds.includes(reminder.id) &&
                reminder.title.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [reminders, currentLinkedReminderIds, searchTerm]);

    const handleLinkReminder = async (reminderId: string) => {
        if (linkingReminderId === reminderId) return;
        setLinkingReminderId(reminderId);
        try {
            await onSelect(reminderId);
        } catch (error) {
            console.error("Failed to link reminder in modal:", error);
        } finally {
            setLinkingReminderId(null);
        }
    };

    const formatSimilarity = (score: number) => {
        return `${Math.round(score * 100)}%`;
    };

    if (!isOpen) return null;

    const renderReminderItem = (reminder: ReminderType, isSuggestion: boolean, similarity?: number) => {
        const isLinking = linkingReminderId === reminder.id;
        return (
            <motion.li
                key={reminder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                layout
                className={`p-2 rounded-lg flex items-center justify-between gap-2 transition-colors
          ${isSuggestion
                        ? 'bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20'
                        : 'hover:bg-[var(--color-surfaceHover)]'}
        `}
            >
                <div className="flex-grow min-w-0">
                    <p className={`text-xs font-medium truncate ${isSuggestion ? 'text-purple-700 dark:text-purple-300' : 'text-[var(--color-text)]'}`}>
                        {reminder.title}
                    </p>
                    <p className="text-[10px] text-[var(--color-textSecondary)]">
                        Due: {new Date(reminder.dueDateTime).toLocaleDateString()} {new Date(reminder.dueDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isSuggestion && similarity !== undefined && (
                            <span className="ml-2 px-1.5 py-0.5 text-[8px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full">
                                Match: {formatSimilarity(similarity)}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => handleLinkReminder(reminder.id)}
                    disabled={isLinking}
                    className={`p-1 rounded-md text-xs shrink-0 flex items-center justify-center w-7 h-7 
            ${isSuggestion
                            ? 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 dark:text-purple-400'
                            : 'bg-[var(--color-fill)] text-[var(--color-textSecondary)] hover:bg-[var(--color-accent)] hover:text-white'}
            transition-all duration-150 disabled:opacity-50 transform active:scale-90`}
                >
                    {isLinking ? <Loader className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                </button>
            </motion.li>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full max-w-md p-4 rounded-xl shadow-2xl border ${getInputBorder()} ${getItemBackground()} flex flex-col max-h-[70vh]`}
            >
                <div className="flex items-center justify-between pb-3 mb-3 border-b ${getInputBorder()}">
                    <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" /> Link Reminder
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)]">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {(isLoadingSuggestions && processedSuggestions.length === 0) && (
                    <div className="text-center py-4">
                        <Loader className="w-5 h-5 animate-spin text-purple-500 mx-auto" />
                        <p className="text-xs text-[var(--color-textSecondary)] mt-2">Loading suggestions...</p>
                    </div>
                )}

                {(!isLoadingSuggestions && processedSuggestions.length > 0) && (
                    <div className="mb-3">
                        <h4 className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1.5">Suggested Reminders</h4>
                        <ul className="space-y-1 max-h-[150px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
                            {processedSuggestions.map(suggestion => renderReminderItem(suggestion, true, suggestion.similarity))}
                        </ul>
                    </div>
                )}

                {processedSuggestions.length > 0 && <div className={`my-2 border-t ${getInputBorder()}`}></div>}

                <div>
                    <input
                        type="text"
                        placeholder="Search reminders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full px-3 py-1.5 text-xs rounded-lg border ${getInputBorder()} ${getItemBackground()} focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow placeholder:text-[var(--color-textSecondary)] text-[var(--color-text)] mb-2`}
                    />
                </div>

                <ul className="space-y-1 flex-grow overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[var(--color-fill)] scrollbar-track-transparent">
                    {isLoadingRemindersContext && searchTerm === '' && processedSuggestions.length === 0 && (
                        <div className="text-center py-4">
                            <Loader className="w-5 h-5 animate-spin text-[var(--color-textSecondary)] mx-auto" />
                        </div>
                    )}
                    {!isLoadingRemindersContext && filteredReminders.length === 0 && searchTerm !== '' && (
                        <li className="text-center text-xs text-[var(--color-textSecondary)] py-3">No reminders match "{searchTerm}".</li>
                    )}
                    {!isLoadingRemindersContext && filteredReminders.length === 0 && searchTerm === '' && processedSuggestions.length === 0 && (
                        <li className="text-center text-xs text-[var(--color-textSecondary)] py-3">No reminders to link.</li>
                    )}
                    {filteredReminders.map(reminder => renderReminderItem(reminder, false))}
                </ul>

                {filteredReminders.length === 0 && processedSuggestions.length === 0 && !isLoadingSuggestions && !isLoadingRemindersContext && (
                    <div className="text-center py-4 border-t mt-2 ${getInputBorder()}">
                        <Info className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-[var(--color-textSecondary)]">No reminders available to link.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
} 