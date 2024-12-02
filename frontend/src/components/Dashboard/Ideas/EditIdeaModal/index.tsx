import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note } from '../../../../contexts/NotesContext';
import { useNotes } from '../../../../contexts/NotesContext';
import { useTasks } from '../../../../contexts/TasksContext';
import { Task } from '../../../../api/types/task';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedNotesPanel } from '../../Notes/EditNoteModal/LinkedNotesPanel';
import { DeleteConfirmDialog } from '../../Notes/EditNoteModal/DeleteConfirmDialog';
import { AddLinkModal } from '../../LinkedNotes/AddLinkModal';
import { AddTaskLinkModal } from '../../Notes/EditNoteModal/AddTaskLinkModal';

interface EditIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: Note | null;
}

export function EditIdeaModal({ isOpen, onClose, idea }: EditIdeaModalProps) {
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

  // Get current idea from context to ensure we have latest data
  const currentIdea = notes.find(n => n.id === idea?.id);

  useEffect(() => {
    if (currentIdea) {
      setTitle(currentIdea.title);
      setContent(currentIdea.content);
      setTags(currentIdea.tags);
      setError('');
    }
  }, [currentIdea]);

  // Update linked notes whenever they change
  useEffect(() => {
    if (currentIdea) {
      const linkedNotesList = notes.filter(n =>
        currentIdea.linkedNoteIds?.includes(n.id)
      );
      setLinkedNotes(linkedNotesList);

      // Update linked tasks
      const linkedTasksList = tasks.filter(t =>
        t.linkedItems?.some(item => item.id === currentIdea.id)
      );
      setLinkedTasks(linkedTasksList);
    }
  }, [currentIdea, currentIdea?.linkedNoteIds, notes, tasks]);

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
        tags: tags.includes('idea') ? tags : ['idea', ...tags]
      });
      onClose();
    } catch (err) {
      console.error('Failed to update idea:', err);
      setError('Failed to update idea. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            idea={currentIdea}
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
              onTagInputChange={(value) => {
                if (Array.isArray(value)) {
                  setTags(['idea', ...value]);
                  setTagInput('');
                } else {
                  setTagInput(value);
                }
              }}
              onAddTag={() => {
                const trimmedTag = tagInput.trim();
                if (trimmedTag && !tags.includes(trimmedTag)) {
                  setTags([...tags, trimmedTag]);
                  setTagInput('');
                }
              }}
              onRemoveTag={(tag) => tag !== 'idea' && setTags(tags.filter(t => t !== tag))}
              setError={setError}
            />

            <LinkedNotesPanel
              linkedNotes={linkedNotes}
              linkedTasks={linkedTasks}
              onShowAddLink={() => setShowAddLinkModal(true)}
              onShowAddTask={() => setShowAddTaskModal(true)}
              currentNoteId={currentIdea?.id || ''}
              isIdea={true}
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
          sourceNoteId={currentIdea.id}
          onLinkAdded={() => setShowAddLinkModal(false)}
        />

        <AddTaskLinkModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          noteId={currentIdea.id}
          onLinkAdded={() => setShowAddTaskModal(false)}
        />
      </div>
    </div>
  );
}
