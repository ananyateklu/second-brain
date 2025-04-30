import { useState, useMemo, useCallback, memo } from 'react';
import { Clock, Tag as TagIcon, Star, Pin, FileText, Archive, Link2, CheckSquare } from 'lucide-react';
import { useNotes } from '../../contexts/notesContextUtils';
import { formatDate } from '../../utils/dateUtils';
import { Note } from '../../types/note';
import { formatTimeAgo } from './Recent/utils';
import { useTheme } from '../../contexts/themeContextUtils';
import { getIconBg } from '../../utils/dashboardUtils';
import { WarningModal } from '../shared/WarningModal';

interface NoteCardProps {
  note: Note;
  viewMode?: 'grid' | 'list' | 'mindMap';
  isSelected?: boolean;
  context?: 'default' | 'trash' | 'archive' | 'favorites' | 'duplicate';
  onSelect?: () => void;
  onClick?: () => void;
  isArchiveView?: boolean;
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
  isArchiveView,
  contextData
}: NoteCardProps) {
  const { toggleFavoriteNote, togglePinNote, archiveNote } = useNotes();
  const { theme } = useTheme();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [isSafari] = useState(() => /^((?!chrome|android).)*safari/i.test(navigator.userAgent));

  const isDark = useMemo(() => theme === 'dark' || theme === 'midnight' || theme === 'full-dark', [theme]);

  const containerClasses = useMemo(() => {
    function getBackgroundColor() {
      if (theme === 'dark') return 'bg-gray-900/30';
      if (theme === 'midnight') {
        return isSafari ? 'bg-[var(--note-bg-color)] bg-opacity-[var(--note-bg-opacity,0.3)]' : 'bg-[#1e293b]/30';
      }
      return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    }

    const base = `
      relative group w-full
      ${isSelected ? 'ring-2 ring-[var(--color-accent)] rounded-lg' : ''}
      ${getBackgroundColor()} 
      backdrop-blur-xl 
      border border-[color:var(--color-border)]
      hover:border-blue-400/50 dark:hover:border-blue-500/50
      transition-all duration-300 
      rounded-lg
      shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.08)]
      dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),0_4px_8px_-2px_rgba(0,0,0,0.3)]
      hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.2),0_6px_12px_-4px_rgba(0,0,0,0.15)]
      dark:hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),0_6px_12px_-4px_rgba(0,0,0,0.4)]
      hover:ring-black/10 dark:hover:ring-white/20
      ${onSelect || onClick ? 'cursor-pointer hover:-translate-y-1 hover:scale-[1.02]' : ''}
    `;
    return base.trim();
  }, [isSelected, theme, onSelect, onClick, isSafari]);

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteNote(note.id);
  }, [toggleFavoriteNote, note.id]);

  const handlePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinNote(note.id);
  }, [togglePinNote, note.id]);

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowArchiveWarning(true);
  }, []);

  const handleArchiveConfirm = useCallback(() => {
    archiveNote(note.id);
    setShowArchiveWarning(false);
  }, [archiveNote, note.id]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (onSelect) {
      e.stopPropagation();
      onSelect();
    } else if (onClick) {
      onClick();
    }
  }, [onSelect, onClick]);

  const getDaysUntilExpiration = useCallback(() => {
    if (contextData?.expiresAt) {
      return Math.ceil(
        (new Date(contextData.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }
    return null;
  }, [contextData?.expiresAt]);

  const tags = useMemo(() => note.tags || [], [note.tags]);
  const MAX_VISIBLE_ITEMS = viewMode === 'list' ? 8 : 7;
  const visibleTags = useMemo(() => tags.slice(0, MAX_VISIBLE_ITEMS), [tags, MAX_VISIBLE_ITEMS]);
  const remainingCount = useMemo(() => Math.max(0, tags.length - MAX_VISIBLE_ITEMS), [tags.length, MAX_VISIBLE_ITEMS]);

  const tagClasses = useMemo(() => (
    isDark
      ? 'bg-[var(--color-note)]/20 text-[var(--color-note)] ring-1 ring-white/10'
      : 'bg-[var(--color-note)]/10 text-[var(--color-note)] ring-1 ring-black/5'
  ), [isDark]);

  const pinButtonClasses = useMemo(() => {
    if (note.isPinned) {
      return isDark ? 'bg-[#64AB6F]/10 text-[#64AB6F]' : 'bg-[#059669]/10 text-[#059669]';
    }
    return 'hover:bg-gray-100 dark:hover:bg-gray-800';
  }, [note.isPinned, isDark]);

  const favoriteButtonClasses = useMemo(() => {
    if (note.isFavorite) {
      return isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600';
    }
    return 'hover:bg-gray-100 dark:hover:bg-gray-800';
  }, [note.isFavorite, isDark]);

  const contextInfoMemo = useMemo(() => (
    <MemoizedContextInfo
      context={context}
      contextData={contextData}
      getDaysUntilExpiration={getDaysUntilExpiration}
    />
  ), [context, contextData, getDaysUntilExpiration]);

  const metadataMemo = useMemo(() => (
    <MemoizedMetadata
      note={note}
    />
  ), [note]);

  const smallMetadataMemo = useMemo(() => (
    <MemoizedSmallMetadata note={note} />
  ), [note]);

  const tagsMemo = useMemo(() => (
    <TagList
      visibleTags={visibleTags}
      remainingCount={remainingCount}
      tagClasses={tagClasses}
    />
  ), [visibleTags, remainingCount, tagClasses]);

  const actionsMemo = useMemo(() => (
    <Actions
      context={context}
      handlePin={handlePin}
      handleFavorite={handleFavorite}
      handleArchiveClick={handleArchiveClick}
      pinButtonClasses={pinButtonClasses}
      favoriteButtonClasses={favoriteButtonClasses}
      note={note}
      isArchiveView={isArchiveView}
    />
  ), [context, handlePin, handleFavorite, handleArchiveClick, pinButtonClasses, favoriteButtonClasses, note, isArchiveView]);

  if (viewMode === 'mindMap') {
    return (
      <div
        onClick={handleCardClick}
        className={`${containerClasses} w-[160px] min-h-[90px] max-h-[90px]`}
      >
        <div className="p-2 h-full flex flex-col gap-1.5 relative">
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-start gap-1.5 flex-1 min-w-0">
              <div className={`flex-shrink-0 p-1 rounded-lg ${getIconBg('notes')} text-[var(--color-note)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)] ring-1 ring-black/5 dark:ring-white/10 transition-shadow duration-200`}>
                <FileText className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-[var(--color-text)] truncate leading-tight">
                  {note.title}
                </h3>
                {note.content && (
                  <p className="text-[9px] text-[var(--color-textSecondary)] truncate mt-0.5 max-w-[90px]">
                    {note.content.slice(0, 50)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {note.isPinned && <Pin className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />}
              {note.isFavorite && <Star className="w-3 h-3 text-amber-400 dark:text-amber-500 fill-current" />}
            </div>
          </div>
          <div className="mt-auto flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100/5 dark:border-gray-800/50 pt-1.5">
            {smallMetadataMemo}
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
          ${containerClasses}
          ${viewMode === 'list' ? 'min-h-[64px]' : 'h-[180px]'}
        `}
      >
        {viewMode === 'list' ? (
          <div className="px-3 py-2.5 h-full flex gap-3 items-start">
            {context === 'trash' && onSelect && (
              <div className="flex items-center pt-1.5">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={onSelect}
                  className="w-4 h-4 text-primary-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                />
              </div>
            )}
            <div className={`flex-shrink-0 p-1.5 rounded ${getIconBg('notes')} text-[var(--color-note)] mt-1 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)] ring-1 ring-black/5 dark:ring-white/10 transition-shadow duration-200`}>
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-[var(--color-text)] truncate">{note.title}</h3>
                  {note.content && (
                    <p className="text-xs text-[var(--color-textSecondary)] line-clamp-1">
                      {note.content}
                    </p>
                  )}
                  {contextInfoMemo}
                </div>
                <div className="flex-shrink-0 ml-4">
                  {actionsMemo}
                </div>
              </div>
              <div className="flex items-end justify-between pt-1">
                <div className="min-w-0 flex-1">
                  {tagsMemo}
                </div>
                <div className="flex-shrink-0 ml-4">
                  {metadataMemo}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 h-full flex flex-col">
            <div className="flex items-start gap-2">
              {context === 'trash' && onSelect && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={onSelect}
                  className="w-4 h-4 mt-1 text-primary-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                />
              )}
              <div className={`flex-shrink-0 p-1.5 mt-0.5 rounded ${getIconBg('notes')} text-[var(--color-note)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)] ring-1 ring-black/5 dark:ring-white/10 transition-shadow duration-200`}>
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-[var(--color-text)] truncate">{note.title}</h3>
                  {actionsMemo}
                </div>
                {note.content && (
                  <p className="mt-1 text-xs text-[var(--color-textSecondary)] line-clamp-3">
                    {note.content}
                  </p>
                )}
                {contextInfoMemo}
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-end space-y-2">
              {tagsMemo}
              <div className="pt-2 border-t border-gray-700/10">
                {metadataMemo}
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

/* Subcomponents defined below, each wrapped in React.memo */

interface TagListProps {
  visibleTags: string[];
  remainingCount: number;
  tagClasses: string;
}

const TagList = memo(function TagList({ visibleTags, remainingCount, tagClasses }: TagListProps) {
  if (visibleTags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map(tag => (
        <span
          key={tag}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium ${tagClasses}`}
        >
          <TagIcon className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate max-w-[120px]">{tag}</span>
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-secondary)] text-[var(--color-textSecondary)] whitespace-nowrap">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
});

