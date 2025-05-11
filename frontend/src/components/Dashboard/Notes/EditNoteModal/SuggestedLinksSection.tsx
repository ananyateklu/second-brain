import { useState, useEffect } from 'react';
import { Link2, PlusCircle, Type, Lightbulb, CheckSquare, Loader } from 'lucide-react';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { useIdeas } from '../../../../contexts/ideasContextUtils';
import { Note } from '../../../../types/note';
import { similarContentService } from '../../../../services/ai/similarContentService';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { motion } from 'framer-motion';

interface SuggestedLinksSectionProps {
    currentNote: Note;
    linkedNoteIds: string[];
    linkedTaskIds: string[];
    linkedIdeaIds?: string[];
    onLinkNote: (noteId: string) => Promise<void>;
    onLinkTask: (taskId: string) => Promise<void>;
    onLinkIdea?: (ideaId: string) => Promise<void>;
}

export function SuggestedLinksSection({
    currentNote,
    linkedNoteIds,
    linkedTaskIds,
    linkedIdeaIds = [],
    onLinkNote,
    onLinkTask,
    onLinkIdea = async () => { }
}: SuggestedLinksSectionProps) {
    const { notes } = useNotes();
    const { tasks } = useTasks();
    const { state: { ideas = [] } } = useIdeas();
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
        error?: string;
    }>>([]);
    const [error, setError] = useState('');

    // Load suggestions when the component mounts or when dependencies change
    useEffect(() => {
        const loadSuggestions = async () => {
            if (!currentNote || (!notes.length && !ideas.length && !tasks.length)) return;

            setIsLoading(true);
            setError('');

            try {
                // Get recommendations from AI
                const excludeIds = [...linkedNoteIds, ...linkedTaskIds, ...linkedIdeaIds, currentNote.id];
                const allSuggestions = await similarContentService.findSimilarContent(
                    {
                        id: currentNote.id,
                        title: currentNote.title,
                        content: currentNote.content,
                        tags: currentNote.tags
                    },
                    notes,
                    ideas, // Include ideas for suggestions
                    tasks,
                    [], // Empty reminders array
                    excludeIds,
                    5 // Max number of suggestions
                );

                // Filter out any reminder suggestions that might come back
                const nonReminderSuggestions = allSuggestions
                    .filter(s => s.type !== 'reminder')
                    .filter(s => s.similarity > 0.3) // Only show items with meaningful similarity
                    .sort((a, b) => b.similarity - a.similarity);

                // Safe to cast since we've filtered out reminders
                setSuggestions(nonReminderSuggestions as Array<typeof suggestions[0]>);
            } catch (err) {
                console.error('Failed to get suggestions:', err);
                setError('Could not load suggestions. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        loadSuggestions();
    }, [currentNote, notes, ideas, tasks, linkedNoteIds, linkedTaskIds, linkedIdeaIds]);

    const handleLinkItem = async (item: typeof suggestions[0]) => {
        // Update local state to show linking in progress
        setSuggestions(prev => prev.map(s =>
            s.id === item.id ? { ...s, isLinking: true, error: undefined } : s
        ));

        try {
            // Different actions based on item type
            if (item.type === 'note') {
                await onLinkNote(item.id);
            } else if (item.type === 'idea') {
                if (onLinkIdea) {
                    await onLinkIdea(item.id);
                } else {
                    throw new Error('Linking to ideas is not supported');
                }
            } else if (item.type === 'task') {
                await onLinkTask(item.id);
            }

            // Remove the suggestion after successful linking
            setSuggestions(prev => prev.filter(s => s.id !== item.id));

        } catch (error) {
            console.error('Failed to link item:', error);

            // Show the error on the specific suggestion
            const errorMessage = error instanceof Error ? error.message : 'Failed to link item';
            setSuggestions(prev => prev.map(s =>
                s.id === item.id ? { ...s, isLinking: false, error: errorMessage } : s
            ));

            // Wait a moment before clearing the error
            setTimeout(() => {
                setSuggestions(prev => prev.map(s =>
                    s.id === item.id ? { ...s, error: undefined } : s
                ));
            }, 3000);
        }
    };

    // Check if we have any suggestions to show
    if (suggestions.length === 0 && !isLoading) {
        return null;
    }

    // Styling
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
        // Format as percentage
        return `${Math.round(score * 100)}%`;
    };

    return (
        <div data-testid="suggested-links-section">
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
                            key={item.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 0.65, y: 0 }}
                            whileHover={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => !item.isLinking && handleLinkItem(item)}
                            className={`
                group flex items-start gap-2.5 p-2 rounded-lg cursor-pointer
                ${getItemBackground()} ${getItemHoverBackground()} border ${getBorderStyle()}
                transition-all duration-200 opacity-65 hover:opacity-100 relative
                ${item.isLinking ? 'pointer-events-none' : 'cursor-pointer'}
                ${item.error ? 'border-red-500/50' : ''}
              `}
                        >
                            {/* Icon based on item type */}
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

                            {/* Item title and metadata */}
                            <div className="flex-1 min-w-0">
                                <h6 className="text-sm font-medium text-[var(--color-text)] truncate flex items-center gap-1">
                                    {item.title}
                                    {item.isLinking && (
                                        <Loader className="w-3 h-3 ml-1 inline animate-spin text-[var(--color-accent)]" />
                                    )}
                                </h6>

                                {item.error ? (
                                    <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
                                ) : (
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
                                )}
                            </div>

                            {/* Add icon */}
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