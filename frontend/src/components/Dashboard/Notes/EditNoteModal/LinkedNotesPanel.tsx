import { Link2, Plus, Type, CheckSquare, X, Calendar, Lightbulb } from 'lucide-react';
import type { Note } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { useState, useEffect } from 'react';
import { EditNoteModal } from '../EditNoteModal';
import { EditTaskModal } from '../../Tasks/EditTaskModal';
import { useTasks } from '../../../../contexts/tasksContextUtils';
import { useIdeas } from '../../../../contexts/ideasContextUtils';
import type { Task } from '../../../../types/task';
import type { Idea } from '../../../../types/idea';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { EditIdeaModal } from '../../Ideas/EditIdeaModal';

interface LinkedNotesPanelProps {
  linkedNotes: Note[];
  linkedTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null | undefined;
  }>;
  linkedIdeas?: Idea[];
  onShowAddLink: () => void;
  onShowAddTask: () => void;
  currentNoteId: string;
  onUnlinkTask: (taskId: string) => void;
  onUnlinkIdea?: (ideaId: string) => void;
  currentNote: Note;
  linkedReminders?: Array<{
    id: string;
    title: string;
    description: string;
    dueDateTime: string;
    isCompleted: boolean;
    isSnoozed: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  onLinkNote?: (noteId: string) => Promise<void>;
  onLinkTask?: (taskId: string) => Promise<void>;
  onLinkIdea?: (ideaId: string) => Promise<void>;
  onLinkReminder?: (reminderId: string) => Promise<void>;
}

