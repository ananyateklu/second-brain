import { useState } from 'react';
import { X, Star, Trash2, Archive, Clock } from 'lucide-react';
import type { Note } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { WarningModal } from '../../../shared/WarningModal';

interface HeaderProps {
  idea: Note;
  onClose: () => void;
  onShowDeleteConfirm: () => void;
  isSaving?: boolean;
}

export function Header({ idea, onClose, onShowDeleteConfirm, isSaving = false }: HeaderProps) {
  const { toggleFavoriteNote, archiveNote } = useNotes();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowArchiveWarning(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShowDeleteConfirm();
  };

  const handleArchiveConfirm = async () => {
    try {
      await archiveNote(idea.id);
      onClose();
    } catch (error) {
      console.error('Failed to archive idea:', error);
    } finally {
      setShowArchiveWarning(false);
    }
  };

  return (
    <>
      <div className="shrink-0 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">
              Edit Idea
            </h2>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--color-textSecondary)]" />
              <span className="text-sm text-[var(--color-textSecondary)]">
                Last updated {new Date(idea.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavoriteNote(idea.id);
              }}
              disabled={isSaving}
              className={`p-1.5 rounded-lg transition-colors ${
                idea.isFavorite
                  ? 'text-amber-500 bg-amber-500/10'
                  : 'text-[var(--color-textSecondary)] hover:text-amber-500 hover:bg-amber-500/10'
              }`}
            >
              <Star className="w-5 h-5" fill={idea.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleArchiveClick}
              disabled={isSaving}
              className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
            >
              <Archive className="w-5 h-5" />
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <WarningModal
        isOpen={showArchiveWarning}
        onClose={() => setShowArchiveWarning(false)}
        onConfirm={handleArchiveConfirm}
        type="archive"
        title={idea.title}
      />
    </>
  );
}
