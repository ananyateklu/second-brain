import { useState, useEffect, useRef } from 'react';
import { Link2, PlusCircle, Type, Lightbulb, CheckSquare, Loader } from 'lucide-react';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import aiSettingsService from '../../../../services/api/aiSettings.service';
import { useAI } from '../../../../contexts/AIContext';
import { GenericSuggestionSkeleton } from './GenericSuggestionSkeleton';

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

    const consistentBorderColor = (() => {
        switch (theme) {
            case 'midnight':
                return 'border-white/10'; // Subtle white border
            case 'dark':
                return 'border-gray-700/30'; // Subtle dark gray border
            case 'full-dark':
                return 'border-white/10'; // Subtle white border for very dark theme
            case 'light':
            default:
                return 'border-[var(--color-border)]'; // Default for light
        }
    })();

    useEffect(() => {
        let isMounted = true;
        const loadAISettings = async () => {
            try {
                const settings = await aiSettingsService.getAISettings();
                if (isMounted) {
                    const newEnabledState = settings?.contentSuggestions?.enabled !== false;
                    console.log('[SuggestedLinksSection] AI Content Suggestions Enabled:', newEnabledState, 'Settings:', settings?.contentSuggestions);
                    setIsEnabled(newEnabledState);
                }
            } catch (err) {
                console.error('Error loading AI settings in SuggestedLinksSection:', err);
                if (isMounted) {
                    setIsEnabled(true); // Default to true on error
                }
            }
        };
        loadAISettings();
        return () => { isMounted = false; };
    }, [settingsVersion]);

    useEffect(() => {
        console.log('[SuggestedLinksSection] Props received - isLoading:', isLoading, 'error:', error);
        console.log('[SuggestedLinksSection] suggestedNotes:', suggestedNotes?.length, suggestedNotes);
        console.log('[SuggestedLinksSection] suggestedIdeas:', suggestedIdeas?.length, suggestedIdeas);
        console.log('[SuggestedLinksSection] suggestedTasks:', suggestedTasks?.length, suggestedTasks);
        if (!isLoading && !error) {
            hasSuggestionsLoadedOnce.current = true;
        }
    }, [isLoading, error, suggestedNotes, suggestedIdeas, suggestedTasks]);

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
    ].filter(s => s.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity);

    console.log('[SuggestedLinksSection] Processed allSuggestions:', allSuggestions?.length, allSuggestions);

    if (!isEnabled) {
        console.log('[SuggestedLinksSection] Rendering: Suggestions disabled by AI settings.');
        return (
            <div className="p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] text-center">
                <p className="text-xs text-[var(--color-textSecondary)]">
                    Content suggestions are disabled in AI settings.
                </p>
            </div>
        );
    }

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
        let iconColor = ''; // For the icon itself
        let specificTextColor = ''; // For text elements like match score that need specific color

        // Define consistent background and border colors using CSS theme variables
        const consistentBgColor = 'bg-[var(--color-surface)]';
        const consistentHoverBgColor = 'hover:bg-[var(--color-surfaceHover)]';

        let statusBadgeBgColor = 'bg-gray-100';
        let statusBadgeTextColor = 'text-gray-500';

        switch (theme) {
            case 'dark':
                statusBadgeBgColor = 'bg-gray-800';
                statusBadgeTextColor = 'text-gray-400';
                break;
            case 'midnight':
            case 'full-dark':
                statusBadgeBgColor = 'bg-gray-700/30'; // More subdued background
                statusBadgeTextColor = 'text-gray-400'; // Consistent with dark theme text for status
                break;
            // Light theme (default) uses the initial values
        }

        if (item.type === 'note') {
            iconColor = 'text-blue-500';
            icon = <Type className={`w-3 h-3 ${iconColor}`} />;
            specificTextColor = 'text-blue-500';
        } else if (item.type === 'idea') {
            iconColor = 'text-yellow-500';
            icon = <Lightbulb className={`w-3 h-3 ${iconColor}`} />;
            specificTextColor = 'text-yellow-500';
        } else if (item.type === 'task') {
            iconColor = 'text-[var(--color-task)]';
            icon = <CheckSquare className={`w-3 h-3 ${iconColor}`} />;
            specificTextColor = 'text-[var(--color-task)]';
        }

        // If the item is linking AND the main suggestions list is loading,
        // show a skeleton for this specific item.
        if (linkingItems[item.id] && isLoading) {
            return <GenericSuggestionSkeleton key={item.displayKey} />;
        }

        return (
            <motion.div
                key={item.displayKey}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`relative flex items-center gap-1.5 p-1.5 ${consistentBgColor} rounded-lg border ${consistentBorderColor} group ${consistentHoverBgColor} transition-colors cursor-pointer`}
                onClick={() => !(linkingItems[item.id]) && handleLinkItem(item)}
            >
                <div className={`shrink-0 p-1 ${consistentBgColor} rounded-lg`}>
                    {icon}
                </div>

                <div className="min-w-0 flex-1">
                    <h6 className="text-xs font-medium text-[var(--color-text)] truncate flex items-center gap-1">
                        {item.title}
                        {linkingItems[item.id] && <Loader className="w-2 h-2 animate-spin" />}
                    </h6>
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-1 py-0.5 text-[8px] font-medium ${consistentBgColor} ${specificTextColor} rounded`}>
                            Match: {formatScore(item.similarity)}
                        </span>
                        {item.type === 'task' && item.status && (
                            <span className={`inline-flex items-center px-1 py-0.5 text-[8px] font-medium ${statusBadgeBgColor} ${statusBadgeTextColor} rounded`}>
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
                    className={`absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 ${consistentBgColor} ${specificTextColor} rounded-full border ${consistentBorderColor} transition-all z-10`}
                    disabled={linkingItems[item.id]}
                >
                    <PlusCircle className="w-2.5 h-2.5" />
                </button>
            </motion.div>
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--color-text)] flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[var(--color-textSecondary)]" />
                    Suggested Links
                </h3>
            </div>

            {error && (
                <div className="p-2 text-xs text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">
                    Error loading suggestions: {error}
                </div>
            )}

            {!error && isLoading && (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-1.5`}>
                    <GenericSuggestionSkeleton />
                    <GenericSuggestionSkeleton />
                    <GenericSuggestionSkeleton />
                </div>
            )}

            {!error && !isLoading && (
                <>
                    {allSuggestions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                            {allSuggestions.map(renderSuggestionItem)}
                        </div>
                    ) : (
                        hasSuggestionsLoadedOnce.current && (
                            <div className={`p-3 ${getItemBackground()} rounded-lg border ${consistentBorderColor} text-center`}>
                                <p className="text-xs text-[var(--color-textSecondary)]">
                                    No relevant links found at the moment.
                                </p>
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
} 