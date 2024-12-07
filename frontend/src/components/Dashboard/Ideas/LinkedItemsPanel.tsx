import { Link2, Plus, Type, CheckSquare, X, Calendar } from 'lucide-react';
import type { Note } from '../../../types/note';
import { useNotes } from '../../../contexts/notesContextUtils';

interface LinkedItemsPanelProps {
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
  onUnlinkTask: (taskId: string) => void;
}

export function LinkedItemsPanel({
  linkedNotes,
  linkedTasks = [],
  onShowAddLink,
  onShowAddTask,
  currentNoteId,
  onUnlinkTask
}: LinkedItemsPanelProps) {
  const { removeLink } = useNotes();

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

  const hasLinkedItems = linkedNotes.length > 0 || linkedTasks.length > 0;

  return (
    <div className="w-72 border-l border-[var(--color-border)] flex flex-col h-full bg-[var(--color-background)]">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[var(--color-textSecondary)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">
              Linked Items
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShowAddTask();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-md transition-colors"
          >
            <Plus className="w-3 h-3" />
            Task
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShowAddLink();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-md transition-colors"
          >
            <Plus className="w-3 h-3" />
            Note
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {hasLinkedItems ? (
          <div className="p-2 space-y-4">
            {/* Notes Section */}
            {linkedNotes.length > 0 && (
              <div>
                <h6 className="text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider px-2 mb-1">
                  Notes & Ideas
                </h6>
                <div className="space-y-1">
                  {linkedNotes.map(linkedNote => (
                    <div
                      key={linkedNote.id}
                      className="group flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className={`shrink-0 p-1.5 rounded-lg bg-[var(--color-note)]/10`}>
                        <Type className="w-3.5 h-3.5 text-[var(--color-note)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h6 className="text-sm font-medium text-[var(--color-text)] truncate">
                          {linkedNote.title}
                        </h6>
                        <p className="text-xs text-[var(--color-textSecondary)]">
                          Note
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnlinkNote(linkedNote.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {linkedTasks.length > 0 && (
              <div>
                <h6 className="text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider px-2 mb-1">
                  Tasks
                </h6>
                <div className="space-y-1">
                  {linkedTasks.map(task => (
                    <div
                      key={task.id}
                      className="group flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <div className="shrink-0 p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h6 className="text-sm font-medium text-[var(--color-text)] truncate">
                          {task.title}
                        </h6>
                        <div className="flex items-center gap-2">
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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onUnlinkTask(task.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
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
              Click the buttons above to link notes or tasks
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 