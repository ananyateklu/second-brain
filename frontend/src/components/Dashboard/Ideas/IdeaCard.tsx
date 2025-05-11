import { useState, useMemo, useCallback, memo } from 'react';
import { Star, Link2, Tag as TagIcon, Lightbulb, Archive, Pin, CheckSquare, Clock } from 'lucide-react';
import type { Idea } from '../../../types/idea';
import { formatDate } from '../../../utils/dateUtils';
import { useIdeas } from '../../../contexts/IdeasContext';
import { formatTimeAgo } from '../Recent/utils';
import { useTheme } from '../../../contexts/themeContextUtils';
import { getIconBg } from '../../../utils/dashboardUtils';
import { WarningModal } from '../../shared/WarningModal';

interface IdeaCardProps {
  idea: Idea;
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

export function IdeaCard({
  idea,
  viewMode = 'grid',
  isSelected,
  context = 'default',
  onSelect,
  onClick,
  isArchiveView,
  contextData
}: IdeaCardProps) {
  const { toggleFavorite, togglePin, toggleArchive } = useIdeas();
  const { theme } = useTheme();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [isSafari] = useState(() => /^((?!chrome|android).)*safari/i.test(navigator.userAgent));

  const isDark = useMemo(() => theme === 'dark' || theme === 'midnight' || theme === 'full-dark', [theme]);


  const containerClasses = useMemo(() => {
    const getBackgroundColor = () => {
      if (theme === 'dark') return 'bg-gray-900/30';
      if (theme === 'midnight') {
        return isSafari ? 'bg-[var(--note-bg-color)] bg-opacity-[var(--note-bg-opacity,0.3)]' : 'bg-[#1e293b]/30';
      }
      return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const base = `
      relative group w-full
      ${isSelected ? 'ring-2 ring-[var(--color-accent)]' : ''}
      ${getBackgroundColor()}
      backdrop-blur-xl 
      border border-[color:var(--color-border)]
      hover:border-amber-400/50 dark:hover:border-amber-500/50
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

  // Event handlers with useCallback
  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(idea.id);
  }, [toggleFavorite, idea.id]);

  const handlePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin(idea.id);
  }, [togglePin, idea.id]);

  const handleArchiveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowArchiveWarning(true);
  }, []);

  const handleArchiveConfirm = useCallback(() => {
    toggleArchive(idea.id);
    setShowArchiveWarning(false);
  }, [toggleArchive, idea.id]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (onSelect) {
      e.stopPropagation();
      onSelect();
    } else if (onClick) {
      onClick();
    }
  }, [onSelect, onClick]);

  // Memoized values and components
  const tags = useMemo(() => idea.tags || [], [idea.tags]);
  const MAX_VISIBLE_ITEMS = viewMode === 'list' ? 8 : 7;
  const visibleTags = useMemo(() => tags.slice(0, MAX_VISIBLE_ITEMS), [tags, MAX_VISIBLE_ITEMS]);
  const remainingCount = useMemo(() => Math.max(0, tags.length - MAX_VISIBLE_ITEMS), [tags.length, MAX_VISIBLE_ITEMS]);

  const tagClasses = useMemo(() => (
    isDark
      ? 'bg-[var(--color-idea)]/20 text-[var(--color-idea)] ring-1 ring-white/10 opacity-60'
      : 'bg-[var(--color-idea)]/10 text-[var(--color-idea)] ring-1 ring-black/5 opacity-50'
  ), [isDark]);

  const getDaysUntilExpiration = useCallback(() => {
    if (contextData?.expiresAt) {
      return Math.ceil(
        (new Date(contextData.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }
    return null;
  }, [contextData?.expiresAt]);

  const contextInfoMemo = useMemo(() => (
    <MemoizedContextInfo
      context={context}
      contextData={contextData}
      getDaysUntilExpiration={getDaysUntilExpiration}
    />
  ), [context, contextData, getDaysUntilExpiration]);

  const metadataMemo = useMemo(() => (
    <MemoizedMetadata idea={idea} />
  ), [idea]);

  const smallMetadataMemo = useMemo(() => (
    <MemoizedSmallMetadata idea={idea} />
  ), [idea]);

  const tagsMemo = useMemo(() => (
    <TagList
      visibleTags={visibleTags}
      remainingCount={remainingCount}
      tagClasses={tagClasses}
    />
  ), [visibleTags, remainingCount, tagClasses]);

  const pinButtonClasses = useMemo(() => {
    if (!idea.isPinned) return 'hover:bg-gray-100 dark:hover:bg-gray-800';
    return isDark ? 'bg-[#64AB6F]/10 text-[#64AB6F]' : 'bg-[#059669]/10 text-[#059669]';
  }, [idea.isPinned, isDark]);

  const favoriteButtonClasses = useMemo(() => {
    if (!idea.isFavorite) return 'hover:bg-gray-100 dark:hover:bg-gray-800';
    return isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600';
  }, [idea.isFavorite, isDark]);

  const actionsMemo = useMemo(() => (
    <Actions
      context={context}
      handlePin={handlePin}
      handleFavorite={handleFavorite}
      handleArchiveClick={handleArchiveClick}
      pinButtonClasses={pinButtonClasses}
      favoriteButtonClasses={favoriteButtonClasses}
      idea={idea}
      isArchiveView={isArchiveView}
    />
  ), [context, handlePin, handleFavorite, handleArchiveClick, pinButtonClasses, favoriteButtonClasses, idea, isArchiveView]);

  if (viewMode === 'mindMap') {
    return (
      <div
        onClick={handleCardClick}
        className={`${containerClasses} w-[160px] min-h-[90px] max-h-[90px]`}
      >
        <div className="p-2 h-full flex flex-col gap-1.5 relative">
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-start gap-1.5 flex-1 min-w-0">
              <div className={`flex-shrink-0 p-1 rounded-lg ${getIconBg('ideas')} text-[var(--color-idea)] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)] ring-1 ring-black/5 dark:ring-white/10 transition-shadow duration-200`}>
                <Lightbulb className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-[var(--color-text)] truncate leading-tight">
                  {idea.title}
                </h3>
                {idea.content && (
                  <p className="text-[9px] text-[var(--color-textSecondary)] truncate mt-0.5 max-w-[90px]">
                    {idea.content.slice(0, 50)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {idea.isPinned && <Pin className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />}
              {idea.isFavorite && <Star className="w-3 h-3 text-amber-400 dark:text-amber-500 fill-current" />}
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
            <div className={`flex-shrink-0 p-1.5 rounded ${getIconBg('ideas')} text-[var(--color-idea)] mt-1 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)] ring-1 ring-black/5 dark:ring-white/10 transition-shadow duration-200`}>
              <Lightbulb className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-[var(--color-text)] truncate">
                    {idea.title}
                  </h3>
                  {idea.content && (
                    <p className="text-xs text-[var(--color-textSecondary)] line-clamp-1">
                      {idea.content}
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
              <div className={`flex-shrink-0 p-1.5 rounded ${getIconBg('ideas')} text-[var(--color-idea)] mt-1 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4)] ring-1 ring-black/5 dark:ring-white/10 transition-shadow duration-200`}>
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-[var(--color-text)] truncate">
                    {idea.title}
                  </h3>
                  {actionsMemo}
                </div>
                {idea.content && (
                  <p className="mt-1 text-xs text-[var(--color-textSecondary)] line-clamp-3">
                    {idea.content}
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
        title={idea.title}
      />
    </>
  );
}

// New memoized subcomponents below

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
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${tagClasses}`}
        >
          <TagIcon className="w-3 h-3 flex-shrink-0" />
          <span className="truncate max-w-[120px]">{tag}</span>
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-800 text-gray-400 whitespace-nowrap">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
});