function ContextInfo({ context, contextData, getDaysUntilExpiration }: {
  context: NoteCardProps['context'],
  contextData?: NoteCardProps['contextData'],
  getDaysUntilExpiration: () => number | null
}) {
  if (context === 'trash' && contextData?.deletedAt) {
    const daysLeft = getDaysUntilExpiration();
    return (
      <div className="flex items-center gap-2 text-[11px] text-red-500 mt-1">
        <Clock className="w-3 h-3" />
        <span>Deleted {formatTimeAgo(contextData.deletedAt)}</span>
        {daysLeft !== null && (
          <span className="text-red-600 dark:text-red-400">({daysLeft}d left)</span>
        )}
      </div>
    );
  }
  if (context === 'archive' && contextData?.archivedAt) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[var(--color-textSecondary)] mt-1">
        <Archive className="w-3 h-3" />
        <span>Archived {formatTimeAgo(contextData.archivedAt)}</span>
      </div>
    );
  }
  return null;
}
const MemoizedContextInfo = memo(ContextInfo);

interface ActionsProps {
  context: NoteCardProps['context'];
  handlePin: (e: React.MouseEvent) => void;
  handleFavorite: (e: React.MouseEvent) => void;
  handleArchiveClick: (e: React.MouseEvent) => void;
  pinButtonClasses: string;
  favoriteButtonClasses: string;
  note: Note;
  isArchiveView?: boolean;
}

