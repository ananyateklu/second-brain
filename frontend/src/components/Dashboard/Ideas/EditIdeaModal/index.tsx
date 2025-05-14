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
import { AddReminderLinkModal } from '../../Notes/EditNoteModal/AddReminderLinkModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { UnifiedSuggestionPopup } from './UnifiedSuggestionPopup';
import { similarContentService } from '../../../../services/ai/similarContentService';
import { FooterActions } from './FooterActions';

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
  const { notes: allNotes } = useNotes();
  const { tasks: allTasks } = useTasks();
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
  const [isSuggestionPopupOpen, setIsSuggestionPopupOpen] = useState(false);

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

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setError('');
      setIsSuggestionPopupOpen(false);
    }
  }, [isOpen]);

  const currentIdea = ideasState.ideas.find(i => i.id === initialIdea?.id);

  useEffect(() => {
    if (currentIdea) {
      setTitle(currentIdea.title);
      setContent(currentIdea.content);
      setTags(currentIdea.tags || []);
      setError('');
    } else {
      setTitle('');
      setContent('');
      setTags([]);
      setError('Idea not found.');
    }
  }, [currentIdea]);

  useEffect(() => {
    if (currentIdea) {
      const linkedItems = currentIdea.linkedItems || [];
      const linkedNotesList = allNotes.filter(n => linkedItems.some(item => item.id === n.id && item.type === 'Note'));
      setLinkedNotes(linkedNotesList);

      const linkedIdeasList = ideasState.ideas.filter(i => linkedItems.some(item => item.id === i.id && item.type === 'Idea') && i.id !== currentIdea.id);
      setLinkedIdeas(linkedIdeasList);

      const linkedTasksList = allTasks.filter(t => linkedItems.some(item => item.id === t.id && item.type === 'Task'));
      setLinkedTasks(linkedTasksList);

      const linkedRemindersList = linkedItems
        .filter(item => item.type === 'Reminder')
        .map(item => {
          const fullReminder = allReminders.find(r => r.id === item.id);
          if (!fullReminder) return null;
          return { ...fullReminder } as IdeaReminderLink;
        })
        .filter(Boolean) as IdeaReminderLink[];
      setLinkedReminders(linkedRemindersList);
    }
  }, [currentIdea, allNotes, allTasks, ideasState.ideas, allReminders]);

  const loadAllSuggestions = useCallback(async () => {
    if (!currentIdea) return;
    const hasSourceNotes = allNotes.length > 0;
    const hasSourceIdeas = ideasState.ideas.length > 1;
    const hasSourceTasks = allTasks.length > 0;
    const hasSourceReminders = allReminders.length > 0;
    if (!hasSourceNotes && !hasSourceIdeas && !hasSourceTasks && !hasSourceReminders) {
      setSuggestionState(prev => ({ ...prev, isLoading: false, suggestions: { notes: [], ideas: [], tasks: [], reminders: [] } }));
      return;
    }
    try {
      setSuggestionState(prev => ({ ...prev, isLoading: true, error: null }));
      const linkedIds = currentIdea.linkedItems?.map(item => item.id) || [];
      const results = await similarContentService.findSimilarContent(
        { id: currentIdea.id, title: currentIdea.title, content: currentIdea.content || '', tags: currentIdea.tags || [] },
        allNotes, ideasState.ideas.filter(idea => idea.id !== currentIdea.id), allTasks, allReminders, linkedIds, 12
      );
      const noteResults = results.filter(item => item.type === 'note' && allNotes.some(local => local.id === item.id));
      const ideaResults = results.filter(item => item.type === 'idea' && ideasState.ideas.some(local => local.id === item.id));
      const taskResults = results.filter(item => item.type === 'task' && allTasks.some(local => local.id === item.id));
      const reminderResults = results.filter(item => item.type === 'reminder' && allReminders.some(local => local.id === item.id));
      setSuggestionState({
        isLoading: false, error: null,
        suggestions: {
          notes: noteResults.map(s => ({ ...s, type: 'note' } as UnifiedSuggestion)),
          ideas: ideaResults.map(s => ({ ...s, type: 'idea' } as UnifiedSuggestion)),
          tasks: taskResults.map(s => ({ ...s, type: 'task' } as UnifiedSuggestion)),
          reminders: reminderResults.map(s => ({ ...s, type: 'reminder' } as UnifiedSuggestion)),
        }
      });
    } catch (err: unknown) {
      console.error("Error loading suggestions:", err);
      const message = err instanceof Error ? err.message : 'Failed to load suggestions';
      setSuggestionState(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, [currentIdea, allNotes, ideasState.ideas, allTasks, allReminders]);

  const openSuggestionPopup = () => {
    setIsSuggestionPopupOpen(true);
    loadAllSuggestions();
  };

  const closeSuggestionPopup = () => {
    setIsSuggestionPopupOpen(false);
  };

  const handleSave = async () => {
    if (!currentIdea) return;
    setIsLoading(true);
    setError('');
    try {
      await updateIdea(currentIdea.id, { title, content, tags });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update idea';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentIdea) return;
    setIsLoading(true);
    try {
      await deleteIdea(currentIdea.id);
      onClose();
      navigate('/dashboard/ideas');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete idea';
      setError(message);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLinkItemFromPopup = async (itemId: string, itemType: 'Note' | 'Idea' | 'Task' | 'Reminder') => {
    if (!currentIdea) return false;
    try {
      await addLink(currentIdea.id, itemId, itemType);
      if (isSuggestionPopupOpen) loadAllSuggestions();
      return true;
    } catch (error) {
      console.error(`Failed to link ${itemType} from popup:`, error);
      return false;
    }
  };

  const handleUnlinkItem = async (itemId: string, itemType: 'Note' | 'Idea' | 'Task' | 'Reminder') => {
    if (!currentIdea) return;
    try {
      await removeLink(currentIdea.id, itemId, itemType);
      if (isSuggestionPopupOpen) loadAllSuggestions();
    } catch (error) {
      console.error(`Failed to unlink ${itemType}:`, error);
    }
  };

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border-white/5';
    if (theme === 'dark') return 'border-gray-700/30';
    return 'border-[var(--color-border)]';
  };

  if (!isOpen || !currentIdea) {
    return null;
  }

  const headerIdea = {
    ...currentIdea,
    title,
    content,
    tags,
    linkedItems: currentIdea.linkedItems || []
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`relative flex flex-col w-full max-w-4xl h-auto max-h-[90vh] bg-[var(--color-background)] rounded-xl shadow-2xl overflow-hidden border ${getBorderStyle()}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Header
          idea={headerIdea}
          onClose={onClose}
          onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
        />
        <div className="flex flex-1 min-h-0">
          <div className={`flex-1 flex flex-col min-w-0 border-r ${getBorderStyle()}`}>
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
              onTagInputChange={setTagInput}
              onAddTag={() => {
                if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                  setTags([...tags, tagInput.trim()]);
                  setTagInput('');
                }
              }}
              onRemoveTag={(tagToRemove) => setTags(tags.filter(t => t !== tagToRemove))}
              onShowAddReminder={() => setShowAddReminderModal(true)}
              onUnlinkReminder={(reminderId) => handleUnlinkItem(reminderId, 'Reminder')}
              onOpenSuggestionPopup={openSuggestionPopup}
              currentIdea={currentIdea}
            />
          </div>

          <div className="w-[340px] flex-shrink-0 overflow-y-auto bg-[var(--color-surface)] flex flex-col">
            <LinkedNotesPanel
              linkedNotes={linkedNotes}
              linkedIdeas={linkedIdeas}
              linkedTasks={linkedTasks}
              onUnlinkNote={(noteId) => handleUnlinkItem(noteId, 'Note')}
              onUnlinkIdea={(ideaId) => handleUnlinkItem(ideaId, 'Idea')}
              onUnlinkTask={(taskId) => handleUnlinkItem(taskId, 'Task')}
              onShowAddLink={() => setShowAddLinkModal(true)}
              onShowAddTask={() => setShowAddTaskModal(true)}
              currentNoteId={currentIdea.id}
            />
          </div>
        </div>

        <FooterActions
          onClose={onClose}
          onSave={handleSave}
          isLoading={isLoading}
          getBorderStyle={getBorderStyle}
        />

        {showDeleteConfirm && (
          <DeleteConfirmDialog
            isOpen={showDeleteConfirm}
            isLoading={isLoading}
            onClose={() => setShowDeleteConfirm(false)}
            onDelete={handleDelete}
            itemName={currentIdea.title}
          />
        )}
        {showAddLinkModal && currentIdea && (
          <IdeaAddLinkModal
            isOpen={showAddLinkModal}
            onClose={() => setShowAddLinkModal(false)}
            ideaId={currentIdea.id}
            onLinkAdded={() => {
              // The modal handles its own linking. This callback is for any post-linking actions in parent if needed.
              // For example, refresh suggestions if the popup is open:
              // if (isSuggestionPopupOpen) loadAllSuggestions();
            }}
          />
        )}
        {showAddTaskModal && currentIdea && (
          <IdeaAddTaskLinkModal
            isOpen={showAddTaskModal}
            onClose={() => setShowAddTaskModal(false)}
            ideaId={currentIdea.id}
            onLinkAdded={() => {
              // if (isSuggestionPopupOpen) loadAllSuggestions();
            }}
          />
        )}
        {showAddReminderModal && currentIdea && (
          <AddReminderLinkModal
            isOpen={showAddReminderModal}
            onClose={() => setShowAddReminderModal(false)}
            onSelect={(reminderId) => handleLinkItemFromPopup(reminderId, 'Reminder')}
            currentLinkedReminderIds={linkedReminders.map(r => r.id)}
          />
        )}

        {currentIdea && (
          <UnifiedSuggestionPopup
            isOpen={isSuggestionPopupOpen}
            onClose={closeSuggestionPopup}
            currentIdea={currentIdea}
            suggestionState={suggestionState}
            loadSuggestions={loadAllSuggestions}
            onLinkItem={handleLinkItemFromPopup}
          />
        )}
      </div>
    </div>
  );
}