function ContextInfo({ context, contextData, getDaysUntilExpiration }: {
  context: IdeaCardProps['context'],
  contextData?: IdeaCardProps['contextData'],
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

function Metadata({ idea }: { idea: Idea }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[var(--color-textSecondary)]">
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>{formatDate(idea.updatedAt)}</span>
      </div>
      {idea.linkedItems && idea.linkedItems.length > 0 && (
        <div className="flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          <span>{idea.linkedItems.length} linked</span>
        </div>
      )}
    </div>
  );
}
const MemoizedMetadata = memo(Metadata);

interface ActionsProps {
  context: IdeaCardProps['context'];
  handlePin: (e: React.MouseEvent) => void;
  handleFavorite: (e: React.MouseEvent) => void;
  handleArchiveClick: (e: React.MouseEvent) => void;
  pinButtonClasses: string;
  favoriteButtonClasses: string;
  idea: Idea;
  isArchiveView?: boolean;
}

const Actions = memo(function Actions({
  context,
  handlePin,
  handleFavorite,
  handleArchiveClick,
  pinButtonClasses,
  favoriteButtonClasses,
  idea,
  isArchiveView
}: ActionsProps) {
  if (isArchiveView || (context !== 'default')) return null;
  return (
    <div className="flex gap-1">
      <button
        onClick={handlePin}
        className={`p-1.5 rounded-lg transition-colors ${pinButtonClasses}`}
        title={idea.isPinned ? 'Unpin idea' : 'Pin idea'}
      >
        <Pin className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleFavorite}
        className={`p-1.5 rounded-lg transition-colors ${favoriteButtonClasses}`}
        title={idea.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleArchiveClick}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Archive idea"
      >
        <Archive className="w-3.5 h-3.5 text-gray-500" />
      </button>
    </div>
  );
});

function SmallMetadata({ idea }: { idea: Idea }) {
  return (
    <>
      {(idea.linkedItems?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1">
          <Link2 className="w-2.5 h-2.5" />
          <span>{idea.linkedItems.length}</span>
        </div>
      )}
    </>
  );
}
const MemoizedSmallMetadata = memo(SmallMetadata);