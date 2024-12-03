import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Note } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { Task } from '../../../../api/types/task';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedNotesPanel } from './LinkedNotesPanel';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { AddLinkModal } from '../../LinkedNotes/AddLinkModal';
import { AddTaskLinkModal } from './AddTaskLinkModal';

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

export interface HeaderProps {
  note: Note;
  onClose: () => void;
  onShowDeleteConfirm: () => void;
}

export interface LinkedNotesPanelProps {
  linkedNotes: Note[];
  linkedTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null | undefined;
  }>;
  onShowAddLink: () => void;
  onShowAddTask: () => void;
  currentNoteId: string;
  isIdea?: boolean;
  onUnlinkTask: (taskId: string) => void;
}

export function EditNoteModal({ isOpen, onClose, note }: EditNoteModalProps) {
  const navigate = useNavigate();
  const { notes, updateNote, deleteNote } = useNotes();
  const { tasks, removeTaskLink } = useTasks();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setError('');
      // Reset other states if needed
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

  // Update linked notes whenever they change
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
    }
  }, [currentNote, currentNote?.linkedNoteIds, notes, tasks]);

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
    dueDate: task.dueDate || undefined
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-[#111111] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md border border-gray-200/30 dark:border-[#1C1C1E]"
        style={{
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <Header
            note={currentNote}
            onClose={onClose}
            onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
          />

          <div className="flex-1 grid grid-cols-[1fr,300px] min-h-0 overflow-hidden">
            <MainContent
              title={title}
              content={content}
              tags={tags}
              tagInput={tagInput}
              error={error}
              isLoading={isLoading}
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
              setError={setError}
            />

            <LinkedNotesPanel
              linkedNotes={linkedNotes}
              linkedTasks={formattedTasks}
              onShowAddLink={() => setShowAddLinkModal(true)}
              onShowAddTask={() => setShowAddTaskModal(true)}
              currentNoteId={currentNote.id}
              onUnlinkTask={handleUnlinkTask}
            />
          </div>

          <div className="shrink-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-200/30 dark:border-[#1C1C1E] bg-white dark:bg-[#111111] backdrop-blur-md">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2E] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          onLinkAdded={() => setShowAddLinkModal(false)}
        />

        <AddTaskLinkModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          noteId={currentNote.id}
          onLinkAdded={() => setShowAddTaskModal(false)}
        />
      </div>
    </div>
  );
}