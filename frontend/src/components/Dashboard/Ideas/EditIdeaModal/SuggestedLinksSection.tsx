import { useState, useEffect } from 'react';
import { Link2, PlusCircle, Type, Lightbulb, CheckSquare, Loader } from 'lucide-react';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { useIdeas } from '../../../../contexts/ideasContextUtils';
import { Idea } from '../../../../types/idea';
import { similarContentService } from '../../../../services/ai/similarContentService';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';
import aiSettingsService from '../../../../services/api/aiSettings.service';

interface SuggestedLinksSectionProps {
    currentIdea: Idea;
    linkedNoteIds: string[];
    linkedIdeaIds: string[];
    linkedTaskIds: string[];
    refreshTrigger?: number;
    onLinkNote: (noteId: string) => Promise<void>;
    onLinkIdea: (ideaId: string) => Promise<void>;
    onLinkTask: (taskId: string) => Promise<void>;
}

export function SuggestedLinksSection({
    currentIdea, // Changed
    linkedNoteIds,
    linkedIdeaIds, // Added
    linkedTaskIds,
    refreshTrigger = 0, // Add default value
    onLinkNote,
    onLinkIdea, // Added
    onLinkTask
}: SuggestedLinksSectionProps) {
    const { notes: allNotes } = useNotes(); // Renamed for clarity
    const { tasks: allTasks } = useTasks(); // Renamed for clarity
    const { state: { ideas: allIdeas } } = useIdeas(); // Get all ideas
    const { theme } = useTheme();

    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Array<{
        id: string;
        title: string;
        type: 'note' | 'idea' | 'task';
        status?: string;
        dueDate?: string | null;
        similarity: number;
        isLinking?: boolean;
        validItem?: boolean;
        displayKey?: string;
    }>>([]);
    const [error, setError] = useState('');
    const [areSuggestionsEnabled, setAreSuggestionsEnabled] = useState<boolean>(true);

    // Check if content suggestions are enabled in AI settings
    useEffect(() => {
        const checkAISettings = async () => {
            try {
                const settings = await aiSettingsService.getAISettings();
                if (settings && settings.contentSuggestions) {
                    // If enabled flag exists and is explicitly false, disable suggestions
                    if (settings.contentSuggestions.enabled === false) {
                        console.log("Content suggestions are disabled in user preferences");
                        setAreSuggestionsEnabled(false);
                    } else {
                        setAreSuggestionsEnabled(true);
                    }
                } else {
                    // No settings found, assume enabled for backward compatibility
                    console.log("No AI settings found, assuming content suggestions are enabled");
                    setAreSuggestionsEnabled(true);
                }
            } catch (error) {
                console.warn("Error checking AI settings:", error);
                // Default to enabled if there's an error
                setAreSuggestionsEnabled(true);
            }
        };

        checkAISettings();
    }, []);

    useEffect(() => {
        const loadSuggestions = async () => {
            // Skip loading if suggestions are disabled in settings
            if (!areSuggestionsEnabled || !currentIdea || !allNotes.length || !allIdeas.length) {
                if (!areSuggestionsEnabled) {
                    console.log("Skipping suggestions loading because they are disabled");
                }
                return;
            }

            setIsLoading(true);
            setError('');

            try {
                console.log("Loading suggestions with data:", {
                    currentIdeaId: currentIdea.id,
                    notesCount: allNotes.length,
                    ideasCount: allIdeas.length,
                    tasksCount: allTasks.length,
                    linkedNoteIds,
                    linkedIdeaIds,
                    linkedTaskIds
                });

                const excludeIds = [
                    ...linkedNoteIds,
                    ...linkedIdeaIds,
                    ...linkedTaskIds,
                    currentIdea.id
                ];

                console.log("Excluded IDs:", excludeIds);

                // Filter out deleted and archived items before finding similar content
                const validNotes = allNotes.filter(note => !note.isDeleted && !note.isArchived);
                const validIdeas = allIdeas.filter(idea => !idea.isDeleted && !idea.isArchived);
                const validTasks = allTasks.filter(task => !task.isDeleted);

                console.log("Valid items after filtering:", {
                    notesCount: validNotes.length,
                    ideasCount: validIdeas.length,
                    tasksCount: validTasks.length
                });

                const currentItemDetails = {
                    id: currentIdea.id,
                    title: currentIdea.title,
                    content: currentIdea.content,
                    tags: currentIdea.tags
                };

                const allSuggestions = await similarContentService.findSimilarContent(
                    currentItemDetails,
                    validNotes,
                    validIdeas,
                    validTasks,
                    [],
                    excludeIds,
                    5
                );

                console.log("Received suggestions:", allSuggestions);

                // Pre-validate suggestions
                const validatedSuggestions = allSuggestions
                    .filter(s => s.type !== 'reminder')
                    .filter(s => s.similarity > 0.3)
                    .map((suggestion, index) => {
                        // For each suggestion, check if it exists in our real data
                        const { id, title, type } = suggestion;
                        let realId = id;
                        let validItem = false;

                        // Try to find real IDs for suggested items when numeric IDs are detected
                        if (/^\d+$/.test(id)) {
                            console.log(`Suggestion has numeric ID: ${id}, trying to find by title`);

                            // For ideas, match by title
                            if (type === 'idea') {
                                const matchingIdea = validIdeas.find(i => i.title === title);
                                if (matchingIdea) {
                                    console.log(`Matched idea by title: ${title} -> ID ${matchingIdea.id}`);
                                    realId = matchingIdea.id;
                                    validItem = true;
                                }
                            }
                            // For notes, match by title
                            else if (type === 'note') {
                                const matchingNote = validNotes.find(n => n.title === title);
                                if (matchingNote) {
                                    console.log(`Matched note by title: ${title} -> ID ${matchingNote.id}`);
                                    realId = matchingNote.id;
                                    validItem = true;
                                }
                            }
                            // For tasks, match by title
                            else if (type === 'task') {
                                const matchingTask = validTasks.find(t => t.title === title);
                                if (matchingTask) {
                                    console.log(`Matched task by title: ${title} -> ID ${matchingTask.id}`);
                                    realId = matchingTask.id;
                                    validItem = true;
                                }
                            }
                        } else {
                            // Check if the ID matches a real item directly
                            if (type === 'idea' && validIdeas.some(i => i.id === id)) {
                                validItem = true;
                            } else if (type === 'note' && validNotes.some(n => n.id === id)) {
                                validItem = true;
                            } else if (type === 'task' && validTasks.some(t => t.id === id)) {
                                validItem = true;
                            }
                        }

                        return {
                            ...suggestion,
                            id: realId,
                            // Add a unique displayKey for React rendering
                            displayKey: `${realId}-${index}`,
                            validItem
                        };
                    })
                    .filter(s => s.validItem)  // Only keep suggestions we verified exist
                    // Filter to keep only unique items by ID (keeping only the first occurrence)
                    .filter((item, index, self) =>
                        index === self.findIndex(t => t.id === item.id)
                    )
                    .sort((a, b) => b.similarity - a.similarity);

                console.log("Validated suggestions:", validatedSuggestions);

                setSuggestions(validatedSuggestions as Array<typeof suggestions[0]>);
            } catch (err) {
                console.error('Failed to get suggestions:', err);
                setError('Could not load suggestions. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        loadSuggestions();
    }, [currentIdea, allNotes, allIdeas, allTasks, linkedNoteIds, linkedIdeaIds, linkedTaskIds, refreshTrigger, areSuggestionsEnabled]);

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
                    {suggestions.map(item => (
                        <motion.div
                            key={item.displayKey}
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