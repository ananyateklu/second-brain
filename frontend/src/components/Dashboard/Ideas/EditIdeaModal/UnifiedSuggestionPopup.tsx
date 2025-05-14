import { useState } from 'react';
import { X, Loader2, Link as LinkIcon, FileText, Lightbulb, CheckSquare, BellRing, AlertTriangle, RefreshCw } from 'lucide-react';
import { Idea } from '../../../../types/idea';
import { motion, AnimatePresence } from 'framer-motion';
import { GenericSuggestionSkeleton } from './GenericSuggestionSkeleton'; // Assuming this exists and is suitable
import { useTheme } from '../../../../contexts/themeContextUtils';

interface UnifiedSuggestion {
    id: string;
    title: string;
    similarity: number;
    type: 'note' | 'idea' | 'task' | 'reminder';
    status?: string; // For tasks
    dueDate?: string | null; // For tasks/reminders
    // Add any other relevant fields displayed from original SuggestionItem if needed
}

interface SuggestionState {
    isLoading: boolean;
    error: string | null;
    suggestions: {
        notes: UnifiedSuggestion[];
        ideas: UnifiedSuggestion[];
        tasks: UnifiedSuggestion[];
        reminders: UnifiedSuggestion[];
    };
}

interface UnifiedSuggestionPopupProps {
    isOpen: boolean;
    onClose: () => void;
    currentIdea: Idea;
    suggestionState: SuggestionState;
    loadSuggestions: () => Promise<void>;
    onLinkItem: (itemId: string, itemType: 'Note' | 'Idea' | 'Task' | 'Reminder') => Promise<boolean>;
}

const IconMap = {
    note: FileText,
    idea: Lightbulb,
    task: CheckSquare,
    reminder: BellRing,
};

interface LinkingItemState {
    id: string | null;
    status: 'linking' | 'linked' | null;
}

