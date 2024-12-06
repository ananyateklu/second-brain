import { Link2, Plus, Type, Lightbulb, CheckSquare, X, Calendar } from 'lucide-react';
import type { Note } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { LinkedRemindersPanel } from './LinkedRemindersPanel';
import { useState } from 'react';
import { AddReminderLinkModal } from './AddReminderLinkModal';

interface LinkedNotesPanelProps {
  linkedNotes: Note[];
  linkedTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null | undefined;
  }>;
  linkedReminders?: Note['linkedReminders'];
  onShowAddLink: () => void;
  onShowAddTask: () => void;
  currentNoteId: string;
  onUnlinkTask: (taskId: string) => void;
  onUnlinkReminder?: (reminderId: string) => void;
  onLinkReminder?: (reminderId: string) => void;
}

export function LinkedNotesPanel({
  linkedNotes,
  linkedTasks = [],
  linkedReminders = [],
  onShowAddLink,
  onShowAddTask,
  currentNoteId,
  onUnlinkTask,
  onUnlinkReminder,
  onLinkReminder
}: LinkedNotesPanelProps) {
  const { removeLink } = useNotes();
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);

  const handleUnlinkNote = async (linkedNoteId: string) => {
    if (!currentNoteId) {
      console.error('Missing currentNoteId');
      return;
    }
    try {
      await removeLink(currentNoteId, linkedNoteId);
    } catch (error) {
      console.error('Failed to unlink:', error);
    }
  };

  const handleAddReminder = (reminderId: string) => {
    onLinkReminder?.(reminderId);
    setShowAddReminderModal(false);
  };

  const hasLinkedItems = linkedNotes.length > 0 || linkedTasks.length > 0 || linkedReminders.length > 0;

  return (
    <>
      <div className="w-80 border-l border-[var(--color-border)] flex flex-col min-h-0 bg-[var(--color-background)]">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[var(--color-textSecondary)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                Linked Items
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onShowAddTask}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Task
              </button>
              <button
                type="button"
                onClick={() => setShowAddReminderModal(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Reminder
              </button>
              <button
                type="button"
                onClick={onShowAddLink}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Note
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {hasLinkedItems ? (
            <div className="p-4 space-y-6">
              {/* Notes Section */}
              {linkedNotes.length > 0 && (
                <div>
                  <h6 className="text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider mb-2">
                    Notes & Ideas
                  </h6>
                  <div className="space-y-2">
                    {linkedNotes.map(linkedNote => (
                      <div
                        key={linkedNote.id}
                        className="group flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                      >
                        <div className={`shrink-0 p-2 rounded-lg ${
                          linkedNote.isIdea 
                            ? 'bg-[var(--color-idea)]/10' 
                            : 'bg-[var(--color-note)]/10'
                        }`}>
                          {linkedNote.isIdea ? (
                            <Lightbulb className="w-4 h-4 text-[var(--color-idea)]" />
                          ) : (
                            <Type className="w-4 h-4 text-[var(--color-note)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium text-[var(--color-text)] truncate">
                            {linkedNote.title}
                          </h6>
                          <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">
                            {linkedNote.isIdea ? 'Idea' : 'Note'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnlinkNote(linkedNote.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              {linkedTasks.length > 0 && (
                <div>
                  <h6 className="text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider mb-2">
                    Tasks
                  </h6>
                  <div className="space-y-2">
                    {linkedTasks.map(task => (
                      <div
                        key={task.id}
                        className="group flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                      >
                        <div className="shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium text-[var(--color-text)] truncate">
                            {task.title}
                          </h6>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              task.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            }`}>
                              {task.status}
                            </span>
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => onUnlinkTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reminders Section */}
              {linkedReminders && linkedReminders.length > 0 && (
                <div>
                  <h6 className="text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider mb-2">
                    Reminders
                  </h6>
                  <LinkedRemindersPanel
                    reminders={linkedReminders}
                    onUnlink={onUnlinkReminder}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-6 text-center">
              <div className="p-3 bg-[var(--color-surface)]/50 rounded-full mb-3">
                <Link2 className="w-5 h-5 text-[var(--color-textSecondary)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                No linked items yet
              </p>
              <p className="text-xs text-[var(--color-textSecondary)] mt-1 max-w-[200px]">
                Click the buttons above to link notes, tasks, or reminders
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Reminder Modal */}
      <AddReminderLinkModal
        isOpen={showAddReminderModal}
        onClose={() => setShowAddReminderModal(false)}
        onSelect={handleAddReminder}
        currentLinkedReminderIds={linkedReminders?.map(r => r.id) || []}
      />
    </>
  );
}
