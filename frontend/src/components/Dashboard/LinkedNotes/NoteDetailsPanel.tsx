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

export function NoteDetailsPanel({ selectedNoteId, onClose }: NoteDetailsPanelProps) {
  const { colors, theme } = useTheme();
  const { notes, removeLink } = useNotes();
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  
  const note = notes.find(n => n.id === selectedNoteId);
  const isIdea = note?.tags?.includes('idea');

  const linkedItems = useMemo(() => {
    if (!note) return { notes: [], tasks: [] };
    
    const linkedNotes = (note.linkedNoteIds || [])
      .map(id => {
        const linkedNote = notes.find(n => n.id === id);
        if (!linkedNote) return null;
        return {
          ...linkedNote,
          isIdea: linkedNote.tags?.includes('idea'),
          type: 'note' as const
        };
      })
      .filter((n): n is (Note & { isIdea: boolean, type: 'note' }) => n !== null);

    const tasks = (note.linkedTasks || []).map((task: LinkedTask) => ({
      ...task,
      type: 'task' as const
    }));

    return {
      notes: linkedNotes,
      tasks
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
    <div className="h-full flex flex-col bg-[var(--color-surface)] border-l border-[var(--color-border)] overflow-hidden shadow-lg">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isIdea ? (
              <Lightbulb className="w-4 h-4" style={{ color: colors.idea }} />
            ) : (
              <Type className="w-4 h-4" style={{ color: colors.note }} />
            )}
            <h3 className="text-base font-medium text-[var(--color-text)]">
              Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--color-surface)]/80 transition-colors"
          >
            <X className="w-5 h-5 text-[var(--color-textSecondary)]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title and Content */}
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
            {note.title}
          </h2>
          <p className="text-[var(--color-textSecondary)]">
            {note.content}
          </p>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[var(--color-text)] mb-2">
              Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium max-w-full"
                  style={{ 
                    backgroundColor: theme === 'dark' ? `${colors.tag}20` : `${colors.tag}10`,
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
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-[var(--color-text)]">
              Connected Items ({linkedItems.notes.length + linkedItems.tasks.length})
            </h4>
            <button
              onClick={() => setShowAddLinkModal(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 rounded-lg transition-colors"
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
                      className="group relative p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg bg-[var(--color-surface)]`}>
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
                          className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)] rounded transition-opacity"
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
                      className="group relative p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-[var(--color-surface)]">
                          <CheckSquare className="w-4 h-4" style={{ color: colors.task }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium text-[var(--color-text)] truncate">
                            {task.title}
                          </h6>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)]`}>
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
                          className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)] rounded transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linkedItems.notes.length === 0 && linkedItems.tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Link2 className="w-8 h-8 text-[var(--color-textSecondary)] mb-2" />
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
