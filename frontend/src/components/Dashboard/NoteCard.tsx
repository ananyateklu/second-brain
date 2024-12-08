import { useState } from 'react';
import { Clock, Tag as TagIcon, Star, Pin, FileText, Archive, Link2, CheckSquare } from 'lucide-react';
import { useNotes } from '../../contexts/notesContextUtils';
import { WarningModal } from '../shared/WarningModal';
import { formatDate } from '../../utils/dateUtils';
import { Note } from '../../types/note';
import { formatTimeAgo } from './Recent/utils';
import { useTheme } from '../../contexts/themeContextUtils';

interface NoteCardProps {
  note: Note;
  viewMode?: 'grid' | 'list' | 'mindMap';
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

export function NoteCard({ 
  note, 
  viewMode = 'grid', 
  isSelected,
  context = 'default',
  onSelect,
  onClick,
  contextData 
}: NoteCardProps) {
  const { toggleFavoriteNote, togglePinNote, archiveNote } = useNotes();
  const { theme } = useTheme();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);

  const isDark = theme === 'dark' || theme === 'midnight';

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteNote(note.id);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      togglePinNote(note.id);
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
      archiveNote(note.id);
      setShowArchiveWarning(false);
    } catch (error) {
      console.error('Failed to archive note:', error);
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

  // Calculate visible and remaining items for tags
  const MAX_VISIBLE_ITEMS = viewMode === 'list' ? 8 : 7;
  const tags = note.tags || [];
  const visibleTags = tags.slice(0, MAX_VISIBLE_ITEMS);
  const remainingCount = Math.max(0, tags.length - MAX_VISIBLE_ITEMS);

  const getTagColorClasses = () => {
    return isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600';
  };

  const renderTags = () => (
    tags.length > 0 && (
      <div className={`
        flex flex-wrap gap-1
        ${viewMode === 'list' ? 'items-center' : 'items-start'}
        ${viewMode === 'grid' ? 'max-h-[44px]' : ''}
      `}>
        {visibleTags.map(tag => (
          <span
            key={tag}
            className={`
              inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap
              ${getTagColorClasses()}
            `}
          >
            <TagIcon className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{tag}</span>
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-800 text-gray-400 whitespace-nowrap">
            +{remainingCount} more
          </span>
        )}
      </div>
    )
  );

  const renderMetadata = () => (
    <div className="flex items-center gap-2 text-[11px] text-[var(--color-textSecondary)]">
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>{formatDate(note.updatedAt)}</span>
      </div>
      {note.linkedNoteIds && note.linkedNoteIds.length > 0 && (
        <div className="flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          <span>{note.linkedNoteIds.length} linked</span>
        </div>
      )}
      {note.linkedTasks && note.linkedTasks.length > 0 && (
        <div className="flex items-center gap-1">
          <CheckSquare className="w-3 h-3" />
          <span>{note.linkedTasks.length} tasks</span>
        </div>
      )}
      {note.linkedReminders && note.linkedReminders.length > 0 && (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{note.linkedReminders.length} reminders</span>
        </div>
      )}
    </div>
  );

  const renderContextInfo = () => {
    if (context === 'trash' && contextData?.deletedAt) {
      return (
        <div className="flex items-center gap-2 text-[11px] text-red-500">
          <Clock className="w-3 h-3" />
          <span>Deleted {formatTimeAgo(contextData.deletedAt)}</span>
          {getDaysUntilExpiration() !== null && (
            <span className="text-red-600 dark:text-red-400">
              ({getDaysUntilExpiration()}d left)
            </span>
          )}
        </div>
      );
    }
    if (context === 'archive' && contextData?.archivedAt) {
      return (
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-textSecondary)]">
          <Archive className="w-3 h-3" />
          <span>Archived {formatTimeAgo(contextData.archivedAt)}</span>
        </div>
      );
    }
    return null;
  };

  const getPinButtonClasses = () => {
    if (note.isPinned) {
      return isDark ? 'bg-[#64AB6F]/10 text-[#64AB6F]' : 'bg-[#059669]/10 text-[#059669]';
    }
    return 'hover:bg-gray-100 dark:hover:bg-gray-800';
  };

  const getFavoriteButtonClasses = () => {
    if (note.isFavorite) {
      return isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600';
    }
    return 'hover:bg-gray-100 dark:hover:bg-gray-800';
  };

  const renderActions = () => (
    context === 'default' && (
      <div className="flex gap-1">
        <button
          onClick={handlePin}
          className={`p-1.5 rounded-lg transition-colors ${getPinButtonClasses()}`}
          title={note.isPinned ? 'Unpin note' : 'Pin note'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleFavorite}
          className={`p-1.5 rounded-lg transition-colors ${getFavoriteButtonClasses()}`}
          title={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleArchiveClick}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Archive note"
        >
          <Archive className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
    )
  );

  if (viewMode === 'mindMap') {
    return (
      <div 
        onClick={handleCardClick}
        className={`
          relative group
          w-[160px]
          ${onSelect || onClick ? 'cursor-pointer' : ''}
          bg-white/90 dark:bg-gray-900/90
          border border-blue-200/30 dark:border-blue-700/30
          hover:border-blue-400/50 dark:hover:border-blue-500/50
          rounded-xl
          transition-all duration-200
          overflow-hidden
          backdrop-blur-sm
          ${isSelected ? 'ring-2 ring-blue-400/50 dark:ring-blue-500/50' : ''}
          min-h-[90px] max-h-[90px]
          hover:shadow-lg hover:shadow-blue-900/5
          hover:-translate-y-0.5
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/20 dark:to-transparent opacity-50" />
        
        <div className="p-2 h-full flex flex-col gap-1.5 relative">
          <div className="flex items-start gap-1.5">
            <div className="flex-shrink-0 p-1 rounded-lg bg-blue-100/80 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <FileText className="w-3 h-3" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate leading-tight">
                {note.title}
              </h3>
              {note.content && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                  {note.content}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              {note.isPinned && (
                <Pin className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              )}
              {note.isFavorite && (
                <Star className="w-3 h-3 text-amber-400 dark:text-amber-500 fill-current" />
              )}
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-1.5">
            {((note.linkedNoteIds?.length ?? 0) > 0 || 
              (note.linkedTasks?.length ?? 0) > 0 || 
              (note.linkedReminders?.length ?? 0) > 0) && (
              <div className="flex items-center gap-2">
                {note.linkedNoteIds && note.linkedNoteIds.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Link2 className="w-2.5 h-2.5" />
                    <span>{note.linkedNoteIds.length}</span>
                  </div>
                )}
                {note.linkedTasks && note.linkedTasks.length > 0 && (
                  <div className="flex items-center gap-1">
                    <CheckSquare className="w-2.5 h-2.5" />
                    <span>{note.linkedTasks.length}</span>
                  </div>
                )}
                {note.linkedReminders && note.linkedReminders.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{note.linkedReminders.length}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`
          relative group
          w-full
          ${onSelect || onClick ? 'cursor-pointer' : ''}
          bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]
          border border-[var(--color-border)]
          hover:border-blue-400/50
          rounded-lg
          transition-all duration-200
          overflow-hidden
          ${isSelected ? 'ring-2 ring-blue-400/50' : ''}
          ${viewMode === 'list' ? 'min-h-[64px]' : 'h-[180px]'}
        `}
      >
        {viewMode === 'list' ? (
          // List View Layout
          <div className="px-3 py-2.5 h-full flex gap-3">
            {context === 'trash' && onSelect && (
              <div className="flex items-start pt-1.5">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect()}
                  className="w-4 h-4 text-primary-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                />
              </div>
            )}
            <div className="flex items-start pt-1">
              <div className="flex-shrink-0 p-1.5 rounded bg-blue-50/50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-[var(--color-text)] truncate">
                    {note.title}
                  </h3>
                  {note.content && (
                    <p className="text-xs text-[var(--color-textSecondary)] line-clamp-1">
                      {note.content}
                    </p>
                  )}
                  {renderContextInfo()}
                </div>
                <div className="flex-shrink-0 ml-4">
                  {renderActions()}
                </div>
              </div>

              <div className="flex items-end justify-between pt-1">
                <div className="min-w-0 flex-1">
                  {renderTags()}
                </div>
                <div className="flex-shrink-0 ml-4">
                  {renderMetadata()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Grid View Layout
          <div className="p-3 h-full flex flex-col">
            <div className="flex items-start gap-2">
              {context === 'trash' && onSelect && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect()}
                  className="w-4 h-4 mt-1 text-primary-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                />
              )}
              <div className="flex-shrink-0 p-1.5 mt-0.5 rounded bg-blue-50/50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-[var(--color-text)] truncate">
                    {note.title}
                  </h3>
                  {renderActions()}
                </div>
                {note.content && (
                  <p className="mt-1 text-xs text-[var(--color-textSecondary)] line-clamp-3">
                    {note.content}
                  </p>
                )}
                {renderContextInfo()}
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end space-y-2">
              {renderTags()}
              <div className="pt-2 border-t border-gray-700/30">
                {renderMetadata()}
              </div>
            </div>
          </div>
        )}
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