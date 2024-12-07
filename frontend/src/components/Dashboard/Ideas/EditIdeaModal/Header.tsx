import { useState } from 'react';
import { X, Star, Trash2, Archive, Clock } from 'lucide-react';
import type { Note } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { WarningModal } from '../../../shared/WarningModal';

export interface HeaderProps {
  idea: Note;
  onClose: () => void;
  onShowDeleteConfirm: () => void;
}

export function Header({ idea, onClose, onShowDeleteConfirm }: HeaderProps) {
  const { toggleFavoriteNote, archiveNote } = useNotes();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteNote(idea.id);
  };

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
      setShowArchiveWarning(false);
      await archiveNote(idea.id);
      onClose();
    } catch (error) {
      console.error('Failed to archive idea:', error);
      setShowArchiveWarning(false);
    }
  };

  return (
    <>
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--color-idea)]/10 rounded-lg">
            <Clock className="w-6 h-6 text-[var(--color-idea)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              Edit Idea
            </h2>
            <p className="text-sm text-[var(--color-textSecondary)]">
              Last updated {new Date(idea.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFavorite}
            className={`p-2 rounded-lg transition-colors ${
              idea.isFavorite
                ? 'text-amber-400 bg-amber-900/20'
                : 'text-[var(--color-textSecondary)] hover:text-amber-400 hover:bg-[var(--color-surface)]'
            }`}
          >
            <Star className="w-5 h-5" fill={idea.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleArchiveClick}
            className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
            title="Archive idea"
          >
            <Archive className="w-5 h-5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 text-[var(--color-textSecondary)] hover:text-red-400 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
            title="Delete idea"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
