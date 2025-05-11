import { useState, useMemo } from 'react';
import { X, Link2, Tag, Plus, Type, Lightbulb, CheckSquare, Clock } from 'lucide-react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useIdeas } from '../../../contexts/ideasContextUtils';
import { formatDistanceToNow } from 'date-fns';
import { AddLinkModal } from './AddLinkModal';
import { Note, LinkedTask } from '../../../types/note';
import { Idea } from '../../../types/idea';
import { useTheme } from '../../../contexts/themeContextUtils';

interface NoteDetailsPanelProps {
  selectedNoteId: string;
  onClose: () => void;
}

type IconType = 'notes' | 'idea' | 'task' | 'reminder';

export function NoteDetailsPanel({ selectedNoteId, onClose }: NoteDetailsPanelProps) {
  const { colors, theme } = useTheme();
  const { notes, removeLink } = useNotes();
  const { state: { ideas }, removeLink: removeIdeaLink } = useIdeas();
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);

  // First check if the selected ID is a note
  const note = notes.find(n => n.id === selectedNoteId);
  // If not a note, check if it's an idea
  const idea = !note ? ideas.find(i => i.id === selectedNoteId) : null;

  // Determine if we're showing an idea or a note
  const isIdea = Boolean(idea);

  // Get the item to display (either a note or an idea)
  const item = note || idea;

  const getIconBg = (type: IconType) => {
    if (theme === 'light') {
      switch (type) {
        case 'notes':
          return 'bg-blue-100/50';
        case 'idea':
          return 'bg-amber-100/50';
        case 'task':
          return 'bg-emerald-100/50';
        case 'reminder':
          return 'bg-purple-100/50';
        default:
          return 'bg-gray-100/50';
      }
    } else if (theme === 'midnight') {
      switch (type) {
        case 'notes':
          return 'bg-blue-900/30';
        case 'idea':
          return 'bg-amber-900/30';
        case 'task':
          return 'bg-emerald-900/30';
        case 'reminder':
          return 'bg-purple-900/30';
        default:
          return 'bg-gray-900/30';
      }
    } else {
      switch (type) {
        case 'notes':
          return 'bg-blue-900/30';
        case 'idea':
          return 'bg-amber-900/30';
        case 'task':
          return 'bg-emerald-900/30';
        case 'reminder':
          return 'bg-purple-900/30';
        default:
          return 'bg-gray-900/30';
      }
    }
  };

  const linkedItems = useMemo(() => {
    if (!item) return { notes: [], ideas: [], tasks: [], reminders: [] };

    if (isIdea) {
      // For ideas, we use the linkedItems property
      const ideaItem = item as Idea;

      const linkedNotes = ideaItem.linkedItems
        .filter(linkedItem => linkedItem.type === 'Note')
        .map(linkedItem => {
          const foundNote = notes.find(n => n.id === linkedItem.id);
          if (!foundNote) return null;
          return {
            ...foundNote,
            type: 'note' as const
          };
        })
        .filter((n): n is (Note & { type: 'note' }) => n !== null);

      const linkedIdeas = ideaItem.linkedItems
        .filter(linkedItem => linkedItem.type === 'Idea')
        .map(linkedItem => {
          const foundIdea = ideas.find(i => i.id === linkedItem.id);
          if (!foundIdea) return null;
          return {
            ...foundIdea,
            type: 'idea' as const
          };
        })
        .filter((i): i is (Idea & { type: 'idea' }) => i !== null);

      // Ideas don't have tasks and reminders in the current data structure
      return {
        notes: linkedNotes,
        ideas: linkedIdeas,
        tasks: [],
        reminders: []
      };
    } else {
      // For notes, we use the existing logic
      const noteItem = item as Note;

      const linkedNotes = (noteItem.linkedNoteIds || [])
        .map(id => {
          const linkedNote = notes.find(n => n.id === id);
          if (!linkedNote) return null;
          return {
            ...linkedNote,
            type: 'note' as const
          };
        })
        .filter((n): n is (Note & { type: 'note' }) => n !== null);

      const tasks = (noteItem.linkedTasks || []).map((task: LinkedTask) => ({
        ...task,
        type: 'task' as const
      }));

      const reminders = (noteItem.linkedReminders || []).map((reminder) => ({
        ...reminder,
        type: 'reminder' as const
      }));

      return {
        notes: linkedNotes,
        ideas: [],
        tasks,
        reminders
      };
    }
  }, [item, isIdea, notes, ideas]);

  const handleUnlink = async (itemId: string, itemType: string) => {
    try {
      if (!selectedNoteId) return;

      if (isIdea) {
        // Use idea unlinking method
        await removeIdeaLink(selectedNoteId, itemId, itemType);
      } else {
        // Use note unlinking method
        await removeLink(selectedNoteId, itemId);
      }
    } catch (error) {
      console.error('Failed to unlink item:', error);
    }
  };

  if (!item) return null;

  return (
    <div className={`
      h-full flex flex-col overflow-hidden
      shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)] 
      dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
    `}>
      {/* Header */}
      <div className={`
        shrink-0 p-4
        ${theme === 'light'
          ? 'bg-[var(--color-surface)]/80 border-b border-[var(--color-border)]/50'
          : theme === 'midnight'
            ? 'bg-[#1e293b]/20 border-b border-white/[0.02]'
            : 'bg-[var(--color-surface)]/30 border-b border-white/[0.02]'
        }
        backdrop-blur-xl
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isIdea ? (
              <div className={`p-1.5 rounded-lg ${getIconBg('idea')}`}>
                <Lightbulb className="w-4 h-4" style={{ color: colors.idea }} />
              </div>
            ) : (
              <div className={`p-1.5 rounded-lg ${getIconBg('notes')}`}>
                <Type className="w-4 h-4" style={{ color: colors.note }} />
              </div>
            )}
            <h3 className="text-base font-medium text-[var(--color-text)]">
              Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`
              p-1.5 rounded-lg transition-colors
              hover:bg-[var(--color-surfaceHover)]
            `}
          >
            <X className="w-4 h-4 text-[var(--color-textSecondary)]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`
        flex-1 overflow-y-auto p-4 space-y-4
        ${theme === 'light'
          ? 'bg-[var(--color-surface)]/80'
          : theme === 'midnight'
            ? 'bg-[#0f172a]/30'
            : 'bg-[var(--color-surface)]/30'
        }
        backdrop-blur-xl
      `}>
        {/* Title and Content */}
        <div className={`
          p-4 rounded-lg shadow-sm
          ${theme === 'light'
            ? 'bg-[var(--color-surface)]/50 border border-[var(--color-border)]/40'
            : theme === 'midnight'
              ? 'bg-[#1e293b]/20 border border-white/[0.02]'
              : 'bg-[var(--color-surface)]/20 border border-white/[0.02]'
          }
          shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]
        `}>
          <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
            {item.title}
          </h2>
          <p className="text-[var(--color-textSecondary)]">
            {item.content}
          </p>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className={`
            p-4 rounded-lg shadow-sm
            ${theme === 'light'
              ? 'bg-[var(--color-surface)]/50 border border-[var(--color-border)]/40'
              : theme === 'midnight'
                ? 'bg-[#1e293b]/20 border border-white/[0.02]'
                : 'bg-[var(--color-surface)]/20 border border-white/[0.02]'
            }
            shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]
          `}>
            <h4 className="text-sm font-medium text-[var(--color-text)] mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[var(--color-textSecondary)]" />
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {item.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium max-w-full"
                  style={{
                    backgroundColor: `${colors.tag}10`,
                    color: colors.tag
                  }}
                >
                  <Tag className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{tag}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Connected Items */}
        <div className={`
          p-4 rounded-lg shadow-sm
          ${theme === 'light'
            ? 'bg-[var(--color-surface)]/50 border border-[var(--color-border)]/40'
            : theme === 'midnight'
              ? 'bg-[#1e293b]/20 border border-white/[0.02]'
              : 'bg-[var(--color-surface)]/20 border border-white/[0.02]'
          }
          shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]
        `}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-[var(--color-text)] flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[var(--color-textSecondary)]" />
              Connected Items ({linkedItems.notes.length + linkedItems.ideas.length + linkedItems.tasks.length + linkedItems.reminders.length})
            </h4>
            <button
              onClick={() => setShowAddLinkModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-[var(--color-accent)] bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Link
            </button>
          </div>

          <div className="space-y-3">
            {/* Notes Section */}
            {linkedItems.notes.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-[var(--color-textSecondary)] mb-2">Notes</h5>
                <div className="space-y-2">
                  {linkedItems.notes.map(linkedNote => (
                    <div
                      key={linkedNote.id}
                      className={`
                        group relative p-3 rounded-lg transition-all
                        ${theme === 'light'
                          ? 'bg-[var(--color-surface)]/30 border border-[var(--color-border)]/30'
                          : theme === 'midnight'
                            ? 'bg-[#0f172a]/20 border border-white/[0.02]'
                            : 'bg-[var(--color-surface)]/10 border border-white/[0.02]'
                        }
                        hover:border-[var(--color-accent)]/50
                        shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_4px_-2px_rgba(0,0,0,0.2)]
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${getIconBg('notes')}`}>
                          <Type className="w-4 h-4" style={{ color: colors.note }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium text-[var(--color-text)] truncate">
                            {linkedNote.title}
                          </h6>
                          {linkedNote.content && (
                            <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">
                              {linkedNote.content}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                              Note
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnlink(linkedNote.id, 'Note')}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-500 transition-all absolute right-2 top-2"
                          title="Unlink note"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ideas Section */}
            {linkedItems.ideas.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-[var(--color-textSecondary)] mb-2">Ideas</h5>
                <div className="space-y-2">
                  {linkedItems.ideas.map(linkedIdea => (
                    <div
                      key={linkedIdea.id}
                      className={`
                        group relative p-3 rounded-lg transition-all
                        ${theme === 'light'
                          ? 'bg-[var(--color-surface)]/30 border border-[var(--color-border)]/30'
                          : theme === 'midnight'
                            ? 'bg-[#0f172a]/20 border border-white/[0.02]'
                            : 'bg-[var(--color-surface)]/10 border border-white/[0.02]'
                        }
                        hover:border-[var(--color-accent)]/50
                        shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_4px_-2px_rgba(0,0,0,0.2)]
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${getIconBg('idea')}`}>
                          <Lightbulb className="w-4 h-4" style={{ color: colors.idea }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium text-[var(--color-text)] truncate">
                            {linkedIdea.title}
                          </h6>
                          {linkedIdea.content && (
                            <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">
                              {linkedIdea.content}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{
                              backgroundColor: `${colors.idea}10`,
                              color: colors.idea
                            }}>
                              Idea
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnlink(linkedIdea.id, 'Idea')}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-500 transition-all absolute right-2 top-2"
                          title="Unlink idea"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {linkedItems.tasks.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-[var(--color-textSecondary)] mb-2">Tasks</h5>
                <div className="space-y-2">
                  {linkedItems.tasks.map(task => (
                    <div
                      key={task.id}
                      className={`
                        group relative p-3 rounded-lg transition-all
                        ${theme === 'light'
                          ? 'bg-[var(--color-surface)]/30 border border-[var(--color-border)]/30'
                          : theme === 'midnight'
                            ? 'bg-[#0f172a]/20 border border-white/[0.02]'
                            : 'bg-[var(--color-surface)]/10 border border-white/[0.02]'
                        }
                        hover:border-[var(--color-accent)]/50
                        shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_4px_-2px_rgba(0,0,0,0.2)]
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${getIconBg('task')}`}>
                          <CheckSquare className="w-4 h-4" style={{ color: colors.task || '#10b981' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium text-[var(--color-text)] truncate">
                            {task.title}
                          </h6>
                          {task.description && (
                            <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                              {task.status === 'completed' ? 'Completed' : 'Active'}
                            </span>
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnlink(task.id, 'Task')}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-500 transition-all absolute right-2 top-2"
                          title="Unlink task"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reminders Section */}
            {linkedItems.reminders.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-[var(--color-textSecondary)] mb-2">Reminders</h5>
                <div className="space-y-2">
                  {linkedItems.reminders.map(reminder => (
                    <div
                      key={reminder.id}
                      className={`
                        group relative p-3 rounded-lg transition-all
                        ${theme === 'light'
                          ? 'bg-[var(--color-surface)]/30 border border-[var(--color-border)]/30'
                          : theme === 'midnight'
                            ? 'bg-[#0f172a]/20 border border-white/[0.02]'
                            : 'bg-[var(--color-surface)]/10 border border-white/[0.02]'
                        }
                        hover:border-[var(--color-accent)]/50
                        shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_4px_-2px_rgba(0,0,0,0.2)]
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${getIconBg('reminder')}`}>
                          <Clock className="w-4 h-4" style={{ color: colors.reminder || '#9333ea' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium text-[var(--color-text)] truncate">
                            {reminder.title}
                          </h6>
                          {reminder.description && (
                            <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">
                              {reminder.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(reminder.dueDateTime), { addSuffix: true })}
                            </span>
                            {reminder.isCompleted && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                                Completed
                              </span>
                            )}
                            {reminder.isSnoozed && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                                Snoozed
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnlink(reminder.id, 'Reminder')}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-500 transition-all absolute right-2 top-2"
                          title="Unlink reminder"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No items message */}
            {linkedItems.notes.length === 0 && linkedItems.ideas.length === 0 && linkedItems.tasks.length === 0 && linkedItems.reminders.length === 0 && (
              <div className="text-center py-4">
                <p className="text-[var(--color-textSecondary)]">No connected items yet</p>
                <p className="text-sm text-[var(--color-textTertiary)] mt-1">
                  Click "Add Link" to connect this {isIdea ? 'idea' : 'note'} with other items
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Link Modal */}
        <AddLinkModal
          isOpen={showAddLinkModal}
          onClose={() => setShowAddLinkModal(false)}
          sourceId={selectedNoteId}
          onLinkAdded={() => setShowAddLinkModal(false)}
          sourceType={isIdea ? 'idea' : 'note'}
        />
      </div>
    </div>
  );
}