export function LinkedNotesPanel({
  linkedNotes,
  linkedTasks = [],
  linkedIdeas = [],
  onShowAddLink,
  onShowAddTask,
  currentNoteId,
  onUnlinkTask,
  onUnlinkIdea = async () => { },
}: LinkedNotesPanelProps) {
  const { removeLink } = useNotes();
  const { tasks } = useTasks();
  const { state: { ideas: allIdeasContext } } = useIdeas();
  const { theme } = useTheme();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const handleUnlinkNote = async (linkedNoteId: string) => {
    if (!currentNoteId) {
      console.error('Missing currentNoteId');
      return;
    }
    try {
      removeLink(currentNoteId, linkedNoteId);
    } catch (error) {
      console.error('Failed to unlink:', error);
    }
  };

  const handleTaskClick = (taskId: string) => {
    const fullTask = tasks.find(t => t.id === taskId);
    if (fullTask) {
      setSelectedTask(fullTask);
    }
  };

  const handleIdeaClick = (ideaId: string) => {
    const idea = linkedIdeas.find(i => i.id === ideaId) || allIdeasContext.find(i => i.id === ideaId);
    if (idea) {
      setSelectedIdea(idea);
    }
  };

  const getItemBackground = () => {
    if (theme === 'dark') return 'bg-[#111827]';
    if (theme === 'midnight') return 'bg-[#1e293b]';
    return 'bg-[var(--color-surface)]';
  };

  const getItemHoverBackground = () => {
    if (theme === 'dark') return 'hover:bg-[#1f2937]';
    if (theme === 'midnight') return 'hover:bg-[#273344]';
    return 'hover:bg-[var(--color-surfaceHover)]';
  };

  const getEmptyStateBackground = () => {
    if (theme === 'dark') return 'bg-[#111827]';
    if (theme === 'midnight') return 'bg-[#1e293b]';
    return 'bg-[var(--color-surface)]';
  };

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border border-white/5';
    if (theme === 'dark') return 'border border-gray-700/30';
    return 'border border-[var(--color-border)]';
  };

  const hasLinkedItems = linkedNotes.length > 0 || linkedTasks.length > 0 || linkedIdeas.length > 0;

  // Combine notes and ideas for rendering under one section
  const combinedNotesAndIdeas = [
    ...linkedNotes.map(note => ({ ...note, itemType: 'note' as const })),
    ...linkedIdeas.map(idea => ({ ...idea, itemType: 'idea' as const }))
  ];

  useEffect(() => {
    // When no linked items exist, only show empty state if suggestions are also empty
    if (!hasLinkedItems) {
      const checkSuggestions = setTimeout(() => {
        const suggestedSection = document.querySelector('[data-testid="suggested-links-section"]');
        const emptyState = document.getElementById('empty-state');

        if (emptyState) {
          if (suggestedSection && suggestedSection.querySelectorAll('.group').length > 0) {
            // Suggestions exist, hide the empty state
            emptyState.style.display = 'none';
          } else {
            // No suggestions, show the empty state
            emptyState.style.display = 'flex';
          }
        }
      }, 100);

      return () => clearTimeout(checkSuggestions);
    }
  }, [hasLinkedItems]);

  return (
    <>
      <div className={`border-l ${theme === 'midnight' ? 'border-white/5' : theme === 'dark' ? 'border-gray-700/30' : 'border-[var(--color-border)]'} flex flex-col h-full bg-[var(--color-surface)]`}>
        {/* Header */}
        <div className={`shrink-0 px-4 py-3 border-b ${theme === 'midnight' ? 'border-white/5' : theme === 'dark' ? 'border-gray-700/30' : 'border-[var(--color-border)]'} bg-[var(--color-surface)]`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[var(--color-note)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                Linked Items
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShowAddTask}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-note)] bg-[var(--color-note)]/10 hover:bg-[var(--color-note)]/15 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Task
            </button>
            <button
              type="button"
              onClick={onShowAddLink}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-note)] bg-[var(--color-note)]/10 hover:bg-[var(--color-note)]/15 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Note/Idea
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Display linked items below suggestions */}
          {hasLinkedItems && (
            <div className="p-3 space-y-4 border-t border-[var(--color-border)]/10 dark:border-white/5 midnight:border-white/5">
              {/* Notes & Ideas Section */}
              {combinedNotesAndIdeas.length > 0 && (
                <div>
                  <h6 className="text-xs font-medium text-[var(--color-note)] uppercase tracking-wider px-1 mb-2">
                    Notes & Ideas
                  </h6>
                  <div className="space-y-2">
                    {combinedNotesAndIdeas.map(item => (
                      <div
                        key={item.id}
                        onClick={() => item.itemType === 'idea' ? handleIdeaClick(item.id) : setSelectedNote(item as Note)}
                        className={`group flex items-start gap-2.5 p-2 rounded-lg ${getItemBackground()} ${getItemHoverBackground()} ${getBorderStyle()} transition-colors cursor-pointer relative`}
                      >
                        <div className={`shrink-0 p-1.5 rounded-lg ${item.itemType === 'idea' ? 'bg-[var(--color-idea)]/15' : 'bg-[var(--color-note)]/15'}`}>
                          {item.itemType === 'idea' ? (
                            <Lightbulb className="w-3.5 h-3.5 text-[var(--color-idea)]" />
                          ) : (
                            <Type className="w-3.5 h-3.5 text-[var(--color-note)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <h6 className="text-sm font-medium text-[var(--color-text)] truncate">
                            {item.title}
                          </h6>
                          <p className="text-xs text-[var(--color-textSecondary)]">
                            {item.itemType === 'idea' ? 'Idea' : 'Note'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (item.itemType === 'idea') {
                              onUnlinkIdea(item.id);
                            } else {
                              handleUnlinkNote(item.id);
                            }
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
                        className={`group flex items-start gap-2.5 p-2 rounded-lg ${getItemBackground()} ${getItemHoverBackground()} ${getBorderStyle()} transition-colors cursor-pointer relative`}
                      >
                        <div className="shrink-0 p-1.5 bg-[var(--color-task)]/15 rounded-lg">
                          <CheckSquare className="w-3.5 h-3.5 text-[var(--color-task)]" />
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <h6 className="text-sm font-medium text-[var(--color-text)] truncate">
                            {task.title}
                          </h6>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-[var(--color-textSecondary)]">
                              {task.status}
                            </p>
                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
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
          )}

          {/* Empty state - shown only when there are no linked items */}
          {!hasLinkedItems && (
            <div id="empty-state" className="flex flex-col items-center justify-center py-8 text-center px-6 mt-4">
              <div className={`p-3 ${getEmptyStateBackground()} rounded-full mb-3 ${getBorderStyle()}`}>
                <Link2 className="w-5 h-5 text-[var(--color-note)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text)] mb-1">
                No linked items yet
              </p>
              <p className="text-xs text-[var(--color-textSecondary)] max-w-[220px]">
                Connect this note with other notes, ideas, or tasks to build your knowledge network
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedNote && (
        <EditNoteModal
          note={selectedNote}
          isOpen={true}
          onClose={() => setSelectedNote(null)}
        />
      )}

      {selectedTask && (
        <EditTaskModal
          task={selectedTask}
          isOpen={true}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {selectedIdea && (
        <EditIdeaModal
          idea={selectedIdea}
          isOpen={true}
          onClose={() => setSelectedIdea(null)}
        />
      )}
    </>
  );
}
