import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Note } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import type { Task } from '../../../../api/types/task';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedNotesPanel } from './LinkedNotesPanel';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { AddLinkModal } from '../../LinkedNotes/AddLinkModal';
import { AddTaskLinkModal } from './AddTaskLinkModal';
import { AddReminderLinkModal } from './AddReminderLinkModal';

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

export function EditNoteModal({ isOpen, onClose, note }: EditNoteModalProps) {
  const navigate = useNavigate();
  const { notes, updateNote, deleteNote, linkReminder, unlinkReminder } = useNotes();
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

  // Get current note from context to ensure we have latest data
  const currentNote = notes.find(n => n.id === note?.id);

  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content);
      setTags(currentNote.tags);
      setError('');
    }
  }, [currentNote]);

  // Update linked notes and reminders whenever they change
  useEffect(() => {
    if (currentNote) {
      const linkedNotesList = notes.filter(n =>
        currentNote.linkedNoteIds?.includes(n.id)
      );
      setLinkedNotes(linkedNotesList);

      // Update linked tasks
      const linkedTasksList = tasks.filter(t =>
        t.linkedItems?.some(item => item.id === currentNote.id)
      );
      setLinkedTasks(linkedTasksList);

      // Update linked reminders
      setLinkedReminders(currentNote.linkedReminders || []);
    }
  }, [currentNote, currentNote?.linkedNoteIds, currentNote?.linkedReminders, notes, tasks]);

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
    try {
      await removeTaskLink(taskId, currentNote.id);
    } catch (err) {
      console.error('Failed to unlink task:', err);
      setError('Failed to unlink task. Please try again.');
    }
  };

  const handleUnlinkReminder = async (reminderId: string) => {
    try {
      setIsLoading(true);
      await unlinkReminder(currentNote.id, reminderId);

      // Optimistically update the UI
      setLinkedReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error('Failed to unlink reminder:', err);
      setError('Failed to unlink reminder. Please try again.');

      // Revert the optimistic update on error
      if (currentNote?.linkedReminders) {
        setLinkedReminders(currentNote.linkedReminders);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkReminder = async (reminderId: string) => {
    try {
      setIsLoading(true);
      setError('');
      const updatedNote = await linkReminder(currentNote.id, reminderId);

      // Update the linked reminders state with the new data
      if (updatedNote?.linkedReminders) {
        setLinkedReminders(updatedNote.linkedReminders);
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

  // Format linked tasks before passing to panel
  const formattedTasks = linkedTasks.map(task => ({
    ...task,
    dueDate: task.dueDate === undefined ? null : task.dueDate
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[85vh] bg-[var(--color-background)] rounded-2xl shadow-xl overflow-hidden border border-[var(--color-border)]">
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
              setError={setError}
            />

            <LinkedNotesPanel
              linkedNotes={linkedNotes}
              linkedTasks={formattedTasks}
              onShowAddLink={() => setShowAddLinkModal(true)}
              onShowAddTask={() => setShowAddTaskModal(true)}
              onUnlinkTask={handleUnlinkTask}
              currentNoteId={currentNote.id}
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

        <AddLinkModal
          isOpen={showAddLinkModal}
          onClose={() => setShowAddLinkModal(false)}
          sourceNoteId={currentNote.id}
          onLinkAdded={() => {
            // Force refresh linked notes by re-triggering the effect
            setShowAddLinkModal(false);
            // We need to refresh the list of linked notes immediately
            const updatedCurrentNote = notes.find(n => n.id === currentNote.id);
            if (updatedCurrentNote) {
              const updatedLinkedNotes = notes.filter(n =>
                updatedCurrentNote.linkedNoteIds?.includes(n.id)
              );
              setLinkedNotes(updatedLinkedNotes);
            }
          }}
        />

        <AddTaskLinkModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          noteId={currentNote.id}
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