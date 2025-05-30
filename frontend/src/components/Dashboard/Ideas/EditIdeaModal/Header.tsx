import { useState } from 'react';
import { X, Star, Trash2, Archive, Clock } from 'lucide-react';
import type { Idea } from '../../../../types/idea';
import { useIdeas } from '../../../../contexts/ideasContextUtils';
import { WarningModal } from '../../../shared/WarningModal';
import { useTheme } from '../../../../contexts/themeContextUtils';

export interface HeaderProps {
  idea: Idea;
  onClose: () => void;
  onShowDeleteConfirm: () => void;
}

export function Header({ idea, onClose, onShowDeleteConfirm }: HeaderProps) {
  const { toggleFavorite, toggleArchive } = useIdeas();
  const { theme } = useTheme();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const getBorderStyle = () => {
    if (theme === 'midnight') return 'border-white/5';
    if (theme === 'dark') return 'border-gray-700/30';
    return 'border-[var(--color-border)]';
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(idea.id);
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
      await toggleArchive(idea.id);
      onClose();
    } catch (error) {
      console.error('Failed to archive idea:', error);
      setShowArchiveWarning(false);
    }
  };

  return (
    <>
      <div className={`shrink-0 flex items-center justify-between px-4 py-3 border-b ${getBorderStyle()} bg-[var(--color-surface)]`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[var(--color-idea)]/10 rounded-lg">
            <Clock className="w-5 h-5 text-[var(--color-idea)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              Edit Idea
            </h2>
            <p className="text-xs text-[var(--color-textSecondary)]">
              Last updated {new Date(idea.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFavorite}
            className={`p-1.5 rounded-lg transition-colors ${idea.isFavorite
              ? 'text-amber-400 bg-amber-900/20'
              : 'text-[var(--color-textSecondary)] hover:text-amber-400 hover:bg-[var(--color-surfaceHover)]'
              }`}
          >
            <Star className="w-4.5 h-4.5" fill={idea.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleArchiveClick}
            className="p-1.5 text-[var(--color-textSecondary)] hover:text-[var(--color-idea)] hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
            title="Archive idea"
          >
            <Archive className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1.5 text-[var(--color-textSecondary)] hover:text-red-400 hover:bg-[var(--color-surfaceHover)] rounded-lg transition-colors"
            title="Delete idea"
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
        title={idea.title}
      />
    </>
  );
}
