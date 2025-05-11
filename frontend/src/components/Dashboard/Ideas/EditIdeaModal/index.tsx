import { useState, useEffect } from 'react';
import { Idea } from '../../../../types/idea';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { useIdeas } from '../../../../contexts/IdeasContext';
import type { Task } from '../../../../types/task';
import type { Note } from '../../../../types/note';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedNotesPanel } from './LinkedNotesPanel';
import { AddLinkModal } from '../../LinkedNotes/AddLinkModal';
import { AddTaskLinkModal } from '../../Notes/EditNoteModal/AddTaskLinkModal';
import { AddReminderLinkModal } from '../../Notes/EditNoteModal/AddReminderLinkModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../contexts/themeContextUtils';

interface EditIdeaModalProps {
  idea: Idea;
  isOpen: boolean;
  onClose: () => void;
}

export function EditIdeaModal({ isOpen, onClose, idea: initialIdea }: EditIdeaModalProps) {
  const navigate = useNavigate();
  const { notes } = useNotes();
  const { tasks, removeTaskLink } = useTasks();
  const { updateIdea, deleteIdea, addLink, removeLink } = useIdeas();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [linkedReminders, setLinkedReminders] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setError('');
    }
  }, [isOpen]);

  // Get current idea from context to ensure we have latest data
  const { state: { ideas } } = useIdeas();
  const currentIdea = ideas.find(i => i.id === initialIdea?.id);

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

      // Filter linked tasks
      const linkedTasksList = tasks.filter(t =>
        currentIdea.linkedItems?.some(item => item.id === t.id && item.type === 'Task')
      );
      setLinkedTasks(linkedTasksList);

      // Filter linked reminders and format them
      const linkedRemindersList = currentIdea.linkedItems
        ?.filter(item => item.type === 'Reminder')
        .map(item => ({ id: item.id, title: item.title })) || [];
      setLinkedReminders(linkedRemindersList);
    }
  }, [currentIdea, currentIdea?.linkedItems, notes, tasks]);

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
      await removeTaskLink(taskId, currentIdea.id);
    } catch (err) {
      console.error('Failed to unlink task:', err);
      setError('Failed to unlink task. Please try again.');
    }
  };

  const handleUnlinkReminder = async (reminderId: string) => {
    try {
      setIsLoading(true);
      await removeLink(currentIdea.id, reminderId, 'Reminder');
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

  const handleUnlinkNote = async (linkedNoteId: string) => {
    try {
      await removeLink(currentIdea.id, linkedNoteId, 'Note');
    } catch (error) {
      console.error('Failed to unlink note:', error);
    }
  };

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border-white/5';
    if (theme === 'dark') return 'border-gray-700/30';
    return 'border-[var(--color-border)]';
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

          <div className="flex-1 grid grid-cols-[1fr,360px] min-h-0 overflow-hidden">
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
            />

            <LinkedNotesPanel
              linkedNotes={linkedNotes}
              linkedTasks={formattedTasks}
              onShowAddLink={() => setShowAddLinkModal(true)}
              onShowAddTask={() => setShowAddTaskModal(true)}
              onUnlinkTask={handleUnlinkTask}
              onUnlinkNote={handleUnlinkNote}
              currentNoteId={currentIdea.id}
            />
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
          <AddLinkModal
            isOpen={showAddLinkModal}
            onClose={() => setShowAddLinkModal(false)}
            sourceNoteId={currentIdea.id}
            onLinkAdded={() => {
              // We don't need to do anything here as the linked items will be updated via the context
            }}
          />
        )}

        {showAddTaskModal && (
          <AddTaskLinkModal
            isOpen={showAddTaskModal}
            onClose={() => setShowAddTaskModal(false)}
            noteId={currentIdea.id}
            onLinkAdded={() => {
              // Refresh linked notes by updating the state
              const updatedCurrentIdea = ideas.find(i => i.id === currentIdea.id);
              if (updatedCurrentIdea) {
                const updatedTasks = tasks.filter(t =>
                  updatedCurrentIdea.linkedItems?.some(item => item.id === t.id && item.type === 'Task')
                );
                setLinkedTasks(updatedTasks);
              }
            }}
          />
        )}

        {showAddReminderModal && (
          <AddReminderLinkModal
            isOpen={showAddReminderModal}
            onClose={() => setShowAddReminderModal(false)}
            onSelect={handleLinkReminder}
            currentLinkedReminderIds={linkedReminders.map(r => r.id)}
          />
        )}
      </div>
    </div>
  );
}