export function UnifiedSuggestionPopup({
    isOpen,
    onClose,
    currentIdea,
    suggestionState,
    loadSuggestions,
    onLinkItem,
}: UnifiedSuggestionPopupProps) {
    const { theme } = useTheme();
    const [linkingItemState, setLinkingItemState] = useState<LinkingItemState>({ id: null, status: null });

    const handleLink = async (itemId: string, itemType: 'note' | 'idea' | 'task' | 'reminder') => {
        setLinkingItemState({ id: itemId, status: 'linking' });
        // Capitalize the first letter of the item type for the API
        const capitalizedItemType = itemType.charAt(0).toUpperCase() + itemType.slice(1) as 'Note' | 'Idea' | 'Task' | 'Reminder';
        try {
            const success = await onLinkItem(itemId, capitalizedItemType);
            if (success) {
                setLinkingItemState({ id: itemId, status: 'linked' });
                // Parent component will reload suggestions, which should make the item disappear or update.
                // If we wanted a delay before it disappears from this UI:
                // setTimeout(() => {
                //     // Potentially clear linkingItemState here if the item isn't removed by parent's reload
                // }, 1500); // Keep "Linked" status for 1.5s
            } else {
                setLinkingItemState({ id: null, status: null }); // Linking failed
            }
        } catch (error) {
            console.error("Linking failed:", error);
            setLinkingItemState({ id: null, status: null }); // Error occurred
        }
        // Suggestions will be reloaded by the parent if successful linking should trigger it
    };

    const getBorderStyle = () => {
        if (theme === 'midnight') return 'border-white/10';
        if (theme === 'dark') return 'border-gray-700/60'; // Darker border for popup
        return 'border-gray-300';
    };

    const getBackgroundColor = () => {
        if (theme === 'dark') return 'bg-gray-800'; // Slightly different dark bg
        if (theme === 'midnight') return 'bg-slate-800';
        return 'bg-white';
    };

    const getCardBg = () => {
        if (theme === 'dark') return 'bg-gray-700/50 hover:bg-gray-700/80';
        if (theme === 'midnight') return 'bg-slate-700/50 hover:bg-slate-700/80';
        return 'bg-gray-50 hover:bg-gray-100';
    }

    const renderSuggestionItem = (item: UnifiedSuggestion) => {
        const Icon = IconMap[item.type];
        const isCurrentItemLinking = linkingItemState.id === item.id && linkingItemState.status === 'linking';
        const isCurrentItemLinked = linkingItemState.id === item.id && linkingItemState.status === 'linked';
        return (
            <div
                key={item.id}
                className={`p-3 rounded-lg border ${getBorderStyle()} ${getCardBg()} transition-all group`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-5 h-5 ${item.type === 'note' ? 'text-blue-500' : item.type === 'idea' ? 'text-yellow-500' : item.type === 'task' ? 'text-green-500' : 'text-purple-500'}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text)] truncate" title={item.title}>{item.title}</p>
                            <span className="text-xs text-[var(--color-textSecondary)]">
                                {item.type.charAt(0).toUpperCase() + item.type.slice(1)} - Match: {Math.round(item.similarity * 100)}%
                            </span>
                            {item.status && <span className='ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-600 text-gray-200'>{item.status}</span>}
                            {item.dueDate && <span className='ml-2 text-xs text-[var(--color-textSecondary)]'>Due: {new Date(item.dueDate).toLocaleDateString()}</span>}
                        </div>
                    </div>
                    <button
                        onClick={() => handleLink(item.id, item.type)}
                        disabled={isCurrentItemLinking || isCurrentItemLinked}
                        className="ml-2 p-1.5 rounded-md text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={`Link this ${item.type}`}
                    >
                        {isCurrentItemLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrentItemLinked ? <CheckSquare className="w-4 h-4 text-green-500" /> : <LinkIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        );
    };

    const allSuggestionsEmpty =
        suggestionState.suggestions.notes.length === 0 &&
        suggestionState.suggestions.ideas.length === 0 &&
        suggestionState.suggestions.tasks.length === 0 &&
        suggestionState.suggestions.reminders.length === 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className={`relative flex flex-col w-full max-w-2xl h-auto max-h-[80vh] ${getBackgroundColor()} rounded-xl shadow-2xl overflow-hidden border ${getBorderStyle()}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`flex items-center justify-between p-4 border-b ${getBorderStyle()} shrink-0`}>
                            <h3 className="text-lg font-semibold text-[var(--color-text)]">
                                Suggestions for "<span className='text-[var(--color-idea)]'>{currentIdea.title}</span>"
                            </h3>
                            <div className='flex items-center gap-2'>
                                <button
                                    onClick={loadSuggestions}
                                    disabled={suggestionState.isLoading || linkingItemState.status === 'linking'}
                                    className='p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed'
                                    title='Refresh suggestions'
                                >
                                    {suggestionState.isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <RefreshCw className='w-4 h-4' />}
                                </button>
                                <button onClick={onClose} className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] rounded-md">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                            {suggestionState.isLoading && allSuggestionsEmpty && (
                                <div className="space-y-3">
                                    <GenericSuggestionSkeleton />
                                    <GenericSuggestionSkeleton />
                                    <GenericSuggestionSkeleton />
                                </div>
                            )}
                            {suggestionState.error && (
                                <div className="p-3 text-sm bg-red-900/30 text-red-300 border border-red-700 rounded-lg flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    <div>
                                        <p className='font-semibold'>Error loading suggestions:</p>
                                        <p>{suggestionState.error}</p>
                                    </div>
                                </div>
                            )}
                            {!suggestionState.isLoading && !suggestionState.error && allSuggestionsEmpty && (
                                <div className="text-center py-10">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-md font-medium text-[var(--color-text)]">No suggestions found</p>
                                    <p className="text-sm text-[var(--color-textSecondary)]">Try adding more content to your idea or other items.</p>
                                </div>
                            )}

                            {suggestionState.suggestions.notes.length > 0 && (
                                <section>
                                    <h4 className="text-xs font-semibold uppercase text-[var(--color-textSecondary)] mb-2 tracking-wider">Notes</h4>
                                    <div className="space-y-2">{suggestionState.suggestions.notes.map(renderSuggestionItem)}</div>
                                </section>
                            )}
                            {suggestionState.suggestions.ideas.length > 0 && (
                                <section>
                                    <h4 className="text-xs font-semibold uppercase text-[var(--color-textSecondary)] mt-4 mb-2 tracking-wider">Ideas</h4>
                                    <div className="space-y-2">{suggestionState.suggestions.ideas.map(renderSuggestionItem)}</div>
                                </section>
                            )}
                            {suggestionState.suggestions.tasks.length > 0 && (
                                <section>
                                    <h4 className="text-xs font-semibold uppercase text-[var(--color-textSecondary)] mt-4 mb-2 tracking-wider">Tasks</h4>
                                    <div className="space-y-2">{suggestionState.suggestions.tasks.map(renderSuggestionItem)}</div>
                                </section>
                            )}
                            {suggestionState.suggestions.reminders.length > 0 && (
                                <section>
                                    <h4 className="text-xs font-semibold uppercase text-[var(--color-textSecondary)] mt-4 mb-2 tracking-wider">Reminders</h4>
                                    <div className="space-y-2">{suggestionState.suggestions.reminders.map(renderSuggestionItem)}</div>
                                </section>
                            )}
                        </div>
                        {/* Footer - Optional, could add a bulk link or dismiss all button */}
                        <div className={`flex justify-end p-3 border-t ${getBorderStyle()} shrink-0`}>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-[var(--color-text)] bg-[var(--color-surfaceHover)] hover:bg-[var(--color-border)] rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
} 