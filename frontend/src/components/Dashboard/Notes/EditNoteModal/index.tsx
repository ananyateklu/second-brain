import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Note, LinkedReminder as OriginalLinkedReminder } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { useIdeas } from '../../../../contexts/ideasContextUtils';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import type { Task } from '../../../../types/task';
import type { Idea } from '../../../../types/idea';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedNotesPanel } from './LinkedNotesPanel';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { NoteAddLinkModal } from './NoteAddLinkModal';
import { AddTaskLinkModal as NoteAddTaskLinkModal } from './NoteAddTaskLinkModal';
import { AddReminderLinkModal as NoteAddReminderLinkModal } from './NoteAddReminderLinkModal';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { SuggestedLinksSection } from './SuggestedLinksSection';
import { similarContentService } from '../../../../services/ai/similarContentService';

interface EditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    note: Note | null;
}

// Define NoteReminderLink with description as string, and other fields from OriginalLinkedReminder
interface NoteReminderLink {
    id: string;
    title: string;
    description: string; // Explicitly string
    dueDateTime: string;
    isCompleted: boolean;
    isSnoozed: boolean;
    createdAt: string;
    updatedAt: string;
    // severity?: number; // Assuming severity is not part of it or optional
}

// Define a unified interface for suggestions from any content type (Copied from EditIdeaModal)
interface UnifiedSuggestion {
    id: string;
    title: string;
    similarity: number;
    type: 'note' | 'idea' | 'task' | 'reminder';
    status?: string;
    dueDate?: string | null;
}

// Create a context type for our centralized suggestions (Copied from EditIdeaModal)
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

