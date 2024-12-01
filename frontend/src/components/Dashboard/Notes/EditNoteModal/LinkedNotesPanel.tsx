import { Link2, Plus, Type, Lightbulb, CheckSquare, X, Calendar } from 'lucide-react';
import { Note, useNotes } from '../../../../contexts/NotesContext';

interface LinkedNotesPanelProps {
  readonly linkedNotes: Note[];
  readonly linkedTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
  }>;
  readonly onShowAddLink: () => void;
  readonly onShowAddTask: () => void;
  readonly currentNoteId: string;
  readonly isIdea?: boolean;
  readonly onUnlinkTask?: (taskId: string) => void;
}

export function LinkedNotesPanel({ 
  linkedNotes, 
  linkedTasks = [],
  onShowAddLink, 
  onShowAddTask,
  currentNoteId,
  isIdea = false,
  onUnlinkTask
}: LinkedNotesPanelProps) {
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

  return (
    <div className="border-l border-gray-200/30 dark:border-gray-700/30 flex flex-col min-h-0">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200/30 dark:border-gray-700/30 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Connections
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShowAddTask}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Task
            </button>
            <button
              type="button"
              onClick={onShowAddLink}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Note
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
        {linkedNotes.length > 0 || linkedTasks.length > 0 ? (
          <>
            {/* Linked Notes Section */}
            {linkedNotes.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                  Notes & Ideas
                </h4>
                {linkedNotes.map(linkedNote => (
                  <div
                    key={linkedNote.id}
                    className="group relative p-3 rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 p-1.5 rounded-lg ${
                        linkedNote.isIdea 
                          ? 'bg-amber-100 dark:bg-amber-900/30' 
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        {linkedNote.isIdea ? (
                          <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h6 className="font-medium text-gray-900 dark:text-white truncate">
                            {linkedNote.title}
                          </h6>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUnlinkNote(linkedNote.id);
                            }}
                            className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                          {linkedNote.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Linked Tasks Section */}
            {linkedTasks.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                  Tasks
                </h4>
                {linkedTasks.map(task => (
                  <div
                    key={task.id}
                    className="group relative p-3 rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h6 className="font-medium text-gray-900 dark:text-white truncate">
                            {task.title}
                          </h6>
                          {onUnlinkTask && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onUnlinkTask(task.id);
                              }}
                              className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                            task.status === 'Completed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {task.status}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                            task.priority === 'high'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : task.priority === 'medium'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Link2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No connections yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Click "+ Task" or "+ Note" to add connections
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
