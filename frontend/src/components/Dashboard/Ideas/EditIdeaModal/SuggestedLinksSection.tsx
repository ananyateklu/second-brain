import { useState, useEffect, useRef } from 'react';
import { Link2, PlusCircle, Type, Lightbulb, CheckSquare, Loader } from 'lucide-react';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import aiSettingsService from '../../../../services/api/aiSettings.service';
import { useAI } from '../../../../contexts/AIContext';

// Define a consistent interface for suggestion items
interface SuggestionItem {
    id: string;
    title: string;
    similarity: number;
    type: 'note' | 'idea' | 'task' | 'reminder';
    status?: string;
    dueDate?: string | null;
    isLinking?: boolean;
    displayKey?: string;
}

interface SuggestedLinksSectionProps {
    suggestedNotes: SuggestionItem[];
    suggestedIdeas: SuggestionItem[];
    suggestedTasks: SuggestionItem[];
    isLoading: boolean;
    error: string | null;
    onLinkNote: (noteId: string) => Promise<void>;
    onLinkIdea: (ideaId: string) => Promise<void>;
    onLinkTask: (taskId: string) => Promise<void>;
}

export function SuggestedLinksSection({
    suggestedNotes = [],
    suggestedIdeas = [],
    suggestedTasks = [],
    isLoading,
    error,
    onLinkNote,
    onLinkIdea,
    onLinkTask
}: SuggestedLinksSectionProps) {
    const { theme } = useTheme();
    const { settingsVersion } = useAI();

    const [isEnabled, setIsEnabled] = useState<boolean>(true);
    const hasSuggestionsLoadedOnce = useRef(false);

    const [linkingItems, setLinkingItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let isMounted = true;
        const loadAISettings = async () => {
            try {
                const settings = await aiSettingsService.getAISettings();
                if (isMounted) {
                    const newEnabledState = settings?.contentSuggestions?.enabled !== false;
                    setIsEnabled(newEnabledState);
                }
            } catch (err) {
                console.error('Error loading AI settings in SuggestedLinksSection:', err);
                if (isMounted) {
                    setIsEnabled(true);
                }
            }
        };
        loadAISettings();
        return () => { isMounted = false; };
    }, [settingsVersion]);

    useEffect(() => {
        if (!isLoading && !error) {
            hasSuggestionsLoadedOnce.current = true;
        }
    }, [isLoading, error]);

    const handleLinkItem = async (item: SuggestionItem) => {
        setLinkingItems(prev => ({ ...prev, [item.id]: true }));
        try {
            if (item.type === 'note') {
                await onLinkNote(item.id);
            } else if (item.type === 'idea') {
                await onLinkIdea(item.id);
            } else if (item.type === 'task') {
                await onLinkTask(item.id);
            }
        } catch (linkError) {
            console.error('Failed to link item in SuggestedLinksSection:', linkError);
        } finally {
            setLinkingItems(prev => {
                const newState = { ...prev };
                delete newState[item.id];
                return newState;
            });
        }
    };

    const allSuggestions = [
        ...suggestedNotes.map((item, index) => ({
            ...item,
            displayKey: `note-${item.id}-${index}`,
            isLinking: linkingItems[item.id] || false
        })),
        ...suggestedIdeas.map((item, index) => ({
            ...item,
            displayKey: `idea-${item.id}-${index}`,
            isLinking: linkingItems[item.id] || false
        })),
        ...suggestedTasks.map((item, index) => ({
            ...item,
            displayKey: `task-${item.id}-${index}`,
            isLinking: linkingItems[item.id] || false
        }))
    ].filter(s => s.similarity > 0);

    if (!isEnabled) {
        return (
            <div className="p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] text-center">
                <p className="text-xs text-[var(--color-textSecondary)]">
                    Content suggestions are disabled in AI settings.
                </p>
            </div>
        );
    }

    if (allSuggestions.length === 0 && !isLoading && !error && !hasSuggestionsLoadedOnce.current) {
        return null;
    }

    const getBorderStyle = () => {
        if (theme === 'midnight') return 'border-white/5';
        if (theme === 'dark') return 'border-gray-700/30';
        return 'border-[var(--color-border)]';
    };

    const getItemBackground = () => {
        if (theme === 'dark') return 'bg-[#111827]';
        if (theme === 'midnight') return 'bg-[#1e293b]';
        return 'bg-[var(--color-surface)]';
    };

    const formatScore = (score: number): string => {
        if (typeof score !== 'number' || isNaN(score)) {
            return '-';
        }
        return `${Math.round(score * 100)}%`;
    };

    const renderSuggestionItem = (item: SuggestionItem) => {
        let icon = null;
        let bgColor = '';
        let borderColor = '';
        let textColor = '';

        if (item.type === 'note') {
            icon = <Type className="w-3 h-3 text-blue-500" />;
            bgColor = 'bg-blue-50 dark:bg-blue-900/10';
            borderColor = 'border-blue-200 dark:border-blue-800/30';
            textColor = 'text-blue-500';
        } else if (item.type === 'idea') {
            icon = <Lightbulb className="w-3 h-3 text-yellow-500" />;
            bgColor = 'bg-yellow-50 dark:bg-yellow-900/10';
            borderColor = 'border-yellow-200 dark:border-yellow-800/30';
            textColor = 'text-yellow-500';
        } else if (item.type === 'task') {
            icon = <CheckSquare className="w-3 h-3 text-green-500" />;
            bgColor = 'bg-green-50 dark:bg-green-900/10';
            borderColor = 'border-green-200 dark:border-green-800/30';
            textColor = 'text-green-500';
        }

        return (
            <motion.div
                key={item.displayKey}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`relative flex items-center gap-1.5 p-1.5 ${bgColor} rounded-lg border ${borderColor} group hover:bg-opacity-75 transition-colors cursor-pointer`}
                onClick={() => !(linkingItems[item.id]) && handleLinkItem(item)}
            >
                <div className={`shrink-0 p-1 ${bgColor} rounded-lg`}>
                    {icon}
                </div>

                <div className="min-w-0 flex-1">
                    <h6 className="text-xs font-medium text-[var(--color-text)] truncate flex items-center gap-1">
                        {item.title}
                        {linkingItems[item.id] && <Loader className="w-2 h-2 animate-spin" />}
                    </h6>
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-1 py-0.5 text-[8px] font-medium ${bgColor} ${textColor} rounded`}>
                            Match: {formatScore(item.similarity)}
                        </span>
                        {item.type === 'task' && item.status && (
                            <span className="inline-flex items-center px-1 py-0.5 text-[8px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                                {item.status}
                            </span>
                        )}
                    </div>
                </div>

                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLinkItem(item);
                    }}
                    className={`absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 ${bgColor} ${textColor} rounded-full border ${borderColor} transition-all z-10`}
                    disabled={linkingItems[item.id]}
                >
                    <PlusCircle className="w-2.5 h-2.5" />
                </button>
            </motion.div>
        );
    };

    const noteSuggestionsToDisplay = allSuggestions.filter(item => item.type === 'note');
    const ideaSuggestionsToDisplay = allSuggestions.filter(item => item.type === 'idea');
    const taskSuggestionsToDisplay = allSuggestions.filter(item => item.type === 'task');

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--color-text)] flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[var(--color-textSecondary)]" />
                    Suggested Links
                </h3>
                {isLoading && <Loader className="w-3 h-3 animate-spin text-[var(--color-textSecondary)]" />}
            </div>

            {error && (
                <div className="p-2 text-xs text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">
                    Error loading suggestions: {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-1.5">
                {isLoading && allSuggestions.length === 0 && !error ? (
                    <div className={`p-3 ${getItemBackground()} rounded-lg border ${getBorderStyle()} text-center`}>
                        <p className="text-xs text-[var(--color-textSecondary)] flex justify-center items-center gap-2">
                            <Loader className="w-3 h-3 animate-spin" />
                            Finding related content...
                        </p>
                    </div>
                ) : (
                    <>
                        {noteSuggestionsToDisplay.length > 0 && (
                            <div className="space-y-1.5">
                                <h4 className="text-xs font-medium text-[var(--color-textSecondary)]">Notes</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                    {noteSuggestionsToDisplay.map(renderSuggestionItem)}
                                </div>
                            </div>
                        )}

                        {ideaSuggestionsToDisplay.length > 0 && (
                            <div className="space-y-1.5">
                                <h4 className="text-xs font-medium text-[var(--color-textSecondary)]">Ideas</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                    {ideaSuggestionsToDisplay.map(renderSuggestionItem)}
                                </div>
                            </div>
                        )}

                        {taskSuggestionsToDisplay.length > 0 && (
                            <div className="space-y-1.5">
                                <h4 className="text-xs font-medium text-[var(--color-textSecondary)]">Tasks</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                    {taskSuggestionsToDisplay.map(renderSuggestionItem)}
                                </div>
                            </div>
                        )}

                        {!isLoading && allSuggestions.length === 0 && !error && hasSuggestionsLoadedOnce.current && (
                            <div className={`p-3 ${getItemBackground()} rounded-lg border ${getBorderStyle()} text-center`}>
                                <p className="text-xs text-[var(--color-textSecondary)]">
                                    No relevant links found at the moment.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
} 