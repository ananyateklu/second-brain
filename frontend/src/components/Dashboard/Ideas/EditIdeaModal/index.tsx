import { useState, useEffect, useCallback } from 'react';
import { useIdeas } from '../../../../contexts/ideasContextUtils';
import { Idea } from '../../../../types/idea';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { useReminders } from '../../../../contexts/remindersContextUtils';
import type { Task } from '../../../../types/task';
import type { Note } from '../../../../types/note';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedNotesPanel } from './LinkedNotesPanel';
import { IdeaAddLinkModal } from './IdeaAddLinkModal';
import { IdeaAddTaskLinkModal } from './IdeaAddTaskLinkModal';
import { IdeaAddReminderLinkModal } from './IdeaAddReminderLinkModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { SuggestedLinksSection } from './SuggestedLinksSection';
import { similarContentService } from '../../../../services/ai/similarContentService';

// Define a unified interface for suggestions from any content type
interface UnifiedSuggestion {
  id: string;
  title: string;
  similarity: number;
  type: 'note' | 'idea' | 'task' | 'reminder';
  status?: string;
  dueDate?: string | null;
}

// Create a context type for our centralized suggestions
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

interface EditIdeaModalProps {
  idea: Idea;
  isOpen: boolean;
  onClose: () => void;
}

