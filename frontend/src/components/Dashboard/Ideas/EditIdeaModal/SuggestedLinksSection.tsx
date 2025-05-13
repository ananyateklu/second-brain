import { useState, useEffect, useCallback, useRef } from 'react';
import { Link2, PlusCircle, Type, Lightbulb, CheckSquare, Loader } from 'lucide-react';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { useIdeas } from '../../../../contexts/ideasContextUtils';
import { Idea } from '../../../../types/idea';
import { similarContentService } from '../../../../services/ai/similarContentService';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import aiSettingsService from '../../../../services/api/aiSettings.service';
import { useAI } from '../../../../contexts/AIContext';

interface SuggestedLinksSectionProps {
    currentIdea: Idea;
    linkedNoteIds: string[];
    linkedIdeaIds: string[];
    linkedTaskIds: string[];
    onLinkNote: (noteId: string) => Promise<void>;
    onLinkIdea: (ideaId: string) => Promise<void>;
    onLinkTask: (taskId: string) => Promise<void>;
}

export function SuggestedLinksSection({
    currentIdea,
    linkedNoteIds,
    linkedIdeaIds,
    linkedTaskIds,
    onLinkNote,
    onLinkIdea,
    onLinkTask
}: SuggestedLinksSectionProps) {
    const { notes: allNotes } = useNotes();
    const { tasks: allTasks } = useTasks();
    const { state: { ideas: allIdeas } } = useIdeas();
    const { theme } = useTheme();
    const { settingsVersion } = useAI(); // Get the settings version from AIContext

    // Use a ref to track loading state internally
    const isLoadingRef = useRef(false);
    // State for UI purposes (rendering loading indicator)
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Array<{
        id: string;
        title: string;
        similarity: number;
        type: 'note' | 'idea' | 'task' | 'reminder';
        status?: string;
        dueDate?: string | null;
        isLinking?: boolean;
        validItem?: boolean;
        displayKey?: string;
    }>>([]);
    const [error, setError] = useState('');
    const [isEnabled, setIsEnabled] = useState<boolean>(true);
    const hasSuggestionsLoaded = useRef(false);

    // Function to load suggestions - memoized to prevent unnecessary re-renders
    const loadSuggestions = useCallback(async () => {
        // Skip loading if suggestions are disabled in settings
        if (!isEnabled || !currentIdea || !allNotes.length || !allIdeas.length) {
            if (!isEnabled) {
                console.log("Skipping suggestions loading because they are disabled");
            }
            return;
        }

        // Don't reload if already loading - use ref instead of state
        if (isLoadingRef.current) {
            console.log("Already loading suggestions, skipping");
            return;
        }

        try {
            isLoadingRef.current = true;
            setIsLoading(true);
            setError('');

            console.log("Finding similar content for:", currentIdea.title);

            // Gather item counts for debugging
            console.log("Available items for suggestions:", {
                notes: allNotes.length,
                ideas: allIdeas.length - 1, // Minus current idea
                tasks: allTasks.length,
                alreadyLinked: [...linkedNoteIds, ...linkedIdeaIds, ...linkedTaskIds].length
            });

            const results = await similarContentService.findSimilarContent(
                {
                    id: currentIdea.id,
                    title: currentIdea.title,
                    content: currentIdea.content || '',
                    tags: currentIdea.tags || []
                },
                allNotes,
                allIdeas.filter(idea => idea.id !== currentIdea.id), // Filter out current idea
                allTasks,
                [], // No reminders
                [...linkedNoteIds, ...linkedIdeaIds, ...linkedTaskIds], // Exclude already linked items
                8 // Get 8 results max
            );

            console.log("Successfully received suggestions:", results.length);

            // Map results to component state
            setSuggestions(results.map((result, index) => ({
                ...result,
                displayKey: `${result.type}-${result.id}-${index}`
            })));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error("Error finding similar content:", err);
            console.error("Error details:", { message: errorMessage, idea: currentIdea?.id });
            setError('Failed to load suggestions: ' + errorMessage);

            // Clear suggestions when error occurs
            setSuggestions([]);
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    }, [currentIdea, allNotes, allIdeas, allTasks, linkedNoteIds, linkedIdeaIds, linkedTaskIds, isEnabled]);

    // Load AI settings to check if content suggestions are enabled
    // This effect now re-runs when settingsVersion changes
    useEffect(() => {
        let isMounted = true;

        const loadSettings = async () => {
            try {
                const settings = await aiSettingsService.getAISettings();
                if (isMounted) {
                    // Clear similarContentService cache to force refresh 
                    // with new settings
                    similarContentService.clearCache();

                    // Set enabled state based on settings or default to true if not specified
                    const newEnabledState = settings?.contentSuggestions?.enabled !== false;

                    // Get current values directly from state instead of closure
                    setIsEnabled(prevIsEnabled => {
                        // Only refresh if enabled state changed
                        if (newEnabledState !== prevIsEnabled &&
                            newEnabledState &&
                            hasSuggestionsLoaded.current) {
                            // Check suggestions length inside this callback
                            setSuggestions(prevSuggestions => {
                                if (prevSuggestions.length > 0) {
                                    // Schedule loadSuggestions after state updates
                                    setTimeout(loadSuggestions, 0);
                                }
                                return prevSuggestions;
                            });
                        }
                        return newEnabledState;
                    });
                }
            } catch (error) {
                console.error('Error loading AI settings:', error);
                if (isMounted) {
                    // Default to enabled if settings can't be loaded
                    setIsEnabled(true);
                }
            }
        };

        loadSettings();

        return () => {
            isMounted = false;
        };
    }, [settingsVersion, loadSuggestions]);

    // Load suggestions when component data changes - only on initial render
    useEffect(() => {
        if (!hasSuggestionsLoaded.current) {
            loadSuggestions();
            hasSuggestionsLoaded.current = true;
        }
    }, [loadSuggestions]);

    const handleLinkItem = async (item: typeof suggestions[0]) => {
        setSuggestions(prev => prev.map(s =>
            s.id === item.id ? { ...s, isLinking: true } : s
        ));

        try {
            // Add debugging information
            console.log(`Attempting to link ${item.type} with ID: ${item.id} and title: ${item.title}`);

            // Verify that the item still exists and is valid before linking
            let isValid = false;
            let debugMsg = "";
            let actualId = item.id; // Will store the correct ID if found by title match

            if (item.type === 'note') {
                // First try to find by ID
                let note = allNotes.find(n => n.id === item.id);

                // If not found by ID, try to find by title (for AI-generated suggestions)
                if (!note) {
                    note = allNotes.find(n => n.title === item.title);
                    if (note) {
                        console.log(`Found note by title match instead of ID. Actual ID: ${note.id}`);
                        actualId = note.id;
                    }
                }

                console.log("Found note:", note);
                if (!note) {
                    debugMsg = `Note not found. Searched by ID ${item.id} and title "${item.title}"`;
                } else if (note.isDeleted) {
                    debugMsg = `Note is marked as deleted`;
                } else if (note.isArchived) {
                    debugMsg = `Note is marked as archived`;
                } else {
                    isValid = true;
                }
            } else if (item.type === 'idea') {
                // First try to find by ID
                let idea = allIdeas.find(i => i.id === item.id);

                // If not found by ID, try to find by title (for AI-generated suggestions)
                if (!idea) {
                    idea = allIdeas.find(i => i.title === item.title);
                    if (idea) {
                        console.log(`Found idea by title match instead of ID. Actual ID: ${idea.id}`);
                        actualId = idea.id;
                    }
                }

                console.log("Found idea:", idea, "All ideas count:", allIdeas.length);

                if (allIdeas.length > 0) {
                    console.log("All idea IDs:", allIdeas.map(i => i.id));
                    console.log("All idea titles:", allIdeas.map(i => i.title));
                }

                if (!idea) {
                    debugMsg = `Idea not found. Searched by ID ${item.id} and title "${item.title}"`;
                } else if (idea.isDeleted) {
                    debugMsg = `Idea is marked as deleted`;
                } else if (idea.isArchived) {
                    debugMsg = `Idea is marked as archived`;
                } else {
                    isValid = true;
                }
            } else if (item.type === 'task') {
                // First try to find by ID
                let task = allTasks.find(t => t.id === item.id);

                // If not found by ID, try to find by title (for AI-generated suggestions)
                if (!task) {
                    task = allTasks.find(t => t.title === item.title);
                    if (task) {
                        console.log(`Found task by title match instead of ID. Actual ID: ${task.id}`);
                        actualId = task.id;
                    }
                }

                console.log("Found task:", task);
                if (!task) {
                    debugMsg = `Task not found. Searched by ID ${item.id} and title "${item.title}"`;
                } else if (task.isDeleted) {
                    debugMsg = `Task is marked as deleted`;
                } else {
                    isValid = true;
                }
            }

            // Log validation result
            console.log(`Validation result for ${item.type} ${item.id}: ${isValid ? "Valid" : "Invalid"}`);
            if (!isValid) {
                console.log(`Validation failed: ${debugMsg}`);

                throw new Error(`The ${item.type} couldn't be found. Details: ${debugMsg}`);
            }

            if (item.type === 'note') {
                await onLinkNote(actualId);
            } else if (item.type === 'idea') {
                await onLinkIdea(actualId);
            } else if (item.type === 'task') {
                await onLinkTask(actualId);
            }

            setSuggestions(prev => prev.filter(s => s.id !== item.id));
        } catch (error) {
            console.error('Failed to link item:', error);
            setSuggestions(prev => prev.map(s =>
                s.id === item.id ? { ...s, isLinking: false } : s
            ));
        }
    };

    if (suggestions.length === 0 && !isLoading) {
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

    const getItemHoverBackground = () => {
        if (theme === 'dark') return 'hover:bg-[#1f2937]';
        if (theme === 'midnight') return 'hover:bg-[#273344]';
        return 'hover:bg-[var(--color-surfaceHover)]';
    };

    const formatScore = (score: number) => {
        return `${Math.round(score * 100)}%`;
    };

    return (
        <div className="mt-4 px-3" data-testid="suggested-links-section">
            <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-3.5 h-3.5 text-[var(--color-textSecondary)]" />
                <h6 className="text-xs font-medium text-[var(--color-textSecondary)]">
                    Suggested Links
                </h6>
                {isLoading && (
                    <Loader className="w-3 h-3 text-[var(--color-textSecondary)] animate-spin ml-1" />
                )}
            </div>

            {error ? (
                <div className="text-xs text-[var(--color-textSecondary)] px-2">
                    {error}
                </div>
            ) : (
                <div className="space-y-2">
                    {suggestions.map((item, index) => (
                        <motion.div
                            key={item.displayKey || `${item.type}-${item.id}-${index}`}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 0.65, y: 0 }}
                            whileHover={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => !item.isLinking && handleLinkItem(item)}
                            className={`
                                group flex items-start gap-2.5 p-2 rounded-lg cursor-pointer
                                ${getItemBackground()} ${getItemHoverBackground()} ${getBorderStyle()}
                                transition-all duration-200 opacity-65 hover:opacity-100 relative
                                ${item.isLinking ? 'pointer-events-none' : 'cursor-pointer'}
                            `}
                        >
                            <div className={`
                                shrink-0 p-1.5 rounded-lg
                                ${item.type === 'idea' ? 'bg-[var(--color-idea)]/15' :
                                    item.type === 'note' ? 'bg-[var(--color-note)]/15' :
                                        'bg-[var(--color-task)]/15'}
                            `}>
                                {item.type === 'idea' ? (
                                    <Lightbulb className="w-3.5 h-3.5 text-[var(--color-idea)]" />
                                ) : item.type === 'note' ? (
                                    <Type className="w-3.5 h-3.5 text-[var(--color-note)]" />
                                ) : (
                                    <CheckSquare className="w-3.5 h-3.5 text-[var(--color-task)]" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h6 className="text-sm font-medium text-[var(--color-text)] truncate flex items-center gap-1">
                                    {item.title}
                                    {item.isLinking && (
                                        <Loader className="w-3 h-3 ml-1 inline animate-spin text-[var(--color-accent)]" />
                                    )}
                                </h6>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-[var(--color-textSecondary)]">
                                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                    </p>
                                    {item.status && (
                                        <p className="text-xs text-[var(--color-textSecondary)]">
                                            {item.status}
                                        </p>
                                    )}
                                    {item.dueDate && (
                                        <p className="text-xs text-[var(--color-textSecondary)]">
                                            {new Date(item.dueDate).toLocaleDateString()}
                                        </p>
                                    )}
                                    <p className="text-xs text-[var(--color-accent)]">
                                        Match: {formatScore(item.similarity)}
                                    </p>
                                </div>
                            </div>

                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <PlusCircle className="w-4 h-4 text-[var(--color-accent)]" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
} 