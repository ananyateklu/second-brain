import { useState, useEffect } from 'react';
import type { Note } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import type { Task } from '../../../../api/types/task';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedNotesPanel } from './LinkedNotesPanel';
import { AddLinkModal } from '../../LinkedNotes/AddLinkModal';
import { AddTaskLinkModal } from '../../Notes/EditNoteModal/AddTaskLinkModal';
import { AddReminderLinkModal } from '../../Notes/EditNoteModal/AddReminderLinkModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useNavigate } from 'react-router-dom';

interface EditIdeaModalProps {
  idea: Note;
  isOpen: boolean;
  onClose: () => void;
}

export function EditIdeaModal({ isOpen, onClose, idea: initialIdea }: EditIdeaModalProps) {
  const navigate = useNavigate();
  const { notes, updateNote, deleteNote, linkReminder, unlinkReminder, removeLink } = useNotes();
  const { tasks, removeTaskLink } = useTasks();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [linkedReminders, setLinkedReminders] = useState<Note['linkedReminders']>([]);
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
  const currentIdea = notes.find(n => n.id === initialIdea?.id);

  useEffect(() => {
    if (currentIdea) {
      setTitle(currentIdea.title);
      setContent(currentIdea.content);
      setTags(currentIdea.tags);
      setError('');
    }
  }, [currentIdea]);

  // Update linked notes and reminders whenever they change
  useEffect(() => {
    if (currentIdea) {
      const linkedNotesList = notes.filter(n =>
        currentIdea.linkedNoteIds?.includes(n.id)
      );
      setLinkedNotes(linkedNotesList);

      const linkedTasksList = tasks.filter(t =>
        t.linkedItems?.some(item => item.id === currentIdea.id)
      );
      setLinkedTasks(linkedTasksList);

      setLinkedReminders(currentIdea.linkedReminders || []);
    }
  }, [currentIdea, currentIdea?.linkedNoteIds, currentIdea?.linkedReminders, notes, tasks]);

  if (!isOpen || !currentIdea) return null;

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteNote(currentIdea.id);
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
      await unlinkReminder(currentIdea.id, reminderId);
      setLinkedReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error('Failed to unlink reminder:', err);
      setError('Failed to unlink reminder. Please try again.');
      if (currentIdea?.linkedReminders) {
        setLinkedReminders(currentIdea.linkedReminders);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkReminder = async (reminderId: string) => {
    try {
      setIsLoading(true);
      setError('');
      const updatedIdea = await linkReminder(currentIdea.id, reminderId);
      if (updatedIdea?.linkedReminders) {
        setLinkedReminders(updatedIdea.linkedReminders);
      }
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
      await updateNote(currentIdea.id, {
        title: title.trim(),
        content: content.trim(),
        tags,
        isIdea: true
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
      await removeLink(currentIdea.id, linkedNoteId);
      // Optimistically update the UI
      setLinkedNotes(prev => prev.filter(n => n.id !== linkedNoteId));
    } catch (error) {
      console.error('Failed to unlink note:', error);
    }
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

          <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
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
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-idea)] hover:bg-[var(--color-idea)]/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        <AddLinkModal
          isOpen={showAddLinkModal}
          onClose={() => setShowAddLinkModal(false)}
          sourceNoteId={currentIdea.id}
          onLinkAdded={() => {
            // Force refresh linked notes by re-triggering the effect
            setShowAddLinkModal(false);
            // We need to refresh the list of linked notes immediately
            const updatedCurrentIdea = notes.find(n => n.id === currentIdea.id);
            if (updatedCurrentIdea) {
              const updatedLinkedNotes = notes.filter(n =>
                updatedCurrentIdea.linkedNoteIds?.includes(n.id)
              );
              setLinkedNotes(updatedLinkedNotes);
            }
          }}
        />

        <AddTaskLinkModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          noteId={currentIdea.id}
          onLinkAdded={() => setShowAddTaskModal(false)}
        />

        <AddReminderLinkModal
          isOpen={showAddReminderModal}
          onClose={() => setShowAddReminderModal(false)}
          onSelect={handleLinkReminder}
          currentLinkedReminderIds={linkedReminders.map(r => r.id)}
        />
      </div>
    </div>
  );
}