interface IdeaReminderLink {
  id: string;
  title: string;
  dueDateTime: string;
  isCompleted: boolean;
  isSnoozed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function EditIdeaModal({ isOpen, onClose, idea: initialIdea }: EditIdeaModalProps) {
  const navigate = useNavigate();
  const { notes } = useNotes();
  const { tasks } = useTasks();
  const { updateIdea, deleteIdea, addLink, removeLink, state: ideasState } = useIdeas();
  const { reminders: allReminders } = useReminders();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [linkedIdeas, setLinkedIdeas] = useState<Idea[]>([]);
  const [linkedReminders, setLinkedReminders] = useState<IdeaReminderLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [refreshSuggestions, setRefreshSuggestions] = useState(0);

  // Add new state for centralized suggestion management
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

  // Get current idea from context to ensure we have latest data
  const currentIdea = ideasState.ideas.find(i => i.id === initialIdea?.id);

  useEffect(() => {
    if (currentIdea) {
      setTitle(currentIdea.title);
      setContent(currentIdea.content);
      setTags(currentIdea.tags);
      setError('');
    }
  }, [currentIdea]);

  // Update linked items whenever they change
  useEffect(() => {
    if (currentIdea) {
      // Filter linked notes
      const linkedNotesList = notes.filter(n =>
        currentIdea.linkedItems?.some(item => item.id === n.id && item.type === 'Note')
      );
      setLinkedNotes(linkedNotesList);

      // Filter linked ideas
      const linkedIdeasList = ideasState.ideas.filter(i =>
        currentIdea.linkedItems?.some(item => item.id === i.id && item.type === 'Idea')
      );
      setLinkedIdeas(linkedIdeasList);

      // Filter linked tasks
      const linkedTasksList = tasks.filter(t =>
        currentIdea.linkedItems?.some(item => item.id === t.id && item.type === 'Task')
      );
      setLinkedTasks(linkedTasksList);

      // Filter linked reminders and format them
      const linkedRemindersList = currentIdea.linkedItems
        ?.filter(item => item.type === 'Reminder')
        .map(item => {
          const fullReminder = allReminders.find(r => r.id === item.id);
          if (!fullReminder) return null;
          return {
            id: fullReminder.id,
            title: fullReminder.title,
            dueDateTime: fullReminder.dueDateTime,
            isCompleted: fullReminder.isCompleted,
            isSnoozed: fullReminder.isSnoozed,
            createdAt: fullReminder.createdAt,
            updatedAt: fullReminder.updatedAt,
          };
        })
        .filter(Boolean) as IdeaReminderLink[] || [];
      setLinkedReminders(linkedRemindersList);
    }
  }, [currentIdea, currentIdea?.linkedItems, notes, tasks, ideasState.ideas, allReminders]);

  // Create a centralized function to load all suggestions at once
  const loadAllSuggestions = useCallback(async () => {
    if (!currentIdea) return;

    // Skip if there's nothing to compare against
    const hasNotes = notes.length > 0;
    const hasIdeas = ideasState.ideas.length > 1; // More than 1 because we exclude the current idea
    const hasTasks = tasks.length > 0;
    const hasReminders = allReminders.length > 0;

    if (!hasNotes && !hasIdeas && !hasTasks && !hasReminders) {
      return;
    }

    try {
      setSuggestionState(prev => ({ ...prev, isLoading: true, error: null }));

      // Get IDs of already linked items
      const linkedIds = currentIdea.linkedItems?.map(item => item.id) || [];

      // Make a single call to the similarContentService with all content types
      const results = await similarContentService.findSimilarContent(
        {
          id: currentIdea.id,
          title: currentIdea.title,
          content: currentIdea.content || '',
          tags: currentIdea.tags || []
        },
        notes,
        ideasState.ideas.filter(idea => idea.id !== currentIdea.id), // Filter out current idea
        tasks,
        allReminders,
        linkedIds, // Exclude already linked items
        12 // Increased to get enough results for all types
      );

      // Separate suggestions by type
      const rawNoteResults = results.filter(item => item.type === 'note');
      const rawIdeaResults = results.filter(item => item.type === 'idea');
      const rawTaskResults = results.filter(item => item.type === 'task');
      const reminderResults = results.filter(item => item.type === 'reminder'); // Reminders are already cross-referenced later

      // Filter out suggestions for items that don't exist in the local state
      const noteResults = rawNoteResults.filter(suggestedNote =>
        notes.some(localNote => localNote.id === suggestedNote.id)
      );
      const ideaResults = rawIdeaResults.filter(suggestedIdea =>
        ideasState.ideas.some(localIdea => localIdea.id === suggestedIdea.id)
      );
      const taskResults = rawTaskResults.filter(suggestedTask =>
        tasks.some(localTask => localTask.id === suggestedTask.id)
      );

      // Update our centralized suggestion state
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
      console.error("Error loading suggestions:", error);
      setSuggestionState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [currentIdea, notes, ideasState.ideas, tasks, allReminders]);

  // Load suggestions on modal open and when linked items change
  useEffect(() => {
    if (isOpen && currentIdea) {
      loadAllSuggestions();
    }
  }, [isOpen, currentIdea, refreshSuggestions, loadAllSuggestions]);


  if (!isOpen || !currentIdea) return null;

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteIdea(currentIdea.id);
      setShowDeleteConfirm(false);
      navigate('/dashboard/ideas');
      onClose();
    } catch (err) {
      console.error('Failed to delete idea:', err);
      setError('Failed to delete idea');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkTask = async (taskId: string) => {
    try {
      await removeLink(currentIdea.id, taskId, 'Task');
      triggerRefreshSuggestions();
    } catch (err) {
      console.error('Failed to unlink task:', err);
      setError('Failed to unlink task. Please try again.');
    }
  };

  const handleUnlinkReminder = async (reminderId: string) => {
    try {
      setIsLoading(true);
      await removeLink(currentIdea.id, reminderId, 'Reminder');
      triggerRefreshSuggestions();
    } catch (err) {
      console.error('Failed to unlink reminder:', err);
      setError('Failed to unlink reminder. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkReminder = async (reminderId: string) => {
    try {
      setIsLoading(true);
      setError('');
      await addLink(currentIdea.id, reminderId, 'Reminder');
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
      await updateIdea(currentIdea.id, {
        title: title.trim(),
        content: content.trim(),
        tags
      });
      onClose();
    } catch (err) {
      console.error('Failed to update idea:', err);
      setError('Failed to update idea. Please try again.');
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

  const handleUnlinkItem = async (itemId: string, itemType: 'Note' | 'Idea') => {
    try {
      await removeLink(currentIdea.id, itemId, itemType);
      triggerRefreshSuggestions();
    } catch (error) {
      console.error('Failed to unlink item:', { type: itemType.toLowerCase(), error });
    }
  };

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border-white/5';
    if (theme === 'dark') return 'border-gray-700/30';
    return 'border-[var(--color-border)]';
  };

  // Add this function to refresh suggestions
  const triggerRefreshSuggestions = () => {
    setRefreshSuggestions(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[85vh] bg-[var(--color-background)] rounded-2xl shadow-xl overflow-hidden border border-[var(--color-border)]">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <Header
            idea={currentIdea}
            onClose={onClose}
            onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
          />

          <div className="flex-1 grid grid-cols-[1fr,360px] min-h-0 overflow-y-auto">
            <MainContent
              title={title}
              content={content}
              tags={tags}
              tagInput={tagInput}
              error={error}
              isLoading={isLoading}
              linkedReminders={linkedReminders}
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
              currentIdea={currentIdea}
              onLinkReminder={handleLinkReminder}
              suggestedReminders={suggestionState.suggestions.reminders}
              suggestionsLoading={suggestionState.isLoading}
            />
            <div className={`flex flex-col overflow-y-auto border-l ${theme === 'midnight' ? 'border-white/5' : theme === 'dark' ? 'border-gray-700/30' : 'border-[var(--color-border)]'} bg-[var(--color-surface)]`}>
              <div className="p-4 space-y-4">
                <SuggestedLinksSection
                  suggestedNotes={suggestionState.suggestions.notes}
                  suggestedIdeas={suggestionState.suggestions.ideas}
                  suggestedTasks={suggestionState.suggestions.tasks}
                  isLoading={suggestionState.isLoading}
                  error={suggestionState.error}
                  onLinkNote={async (noteId) => {
                    try {
                      await addLink(currentIdea.id, noteId, 'Note');
                      triggerRefreshSuggestions();
                    } catch (error) {
                      console.error('Failed to link note:', error);
                    }
                  }}
                  onLinkIdea={async (ideaId) => {
                    try {
                      await addLink(currentIdea.id, ideaId, 'Idea');
                      triggerRefreshSuggestions();
                    } catch (error) {
                      console.error('Failed to link idea:', error);
                    }
                  }}
                  onLinkTask={async (taskId) => {
                    try {
                      await addLink(currentIdea.id, taskId, 'Task');
                      triggerRefreshSuggestions();
                    } catch (error) {
                      console.error('EditIdeaModal: Failed to link task:', error);
                      throw error;
                    }
                  }}
                />
              </div>
              <LinkedNotesPanel
                linkedNotes={linkedNotes}
                linkedTasks={formattedTasks}
                linkedIdeas={linkedIdeas}
                onShowAddLink={() => setShowAddLinkModal(true)}
                onShowAddTask={() => setShowAddTaskModal(true)}
                onUnlinkTask={handleUnlinkTask}
                currentNoteId={currentIdea.id}
                onUnlinkNote={(noteId) => handleUnlinkItem(noteId, 'Note')}
                onUnlinkIdea={(ideaId) => handleUnlinkItem(ideaId, 'Idea')}
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
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accentHover)] transition-colors flex items-center gap-2"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Save Changes
            </button>
          </div>
        </form>

        <DeleteConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onDelete={handleDelete}
          isLoading={isLoading}
          itemName={currentIdea.title}
        />

        {showAddLinkModal && (
          <IdeaAddLinkModal
            isOpen={showAddLinkModal}
            onClose={() => setShowAddLinkModal(false)}
            ideaId={currentIdea.id}
            onLinkAdded={() => {
              setShowAddLinkModal(false);
              triggerRefreshSuggestions();
            }}
          />
        )}

        {showAddTaskModal && (
          <IdeaAddTaskLinkModal
            isOpen={showAddTaskModal}
            onClose={() => setShowAddTaskModal(false)}
            ideaId={currentIdea.id}
            onLinkAdded={() => {
              setShowAddTaskModal(false);
              triggerRefreshSuggestions();
            }}
          />
        )}

        {showAddReminderModal && (
          <IdeaAddReminderLinkModal
            isOpen={showAddReminderModal}
            onClose={() => setShowAddReminderModal(false)}
            onSelect={handleLinkReminder}
            currentLinkedReminderIds={linkedReminders.map(r => r.id)}
            passedSuggestedReminders={suggestionState.suggestions.reminders}
            isLoadingSuggestions={suggestionState.isLoading}
          />
        )}
      </div>
    </div>
  );
}
