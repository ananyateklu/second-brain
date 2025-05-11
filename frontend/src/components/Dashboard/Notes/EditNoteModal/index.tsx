import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Note } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { useIdeas } from '../../../../contexts/ideasContextUtils';
import type { Task } from '../../../../types/task';
import type { Idea } from '../../../../types/idea';
import { Header } from './Header';
import { MainContent } from './MainContent';
import { LinkedNotesPanel } from './LinkedNotesPanel';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { AddLinkModal } from '../../LinkedNotes/AddLinkModal';
import { AddTaskLinkModal } from './AddTaskLinkModal';
import { AddReminderLinkModal } from './AddReminderLinkModal';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { SuggestedLinksSection } from './SuggestedLinksSection';

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

export function EditNoteModal({ isOpen, onClose, note }: EditNoteModalProps) {
  const navigate = useNavigate();
  const { notes, updateNote, deleteNote, linkReminder, unlinkReminder, addLink } = useNotes();
  const { tasks, removeTaskLink, addTaskLink } = useTasks();
  const { state: { ideas }, addLink: addIdeaLink, removeLink: removeIdeaLink } = useIdeas();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [linkedIdeas, setLinkedIdeas] = useState<Idea[]>([]);
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

  // Update linked notes, ideas, tasks and reminders whenever they change
  useEffect(() => {
    if (currentNote) {
      const linkedNotesList = notes.filter(n =>
        currentNote.linkedNoteIds?.includes(n.id)
      );
      setLinkedNotes(linkedNotesList);

      // Update linked ideas
      const linkedIdeasList = ideas.filter(idea =>
        idea.linkedItems?.some(item => item.id === currentNote.id && item.type === 'Note')
      );
      setLinkedIdeas(linkedIdeasList);

      // Update linked tasks
      const linkedTasksList = tasks.filter(t =>
        t.linkedItems?.some(item => item.id === currentNote.id)
      );
      setLinkedTasks(linkedTasksList);

      // Update linked reminders
      setLinkedReminders(currentNote.linkedReminders || []);
    }
  }, [currentNote, currentNote?.linkedNoteIds, currentNote?.linkedReminders, notes, tasks, ideas]);

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

  // Add this wrapper function right after handleLinkReminder
  const handleLinkReminderWrapper = async (reminderId: string): Promise<void> => {
    await handleLinkReminder(reminderId);
    // No return value makes this Promise<void>
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

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border-white/5';
    if (theme === 'dark') return 'border-gray-700/30';
    return 'border-[var(--color-border)]';
  };

  const handleUnlinkIdea = async (ideaId: string) => {
    try {
      await removeIdeaLink(ideaId, currentNote.id, 'Note');
      // The linked ideas will update through the effect
    } catch (err) {
      console.error('Failed to unlink idea:', err);
      setError('Failed to unlink idea. Please try again.');
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
              onLinkReminder={handleLinkReminderWrapper}
              currentNote={currentNote}
              setError={setError}
            />

            <div className={`flex flex-col overflow-y-auto border-l ${getBorderStyle()} bg-[var(--color-surface)]`}>
              <div className="p-4">
                <SuggestedLinksSection
                  currentNote={currentNote}
                  linkedNoteIds={currentNote.linkedNoteIds || []}
                  linkedTaskIds={linkedTasks.map(t => t.id)}
                  linkedIdeaIds={linkedIdeas.map(i => i.id)}
                  onLinkNote={async (noteId: string) => {
                    try {
                      await addLink(currentNote.id, noteId);
                      return Promise.resolve();
                    } catch (error) {
                      console.error('Failed to link note:', error);
                      setError('Failed to link note. Please try again.');
                      return Promise.reject(error);
                    }
                  }}
                  onLinkIdea={async (ideaId: string) => {
                    try {
                      await addIdeaLink(ideaId, currentNote.id, 'Note');
                      return Promise.resolve();
                    } catch (error) {
                      console.error('Failed to link idea:', error);
                      setError('Failed to link idea. Please try again.');
                      return Promise.reject(error);
                    }
                  }}
                  onLinkTask={async (taskId: string) => {
                    try {
                      if (!addTaskLink) {
                        console.error('Task linking function not available');
                        setError('Task linking is not available');
                        return Promise.reject(new Error('Task linking not available'));
                      }
                      await addTaskLink({
                        taskId,
                        linkedItemId: currentNote.id,
                        itemType: 'note'
                      });
                      return Promise.resolve();
                    } catch (error) {
                      console.error('Failed to link task:', error);
                      setError('Failed to link task. Please try again.');
                      return Promise.reject(error);
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
                onUnlinkIdea={handleUnlinkIdea}
                currentNoteId={currentNote.id}
                currentNote={currentNote}
                onLinkNote={async (noteId: string) => {
                  try {
                    await addLink(currentNote.id, noteId);
                    // The linked notes will update automatically through the effects
                    return Promise.resolve();
                  } catch (error) {
                    console.error('Failed to link note:', error);
                    setError('Failed to link note. Please try again.');
                    return Promise.reject(error);
                  }
                }}
                onLinkIdea={async (ideaId: string) => {
                  try {
                    await addIdeaLink(ideaId, currentNote.id, 'Note');
                    return Promise.resolve();
                  } catch (error) {
                    console.error('Failed to link idea:', error);
                    setError('Failed to link idea. Please try again.');
                    return Promise.reject(error);
                  }
                }}
                onLinkTask={async (taskId: string) => {
                  try {
                    // Make sure we have the tasks service function
                    if (!addTaskLink) {
                      console.error('Task linking function not available');
                      setError('Task linking is not available');
                      return Promise.reject(new Error('Task linking not available'));
                    }

                    await addTaskLink({
                      taskId,
                      linkedItemId: currentNote.id,
                      itemType: 'note'
                    });
                    return Promise.resolve();
                  } catch (error) {
                    console.error('Failed to link task:', error);
                    setError('Failed to link task. Please try again.');
                    return Promise.reject(error);
                  }
                }}
                onLinkReminder={async (reminderId: string) => {
                  try {
                    const success = await handleLinkReminder(reminderId);
                    if (!success) {
                      return Promise.reject(new Error('Failed to link reminder'));
                    }
                    return Promise.resolve();
                  } catch (error) {
                    console.error('Failed to link reminder:', error);
                    setError('Failed to link reminder. Please try again.');
                    return Promise.reject(error);
                  }
                }}
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

        <AddLinkModal
          isOpen={showAddLinkModal}
          onClose={() => setShowAddLinkModal(false)}
          sourceId={currentNote.id}
          sourceType="note"
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
          onSelect={handleLinkReminderWrapper}
          currentLinkedReminderIds={linkedReminders.map(r => r.id)}
        />
      </div>
    </div>
  );
}