const Actions = memo(function Actions({
  context,
  handlePin,
  handleFavorite,
  handleArchiveClick,
  pinButtonClasses,
  favoriteButtonClasses,
  note,
  isArchiveView
}: ActionsProps) {
  if (isArchiveView || (context !== 'default')) return null;

  return (
    <div className="flex gap-1">
      <button
        onClick={handlePin}
        className={`p-1.5 rounded-lg transition-colors ${pinButtonClasses}`}
        title={note.isPinned ? 'Unpin note' : 'Pin note'}
      >
        <Pin className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleFavorite}
        className={`p-1.5 rounded-lg transition-colors ${favoriteButtonClasses}`}
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
  );
});

function Metadata({ note }: { note: Note }) {
  return (
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
}
const MemoizedMetadata = memo(Metadata);

// Smaller metadata variant for mindMap view
function SmallMetadata({ note }: { note: Note }) {
  return (
    <>
      {(note.linkedNoteIds?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1">
          <Link2 className="w-2.5 h-2.5" />
          <span>{note.linkedNoteIds.length}</span>
        </div>
      )}
      {(note.linkedTasks?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1">
          <CheckSquare className="w-2.5 h-2.5" />
          <span>{note.linkedTasks?.length}</span>
        </div>
      )}
      {(note.linkedReminders?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          <span>{note.linkedReminders.length}</span>
        </div>
      )}
    </>
  );
}
const MemoizedSmallMetadata = memo(SmallMetadata);
