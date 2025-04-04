import { useState, useMemo } from 'react';
import { X, Link2, Tag, Plus, Type, Lightbulb, CheckSquare, Clock } from 'lucide-react';
import { useNotes } from '../../../contexts/notesContextUtils';
import { formatDistanceToNow } from 'date-fns';
import { AddLinkModal } from './AddLinkModal';
import { Note, LinkedTask } from '../../../types/note';
import { useTheme } from '../../../contexts/themeContextUtils';

interface NoteDetailsPanelProps {
  selectedNoteId: string;
  onClose: () => void;
}

type IconType = 'notes' | 'idea' | 'task' | 'reminder';

export function NoteDetailsPanel({ selectedNoteId, onClose }: NoteDetailsPanelProps) {
  const { colors, theme } = useTheme();
  const { notes, removeLink } = useNotes();
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);

  const note = notes.find(n => n.id === selectedNoteId);
  const isIdea = note?.isIdea;

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
    if (!note) return { notes: [], tasks: [], reminders: [] };

    const linkedNotes = (note.linkedNoteIds || [])
      .map(id => {
        const linkedNote = notes.find(n => n.id === id);
        if (!linkedNote) return null;
        return {
          ...linkedNote,
          type: 'note' as const
        };
      })
      .filter((n): n is (Note & { type: 'note' }) => n !== null);

    const tasks = (note.linkedTasks || []).map((task: LinkedTask) => ({
      ...task,
      type: 'task' as const
    }));

    const reminders = (note.linkedReminders || []).map((reminder) => ({
      ...reminder,
      type: 'reminder' as const
    }));

    return {
      notes: linkedNotes,
      tasks,
      reminders
    };
  }, [note, notes]);

  const handleUnlink = async (itemId: string) => {
    try {
      if (!selectedNoteId) return;
      await removeLink(selectedNoteId, itemId);
    } catch (error) {
      console.error('Failed to unlink item:', error);
    }
  };

  if (!note) return null;

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
            {note.title}
          </h2>
          <p className="text-[var(--color-textSecondary)]">
            {note.content}
          </p>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
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
              {note.tags.map(tag => (
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
              Connected Items ({linkedItems.notes.length + linkedItems.tasks.length + linkedItems.reminders.length})
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
                        <div className={`p-1.5 rounded-lg ${linkedNote.isIdea
                          ? getIconBg('idea')
                          : getIconBg('notes')
                          }`}>
                          {linkedNote.isIdea ? (
                            <Lightbulb className="w-4 h-4" style={{ color: colors.idea }} />
                          ) : (
                            <Type className="w-4 h-4" style={{ color: colors.note }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium text-[var(--color-text)] truncate">
                            {linkedNote.title}
                          </h6>
                          <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">
                            {linkedNote.content}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnlink(linkedNote.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-lg transition-all"
                        >
                          <X className="w-4 h-4" />
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
                          <CheckSquare className="w-4 h-4" style={{ color: colors.task }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium text-[var(--color-text)] truncate">
                            {task.title}
                          </h6>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                              {task.status}
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
                          onClick={() => handleUnlink(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-lg transition-all"
                        >
                          <X className="w-4 h-4" />
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
                          onClick={() => handleUnlink(reminder.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-lg transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linkedItems.notes.length === 0 && linkedItems.tasks.length === 0 && linkedItems.reminders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className={`
                  p-2 rounded-lg mb-3
                  ${theme === 'light'
                    ? 'bg-[var(--color-surface)]/30'
                    : theme === 'midnight'
                      ? 'bg-[#0f172a]/20'
                      : 'bg-[var(--color-surface)]/10'
                  }
                  shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_4px_-2px_rgba(0,0,0,0.2)]
                `}>
                  <Link2 className="w-6 h-6 text-[var(--color-textSecondary)]" />
                </div>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  No connected items yet
                </p>
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  Click "Add Link" to connect with notes, ideas, or tasks
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddLinkModal
        isOpen={showAddLinkModal}
        onClose={() => setShowAddLinkModal(false)}
        sourceNoteId={selectedNoteId}
        onLinkAdded={() => setShowAddLinkModal(false)}
      />
    </div>
  );
}
