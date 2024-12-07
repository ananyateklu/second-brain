import { Star, Link2, Tag as TagIcon, Lightbulb, Archive, Pin, CheckSquare, Clock } from 'lucide-react';
import type { Note } from '../../../types/note';
import { formatDate } from '../../../utils/dateUtils';
import { useNotes } from '../../../contexts/notesContextUtils';
import { useState } from 'react';
import { WarningModal } from '../../shared/WarningModal';
import { formatTimeAgo } from '../Recent/utils';
import { cardBaseStyles, cardContentStyles, cardDescriptionStyles } from '../shared/cardStyles';

interface IdeaCardProps {
  idea: Note;
  viewMode?: 'grid' | 'list';
  isSelected?: boolean;
  context?: 'default' | 'trash' | 'archive' | 'favorites';
  onSelect?: () => void;
  onClick?: () => void;
  contextData?: {
    expiresAt?: string;
    deletedAt?: string;
    archivedAt?: string;
  };
}

export function IdeaCard({ 
  idea, 
  viewMode = 'grid', 
  isSelected,
  context = 'default',
  onSelect,
  onClick,
  contextData 
}: IdeaCardProps) {
  const { toggleFavoriteNote, togglePinNote, archiveNote } = useNotes();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteNote(idea.id);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      togglePinNote(idea.id);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowArchiveWarning(true);
  };

  const handleArchiveConfirm = () => {
    try {
      archiveNote(idea.id);
      setShowArchiveWarning(false);
    } catch (error) {
      console.error('Failed to archive idea:', error);
      setShowArchiveWarning(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.stopPropagation();
      onSelect();
    } else if (onClick) {
      onClick();
    }
  };

  // Calculate days until expiration for trash items
  const getDaysUntilExpiration = () => {
    if (contextData?.expiresAt) {
      return Math.ceil(
        (new Date(contextData.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }
    return null;
  };

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`
          ${cardBaseStyles}
          bg-amber-50/5 dark:bg-amber-900/5
          ${isSelected 
            ? 'border-primary-400/50 dark:border-primary-400/50' 
            : 'border-gray-200/30 dark:border-gray-700/30'
          }
          hover:border-primary-400/50 dark:hover:border-primary-400/50
          ${viewMode === 'list' ? 'w-full' : ''}
          ${onSelect || onClick ? 'cursor-pointer' : ''}
        `}
      >
        <div className={cardContentStyles}>
          <div className="flex items-start gap-4">
            {context === 'trash' && onSelect && (
              <div className="flex-shrink-0 pt-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect()}
                  className="w-4 h-4 text-primary-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400">
                  <Lightbulb className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                      {idea.title}
                    </h3>
                    {context === 'trash' && getDaysUntilExpiration() !== null && (
                      <span className="flex-shrink-0 text-sm text-red-600 dark:text-red-400 whitespace-nowrap">
                        {getDaysUntilExpiration()}d left
                      </span>
                    )}
                  </div>
                  {context === 'trash' && contextData?.deletedAt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Deleted {formatTimeAgo(contextData.deletedAt)}
                    </p>
                  )}
                  {context === 'archive' && contextData?.archivedAt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Archived {formatTimeAgo(contextData.archivedAt)}
                    </p>
                  )}
                </div>

                {context === 'default' && (
                  <div className="flex gap-2">
                    <button
                      onClick={handlePin}
                      className={`p-1.5 rounded-lg transition-colors ${idea.isPinned
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title={idea.isPinned ? 'Unpin idea' : 'Pin idea'}
                    >
                      <Pin className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={handleFavorite}
                      className={`p-1.5 rounded-lg transition-colors ${idea.isFavorite
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title={idea.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={handleArchiveClick}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Archive idea"
                    >
                      <Archive className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>

              {idea.content ? (
                <p className={cardDescriptionStyles}>
                  {idea.content}
                </p>
              ) : (
                <p className={`${cardDescriptionStyles} italic opacity-50`}>
                  No description
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {idea.linkedNoteIds && idea.linkedNoteIds.length > 0 && (
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Link2 className="w-4 h-4" />
                    <span>{idea.linkedNoteIds.length} linked</span>
                  </div>
                )}
                
                {idea.linkedTasks && idea.linkedTasks.length > 0 && (
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <CheckSquare className="w-4 h-4" />
                    <span>{idea.linkedTasks.length} tasks</span>
                  </div>
                )}

                {idea.linkedReminders && idea.linkedReminders.length > 0 && (
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{idea.linkedReminders.length} reminders</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(idea.updatedAt)}</span>
                </div>
              </div>

              {idea.tags && idea.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {idea.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 max-w-full"
                    >
                      <TagIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{tag}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
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