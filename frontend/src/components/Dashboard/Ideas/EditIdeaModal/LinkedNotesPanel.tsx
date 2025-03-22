import { Link2, Plus, Type, Lightbulb, CheckSquare, X, Calendar } from 'lucide-react';
import type { Note } from '../../../../types/note';
import { useState } from 'react';
import { EditNoteModal } from '../../Notes/EditNoteModal';
import { EditTaskModal } from '../../Tasks/EditTaskModal';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import type { Task } from '../../../../api/types/task';

interface LinkedNotesPanelProps {
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
  onUnlinkNote: (noteId: string) => void;
}

export function LinkedNotesPanel({
  linkedNotes,
  linkedTasks = [],
  onShowAddLink,
  onShowAddTask,
  currentNoteId,
  onUnlinkTask,
  onUnlinkNote
}: LinkedNotesPanelProps) {
  const { tasks } = useTasks();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleTaskClick = (taskId: string) => {
    const fullTask = tasks.find(t => t.id === taskId);
    if (fullTask) {
      setSelectedTask(fullTask);
    }
  };

  const hasLinkedItems = linkedNotes.length > 0 || linkedTasks.length > 0;

  return (
    <>
      <div className="border-l border-[var(--color-border)] flex flex-col h-full bg-[var(--color-surface)]">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[var(--color-idea)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                Linked Items
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShowAddTask}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-idea)] bg-[var(--color-idea)]/10 hover:bg-[var(--color-idea)]/15 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Task
            </button>
            <button
              type="button"
              onClick={onShowAddLink}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-idea)] bg-[var(--color-idea)]/10 hover:bg-[var(--color-idea)]/15 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Note
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {hasLinkedItems ? (
            <div className="p-3 space-y-4">
              {/* Notes Section */}
              {linkedNotes.length > 0 && (
                <div>
                  <h6 className="text-xs font-medium text-[var(--color-idea)] uppercase tracking-wider px-1 mb-2">
                    Notes & Ideas
                  </h6>
                  <div className="space-y-2">
                    {linkedNotes.map(linkedNote => (
                      <div
                        key={linkedNote.id}
                        onClick={() => setSelectedNote(linkedNote)}
                        className="group flex items-start gap-2.5 p-2 rounded-lg bg-[#1e293b] hover:bg-[#273344] border border-[var(--color-border)] transition-colors cursor-pointer relative"
                      >
                        <div className={`shrink-0 p-1.5 rounded-lg ${linkedNote.isIdea
                          ? 'bg-[var(--color-idea)]/15'
                          : 'bg-[var(--color-note)]/15'
                          }`}>
                          {linkedNote.isIdea ? (
                            <Lightbulb className="w-3.5 h-3.5 text-[var(--color-idea)]" />
                          ) : (
                            <Type className="w-3.5 h-3.5 text-[var(--color-note)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <h6 className="text-sm font-medium text-[var(--color-text)] truncate">
                            {linkedNote.title}
                          </h6>
                          <p className="text-xs text-[var(--color-textSecondary)]">
                            {linkedNote.isIdea ? 'Idea' : 'Note'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onUnlinkNote(linkedNote.id);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-red-400 hover:bg-red-900/20 rounded transition-all z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              {linkedTasks.length > 0 && (
                <div>
                  <h6 className="text-xs font-medium text-[var(--color-task)] uppercase tracking-wider px-1 mb-2">
                    Tasks
                  </h6>
                  <div className="space-y-2">
                    {linkedTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className="group flex items-start gap-2.5 p-2 rounded-lg bg-[#1e293b] hover:bg-[#273344] border border-[var(--color-border)] transition-colors cursor-pointer relative"
                      >
                        <div className="shrink-0 p-1.5 bg-[var(--color-task)]/15 rounded-lg">
                          <CheckSquare className="w-3.5 h-3.5 text-[var(--color-task)]" />
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <h6 className="text-sm font-medium text-[var(--color-text)] truncate">
                            {task.title}
                          </h6>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${task.status === 'completed'
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-orange-900/30 text-orange-400'
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
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-red-400 hover:bg-red-900/20 rounded transition-all z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center px-6">
              <div className="p-3 bg-[#1e293b] rounded-full mb-3 border border-[var(--color-border)]">
                <Link2 className="w-5 h-5 text-[var(--color-idea)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text)] mb-1">
                No linked items yet
              </p>
              <p className="text-xs text-[var(--color-textSecondary)] max-w-[220px]">
                Connect this idea with related tasks and other notes to build your knowledge network
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedNote && (
        <EditNoteModal
          isOpen={!!selectedNote}
          onClose={() => setSelectedNote(null)}
          note={selectedNote}
        />
      )}

      {selectedTask && (
        <EditTaskModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
        />
      )}
    </>
  );
} 