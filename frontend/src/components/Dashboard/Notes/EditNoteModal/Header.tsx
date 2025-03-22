import { useState } from 'react';
import { X, Type, Star, Archive, Trash2 } from 'lucide-react';
import type { Note } from '../../../../types/note';
import { useNotes } from '../../../../contexts/notesContextUtils';
import { WarningModal } from '../../../shared/WarningModal';

export interface HeaderProps {
  note: Note;
  onClose: () => void;
  onShowDeleteConfirm: () => void;
}

export function Header({ note, onClose, onShowDeleteConfirm }: HeaderProps) {
  const { toggleFavoriteNote, archiveNote } = useNotes();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteNote(note.id);
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
      await archiveNote(note.id);
      onClose();
    } catch (error) {
      console.error('Failed to archive note:', error);
      setShowArchiveWarning(false);
    }
  };

  return (
    <>
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[var(--color-note)]/10 rounded-lg">
            <Type className="w-5 h-5 text-[var(--color-note)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              Edit Note
            </h2>
            <p className="text-xs text-[var(--color-textSecondary)]">
              Last updated {new Date(note.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFavorite}
            className={`p-1.5 rounded-lg transition-colors ${note.isFavorite
              ? 'text-amber-400 bg-amber-900/20'
              : 'text-[var(--color-textSecondary)] hover:text-amber-400 hover:bg-[var(--color-surfaceHover)]'
              }`}
          >
            <Star className="w-4.5 h-4.5" fill={note.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleArchiveClick}
            className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-note)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
            title="Archive note"
          >
            <Archive className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1.5 text-[var(--color-textSecondary)] hover:text-red-400 hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <WarningModal
        isOpen={showArchiveWarning}
        onClose={() => setShowArchiveWarning(false)}
        onConfirm={handleArchiveConfirm}
        type="archive"
        title={note.title}
      />
    </>
  );
}