export function EditNoteModal({ isOpen, onClose, note: initialNote }: EditNoteModalProps) {
    const navigate = useNavigate();
    const { notes, updateNote, deleteNote, addLink, removeLink } = useNotes();
    const { tasks } = useTasks();
    const { state: { ideas } } = useIdeas();
    const { reminders: allReminders } = useReminders();
    const { theme } = useTheme();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);
    const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
    const [linkedIdeas, setLinkedIdeas] = useState<Idea[]>([]);
    const [linkedReminders, setLinkedReminders] = useState<NoteReminderLink[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAddLinkModal, setShowAddLinkModal] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [showAddReminderModal, setShowAddReminderModal] = useState(false);
    const [refreshSuggestions, setRefreshSuggestions] = useState(0);

    // Add new state for centralized suggestion management (Copied from EditIdeaModal)
    const [suggestionState, setSuggestionState] = useState<SuggestionState>({
        isLoading: false,
        error: null,
        suggestions: {
            notes: [],
            ideas: [],
            tasks: [],
            reminders: []
        }
    });

    // Reset states when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setShowDeleteConfirm(false);
            setError('');
        }
    }, [isOpen]);

    // Get current note from context to ensure we have latest data
    const currentNote = notes.find(n => n.id === initialNote?.id);

    useEffect(() => {
        if (currentNote) {
            setTitle(currentNote.title);
            setContent(currentNote.content);
            setTags(currentNote.tags);
            setError('');
        }
    }, [currentNote]);

    // Update linked notes, ideas, tasks and reminders whenever they change
    useEffect(() => {
        if (currentNote) {
            // Update linked notes
            const linkedNotesList = notes.filter(n =>
                currentNote.linkedItems?.some(item => item.id === n.id && item.type === 'Note')
            );
            setLinkedNotes(linkedNotesList);

            // Update linked ideas
            const linkedIdeasList = ideas.filter(idea =>
                currentNote.linkedItems?.some(item => item.id === idea.id && item.type === 'Idea')
            );
            setLinkedIdeas(linkedIdeasList);

            // Update linked tasks
            const linkedTasksList = tasks.filter(t =>
                currentNote.linkedItems?.some(item => item.id === t.id && item.type === 'Task')
            );
            setLinkedTasks(linkedTasksList);

            // Update linked reminders
            const reminderLinks = currentNote.linkedItems
                ?.filter(item => item.type === 'Reminder')
                .map(item => {
                    const fullReminder = allReminders.find(r => r.id === item.id);
                    if (!fullReminder) return null;
                    return {
                        id: fullReminder.id,
                        title: fullReminder.title,
                        description: fullReminder.description || '',
                        dueDateTime: fullReminder.dueDateTime,
                        isCompleted: fullReminder.isCompleted,
                        isSnoozed: fullReminder.isSnoozed || false,
                        createdAt: fullReminder.createdAt || new Date().toISOString(),
                        updatedAt: fullReminder.updatedAt || new Date().toISOString(),
                    } as NoteReminderLink;
                })
                .filter(Boolean) as NoteReminderLink[];
            setLinkedReminders(reminderLinks || []);
        }
    }, [currentNote, currentNote?.linkedItems, notes, tasks, ideas, allReminders]);

    // Create a centralized function to load all suggestions at once (Adapted from EditIdeaModal)
    const loadAllSuggestions = useCallback(async () => {
        if (!currentNote) return;

        const hasNotes = notes.length > 1; // More than 1 because we exclude the current note
        const hasIdeas = ideas.length > 0;
        const hasTasks = tasks.length > 0;
        const hasReminders = allReminders.length > 0;

        if (!hasNotes && !hasIdeas && !hasTasks && !hasReminders) {
            setSuggestionState(prev => ({ ...prev, isLoading: false, suggestions: { notes: [], ideas: [], tasks: [], reminders: [] } }));
            return;
        }

        try {
            setSuggestionState(prev => ({ ...prev, isLoading: true, error: null }));

            const linkedIds = currentNote.linkedItems?.map(item => item.id) || [];

            const results = await similarContentService.findSimilarContent(
                {
                    id: currentNote.id,
                    title: currentNote.title,
                    content: currentNote.content || '',
                    tags: currentNote.tags || []
                },
                notes.filter(n => n.id !== currentNote.id), // Filter out current note
                ideas,
                tasks,
                allReminders,
                linkedIds,
                12
            );

            const rawNoteResults = results.filter(item => item.type === 'note');
            const rawIdeaResults = results.filter(item => item.type === 'idea');
            const rawTaskResults = results.filter(item => item.type === 'task');
            const reminderResults = results.filter(item => item.type === 'reminder');

            const noteResults = rawNoteResults.filter(suggestedNote =>
                notes.some(localNote => localNote.id === suggestedNote.id)
            );
            const ideaResults = rawIdeaResults.filter(suggestedIdea =>
                ideas.some(localIdea => localIdea.id === suggestedIdea.id)
            );
            const taskResults = rawTaskResults.filter(suggestedTask =>
                tasks.some(localTask => localTask.id === suggestedTask.id)
            );
            // Reminders don't need this secondary check as they come from a flat list from context

            setSuggestionState({
                isLoading: false,
                error: null,
                suggestions: {
                    notes: noteResults,
                    ideas: ideaResults,
                    tasks: taskResults,
                    reminders: reminderResults
                }
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error("Error loading suggestions for note:", error);
            setSuggestionState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMessage
            }));
        }
    }, [currentNote, notes, ideas, tasks, allReminders]);

    // Load suggestions on modal open and when linked items change (Adapted from EditIdeaModal)
    useEffect(() => {
        if (isOpen && currentNote) {
            loadAllSuggestions();
        }
    }, [isOpen, currentNote, refreshSuggestions, loadAllSuggestions]);

    // Add this function to refresh suggestions (Copied from EditIdeaModal)
    const triggerRefreshSuggestions = () => {
        setRefreshSuggestions(prev => prev + 1);
    };

    if (!isOpen || !currentNote) return null;

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await deleteNote(currentNote.id);
            setShowDeleteConfirm(false);  // Reset delete confirm state
            navigate('/dashboard/notes');
            onClose();
        } catch (err) {
            console.error('Failed to delete note:', err);
            setError('Failed to delete note');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnlinkTask = async (taskId: string) => {
        if (!currentNote) return;
        try {
            await removeLink(currentNote.id, taskId, 'Task');
            triggerRefreshSuggestions();
        } catch (err) {
            console.error('Failed to unlink task:', err);
            setError('Failed to unlink task. Please try again.');
        }
    };

    const handleUnlinkReminder = async (reminderId: string) => {
        if (!currentNote) return;
        try {
            setIsLoading(true);
            await removeLink(currentNote.id, reminderId, 'Reminder');
            triggerRefreshSuggestions();
        } catch (err) {
            console.error('Failed to unlink reminder:', err);
            setError('Failed to unlink reminder. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLinkReminder = async (reminderId: string): Promise<boolean> => {
        if (!currentNote) return false;
        try {
            setIsLoading(true);
            setError('');
            await addLink(currentNote.id, reminderId, 'Reminder');
            triggerRefreshSuggestions();
            return true;
        } catch (error) {
            console.error('Failed to link reminder:', error);
            setError('Failed to link reminder. Please try again.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await updateNote(currentNote.id, {
                title: title.trim(),
                content: content.trim(),
                tags
            });
            onClose();
        } catch (err) {
            console.error('Failed to update note:', err);
            setError('Failed to update note. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTagInputChange = (value: string | string[]) => {
        if (Array.isArray(value)) {
            setTags(value);
        } else {
            setTagInput(value);
        }
    };

    const formattedTasks = linkedTasks.map(task => ({
        ...task,
        dueDate: task.dueDate === undefined ? null : task.dueDate
    }));

    const getBorderStyle = () => {
        if (theme === 'midnight') return 'border-white/5';
        if (theme === 'dark') return 'border-gray-700/30';
        return 'border-[var(--color-border)]';
    };

    const handleUnlinkItem = async (itemId: string, itemType: 'Note' | 'Idea') => {
        if (!currentNote) return;
        try {
            await removeLink(currentNote.id, itemId, itemType);
            triggerRefreshSuggestions();
        } catch (error) {
            console.error('Failed to unlink item:', { type: itemType.toLowerCase(), error });
            setError(`Failed to unlink ${itemType.toLowerCase()}. Please try again.`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-5xl max-h-[85vh] bg-[var(--color-surface)] backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-[var(--color-border)]">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <Header
                        note={currentNote}
                        onClose={onClose}
                        onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
                    />

                    <div className="flex-1 grid grid-cols-[1fr,360px] min-h-0 overflow-hidden">
                        <MainContent
                            title={title}
                            content={content}
                            tags={tags}
                            tagInput={tagInput}
                            error={error}
                            isLoading={isLoading}
                            linkedReminders={linkedReminders as OriginalLinkedReminder[]}
                            onTitleChange={setTitle}
                            onContentChange={setContent}
                            onTagInputChange={handleTagInputChange}
                            onAddTag={() => {
                                const trimmedTag = tagInput.trim();
                                if (trimmedTag && !tags.includes(trimmedTag)) {
                                    setTags([...tags, trimmedTag]);
                                    setTagInput('');
                                }
                            }}
                            onRemoveTag={(tag) => setTags(tags.filter(t => t !== tag))}
                            onShowAddReminder={() => setShowAddReminderModal(true)}
                            onUnlinkReminder={handleUnlinkReminder}
                            onLinkReminder={handleLinkReminder}
                            setError={setError}
                            suggestedReminders={suggestionState.suggestions.reminders}
                            suggestionsLoading={suggestionState.isLoading}
                        />

                        <div className={`flex flex-col overflow-y-auto border-l ${getBorderStyle()} bg-[var(--color-surface)]`}>
                            <div className="p-4 space-y-4">
                                <SuggestedLinksSection
                                    suggestedNotes={suggestionState.suggestions.notes}
                                    suggestedIdeas={suggestionState.suggestions.ideas}
                                    suggestedTasks={suggestionState.suggestions.tasks}
                                    isLoading={suggestionState.isLoading}
                                    error={suggestionState.error}
                                    onLinkNote={async (noteId: string) => {
                                        try {
                                            await addLink(currentNote.id, noteId, 'Note');
                                            triggerRefreshSuggestions();
                                        } catch (error) {
                                            console.error('Failed to link note:', error);
                                            setError('Failed to link note. Please try again.');
                                        }
                                    }}
                                    onLinkIdea={async (ideaId: string) => {
                                        try {
                                            await addLink(currentNote.id, ideaId, 'Idea');
                                            triggerRefreshSuggestions();
                                        } catch (error) {
                                            console.error('Failed to link idea:', error);
                                            setError('Failed to link idea. Please try again.');
                                        }
                                    }}
                                    onLinkTask={async (taskId: string) => {
                                        try {
                                            await addLink(currentNote.id, taskId, 'Task');
                                            triggerRefreshSuggestions();
                                        } catch (error) {
                                            console.error('Failed to link task:', error);
                                            setError('Failed to link task. Please try again.');
                                        }
                                    }}
                                />
                            </div>
                            <LinkedNotesPanel
                                linkedNotes={linkedNotes}
                                linkedTasks={formattedTasks}
                                linkedIdeas={linkedIdeas}
                                linkedReminders={linkedReminders}
                                onShowAddLink={() => setShowAddLinkModal(true)}
                                onShowAddTask={() => setShowAddTaskModal(true)}
                                onUnlinkTask={handleUnlinkTask}
                                onUnlinkIdea={(ideaId: string) => handleUnlinkItem(ideaId, 'Idea')}
                                onUnlinkNote={(noteId: string) => handleUnlinkItem(noteId, 'Note')}
                                currentNoteId={currentNote.id}
                                currentNote={currentNote}
                            />
                        </div>
                    </div>

                    <div className={`shrink-0 flex justify-end gap-3 px-6 py-4 border-t ${getBorderStyle()} bg-[var(--color-surface)]`}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-note)] hover:bg-[var(--color-note)]/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>

                <DeleteConfirmDialog
                    isOpen={showDeleteConfirm}
                    isLoading={isLoading}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDelete}
                />

                <NoteAddLinkModal
                    isOpen={showAddLinkModal}
                    onClose={() => setShowAddLinkModal(false)}
                    noteId={currentNote.id}
                    onLinkAdded={() => {
                        setShowAddLinkModal(false);
                        triggerRefreshSuggestions();
                    }}
                />

                <NoteAddTaskLinkModal
                    isOpen={showAddTaskModal}
                    onClose={() => setShowAddTaskModal(false)}
                    noteId={currentNote.id}
                    onLinkAdded={() => {
                        setShowAddTaskModal(false);
                        triggerRefreshSuggestions();
                    }}
                />

                <NoteAddReminderLinkModal
                    isOpen={showAddReminderModal}
                    onClose={() => setShowAddReminderModal(false)}
                    onSelect={async (reminderId: string) => {
                        const success = await handleLinkReminder(reminderId);
                        if (success) {
                            setShowAddReminderModal(false);
                        }
                    }}
                    currentLinkedReminderIds={linkedReminders.map((r: NoteReminderLink) => r.id)}
                    currentNote={currentNote}
                    passedSuggestedReminders={suggestionState.suggestions.reminders}
                    isLoadingSuggestions={suggestionState.isLoading}
                />
            </div>
        </div>
    );
}