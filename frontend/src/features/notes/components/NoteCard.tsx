import { Note, NoteListItem } from '../types/note';
import { useBoundStore } from '../../../store/bound-store';
import { useDeleteNote, useArchiveNote, useUnarchiveNote } from '../hooks/use-notes-query';
import { toast } from '../../../hooks/use-toast';
import { formatRelativeDate } from '../../../utils/date-utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, memo, useMemo } from 'react';

interface NoteCardProps {
  /** Note data - can be NoteListItem (summary only) or full Note (with content) */
  note: Note | NoteListItem;
  variant?: 'full' | 'compact' | 'micro';
  relevanceScore?: number;
  chunkIndex?: number;
  chunkCount?: number;
  chunkContent?: string;
  content?: string;
  createdOn?: string | null;
  modifiedOn?: string | null;
  showDeleteButton?: boolean;
  isBulkMode?: boolean;
  isSelected?: boolean;
  onSelect?: (noteId: string) => void;
}

// Regex-based HTML stripping (safer than innerHTML and faster)
const stripHtmlTags = (html: string): string => {
  if (!html) return '';

  // Replace block-level closing tags with newlines to preserve structure
  const text = html
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Clean up multiple spaces and newlines
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return text;
};

// Relevance score color logic - using brand colors based on score
// Dark green for high scores, lighter green as score decreases
const getRelevanceColor = (score: number) => {
  // White text for dark backgrounds (high scores)
  if (score >= 0.9) return '#ffffff'; // White text on dark green
  if (score >= 0.8) return '#ffffff'; // White text on medium-dark green
  if (score >= 0.7) return '#ffffff'; // White text on medium green
  // Dark text for lighter backgrounds (lower scores)
  if (score >= 0.6) return 'var(--color-brand-700)'; // Dark text on light green
  if (score >= 0.5) return 'var(--color-brand-700)'; // Dark text on lighter green
  return 'var(--color-brand-600)'; // Dark text on lightest green
};

const getRelevanceBg = (score: number) => {
  // Dark green background for high scores, getting lighter as score decreases
  if (score >= 0.9) return 'var(--color-brand-600)'; // Dark green for very high scores
  if (score >= 0.8) return 'var(--color-brand-500)';
  if (score >= 0.7) return 'var(--color-brand-400)';
  if (score >= 0.6) return 'var(--color-brand-300)';
  if (score >= 0.5) return 'var(--color-brand-200)';
  return 'var(--color-brand-100)'; // Lightest background for low scores
};

export const NoteCard = memo(({
  note,
  variant = 'full',
  relevanceScore,
  chunkIndex,
  chunkCount,
  chunkContent,
  content,
  createdOn,
  showDeleteButton = true,
  isBulkMode = false,
  isSelected = false,
  onSelect,
}: NoteCardProps) => {
  const openEditModal = useBoundStore((state) => state.openEditModal);
  const deleteNoteMutation = useDeleteNote();
  const archiveNoteMutation = useArchiveNote();
  const unarchiveNoteMutation = useUnarchiveNote();
  const isCompact = variant === 'compact';
  const isMicro = variant === 'micro';
  const isSmall = isCompact || isMicro;

  const [isHovered, setIsHovered] = useState(false);
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';

  const handleCardClick = () => {
    if (isBulkMode && onSelect) {
      onSelect(note.id);
    } else {
      openEditModal(note);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking delete button
    const confirmed = await toast.confirm({
      title: 'Delete Note',
      description: 'Are you sure you want to delete this note?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      deleteNoteMutation.mutate(note.id);
    }
  };

  const handleArchiveToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking archive button
    if (note.isArchived) {
      unarchiveNoteMutation.mutate(note.id);
    } else {
      archiveNoteMutation.mutate(note.id);
    }
  };

  // Use summary if available (preferred for list views), fall back to content/chunkContent
  // For small variants (compact/micro), prefer summary > content prop > chunkContent > note.content
  // For full variant, prefer summary > note.content (show full content in edit modal)
  const noteContent = 'content' in note ? note.content : undefined;
  const displayContent = isSmall
    ? (note.summary || content || chunkContent || noteContent || '')
    : (note.summary || noteContent || '');

  // Use parsed dates if provided, otherwise fall back to note dates
  const displayCreatedOn = createdOn || note.createdAt;

  // Adjust line clamp based on variant
  const contentLineClamp = isMicro ? 'line-clamp-2' : (isCompact ? 'line-clamp-3' : 'line-clamp-3');

  // Check if content is HTML - more robust check that looks for actual HTML tags
  // This avoids false positives from text like "a < b" or "AT&T"
  const isHtml = displayContent && /<[a-z][\s\S]*>/i.test(displayContent);

  // Memoize content processing only if it's HTML (most notes aren't HTML)
  const previewContent = useMemo(() => {
    if (!displayContent || !isHtml) return displayContent;
    return stripHtmlTags(displayContent);
  }, [displayContent, isHtml]);

  // Extract tags from content if note.tags is empty (fallback for imported notes)
  const displayTags = useMemo(() => {
    // Use note.tags if available
    if (note.tags && note.tags.length > 0) {
      return note.tags;
    }

    // Fallback: extract tags from content
    if (displayContent) {
      const tagPattern = /#([a-zA-Z0-9_-]+)/g;
      const tags: string[] = [];
      let match;

      while ((match = tagPattern.exec(displayContent)) !== null) {
        const tag = match[1];
        if (tag && !tags.includes(tag)) {
          tags.push(tag);
        }
      }

      return tags;
    }

    return [];
  }, [note.tags, displayContent]);

  // Styles based on variant
  const containerPadding = isMicro ? 'p-2 rounded-xl' : (isCompact ? 'p-4.5 rounded-3xl' : 'p-[22px] rounded-3xl');
  const titleSize = isMicro ? 'text-[11px]' : (isCompact ? 'text-sm' : 'text-lg');
  const contentFontSize = isMicro ? '10px' : (isCompact ? '0.75rem' : '0.875rem'); // Inline style for font size
  const headerMargin = isMicro ? 'mb-1' : (isCompact ? 'mb-2' : 'mb-3.5');
  const contentMargin = isMicro ? 'mb-1' : (isCompact ? 'mb-3.5' : 'mb-4');

  // Determine border and background based on selection state
  const getBorderColor = () => {
    if (isBulkMode && isSelected) {
      return 'var(--color-brand-500)';
    }
    if (isHovered) {
      return relevanceScore && relevanceScore > 0.8 && isSmall ? 'var(--color-brand-400)' : 'var(--color-brand-500)';
    }
    return 'var(--border)';
  };

  const getBackgroundStyle = () => {
    if (isBulkMode && isSelected) {
      return isDarkMode
        ? 'color-mix(in srgb, var(--color-brand-600) 10%, var(--surface-card))'
        : 'color-mix(in srgb, var(--color-brand-100) 30%, var(--surface-card))';
    }
    return 'var(--surface-card)';
  };

  return (
    <div
      className={`group relative border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${containerPadding}`}
      style={{
        backgroundColor: getBackgroundStyle(),
        borderColor: getBorderColor(),
        borderWidth: isBulkMode && isSelected ? '2px' : '1px',
        boxShadow: isHovered
          ? 'var(--shadow-lg), 0 0 40px -15px var(--color-primary-alpha)'
          : (isSmall ? 'var(--shadow-sm)' : 'var(--shadow-card)'),
        transform: isHovered && !isSmall ? 'translateY(-4px) scale-[1.02]' : (isHovered && isSmall ? 'scale-[1.01]' : 'none'),
        willChange: 'transform, box-shadow',
      }}
      onClick={handleCardClick}
      onMouseEnter={() => { setIsHovered(true); }}
      onMouseLeave={() => { setIsHovered(false); }}
    >
      {/* Bulk Selection Checkbox */}
      {isBulkMode && (
        <div
          className="absolute top-3 left-3 z-20 flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all duration-200"
          style={{
            backgroundColor: isSelected ? 'var(--color-brand-600)' : 'var(--surface-card)',
            borderColor: isSelected ? 'var(--color-brand-600)' : 'var(--border)',
            boxShadow: isSelected ? '0 2px 8px -2px var(--color-primary-alpha)' : 'var(--shadow-sm)',
          }}
        >
          {isSelected && (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}


      {/* Ambient glow effect - simplified for performance */}
      {isHovered && (
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-2xl pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle, var(--color-primary), transparent)`,
          }}
        />
      )}
      {/* Relevance Indicator Strip (only for high relevance compact/micro cards) */}
      {isSmall && relevanceScore && relevanceScore > 0.8 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 z-10"
          style={{ backgroundColor: getRelevanceBg(relevanceScore) }}
        />
      )}

      {/* Content wrapper with relative positioning */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className={`flex items-start justify-between gap-2 ${headerMargin}`}>
          <h2
            className={`${titleSize} font-semibold line-clamp-1 flex-1 tracking-tight`}
            style={{ color: 'var(--text-primary)' }}
            title={note.title}
          >
            {note.title}
          </h2>

          {/* Actions & Meta */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isSmall && relevanceScore !== undefined && (
              <div
                className={`flex items-center gap-1 rounded-full font-bold uppercase tracking-wider ${isMicro ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[10px]'
                  }`}
                style={{
                  backgroundColor: getRelevanceBg(relevanceScore),
                  color: getRelevanceColor(relevanceScore)
                }}
              >
                {(relevanceScore * 100).toFixed(0)}%
              </div>
            )}

            {showDeleteButton && !isSmall && (
              <div
                className={`flex items-center gap-1.5 transition-all duration-200 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}
              >
                {/* Archive/Unarchive Button */}
                <button
                  onClick={handleArchiveToggle}
                  className="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
                  style={{
                    backgroundColor: 'var(--surface-hover)',
                    color: 'var(--text-tertiary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!archiveNoteMutation.isPending && !unarchiveNoteMutation.isPending) {
                      e.currentTarget.style.backgroundColor = note.isArchived
                        ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                        : 'color-mix(in srgb, var(--color-warning) 15%, transparent)';
                      e.currentTarget.style.color = note.isArchived
                        ? 'var(--color-success)'
                        : 'var(--color-warning)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                  }}
                  aria-label={note.isArchived ? 'Restore note' : 'Archive note'}
                  title={note.isArchived ? 'Restore from archive' : 'Archive note'}
                  disabled={archiveNoteMutation.isPending || unarchiveNoteMutation.isPending}
                >
                  {note.isArchived ? (
                    // Unarchive icon (arrow coming out of box)
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3-3m0 0l3 3m-3-3v6" />
                    </svg>
                  ) : (
                    // Archive icon (box with down arrow)
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  )}
                </button>
                {/* Delete Button */}
                <button
                  onClick={(e) => { void handleDelete(e); }}
                  className="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
                  style={{
                    backgroundColor: 'var(--surface-hover)',
                    color: 'var(--text-tertiary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!deleteNoteMutation.isPending) {
                      e.currentTarget.style.backgroundColor = 'var(--color-error-light)';
                      e.currentTarget.style.color = 'var(--color-error-text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                  }}
                  aria-label="Delete note"
                  disabled={deleteNoteMutation.isPending}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          className={`${contentMargin} ${contentLineClamp} leading-tight`}
          style={{
            color: 'var(--text-secondary)',
            fontSize: contentFontSize,
            lineHeight: isMicro ? '1.3' : '1.5'
          }}
        >
          {isHtml ? (
            // For HTML content, show stripped plain text
            <p className="whitespace-pre-wrap font-normal" style={{ fontSize: contentFontSize, margin: 0 }}>{previewContent}</p>
          ) : (
            // For markdown/plain text, render with ReactMarkdown
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Simplified components for preview
                p: ({ node: _node, ...props }) => (
                  <p className="mb-1 last:mb-0" style={{ fontSize: contentFontSize, margin: 0, lineHeight: isMicro ? '1.3' : '1.5' }} {...props} />
                ),
                h1: ({ node: _node, ...props }) => (
                  <strong className="block mb-0.5 mt-1" style={{ fontSize: contentFontSize }} {...props} />
                ),
                h2: ({ node: _node, ...props }) => (
                  <strong className="block mb-0.5 mt-1" style={{ fontSize: contentFontSize }} {...props} />
                ),
                h3: ({ node: _node, ...props }) => (
                  <strong className="block mb-0.5 mt-1" style={{ fontSize: contentFontSize }} {...props} />
                ),
                ul: ({ node: _node, ...props }) => (
                  <ul className="list-disc ml-3 mb-0.5 space-y-0" style={{ fontSize: contentFontSize }} {...props} />
                ),
                ol: ({ node: _node, ...props }) => (
                  <ol className="list-decimal ml-3 mb-0.5 space-y-0" style={{ fontSize: contentFontSize }} {...props} />
                ),
                li: ({ node: _node, ...props }) => (
                  <li style={{ fontSize: contentFontSize }} {...props} />
                ),
                strong: ({ node: _node, ...props }) => (
                  <strong className="font-semibold" style={{ fontSize: contentFontSize, color: 'var(--text-primary)' }} {...props} />
                ),
                em: ({ node: _node, ...props }) => (
                  <em className="italic" style={{ fontSize: contentFontSize }} {...props} />
                ),
                code: ({ node: _node, ...props }) => (
                  <code className="px-1 py-0.5 rounded" style={{ fontSize: contentFontSize, backgroundColor: 'var(--surface-elevated)' }} {...props} />
                ),
                blockquote: ({ node: _node, ...props }) => (
                  <blockquote className="border-l-2 pl-2 italic my-0.5" style={{ fontSize: contentFontSize, borderColor: 'var(--border)' }} {...props} />
                ),
                // Hide complex elements in preview
                table: () => null,
                img: () => null,
                hr: () => null,
              }}
            >
              {displayContent}
            </ReactMarkdown>
          )}
        </div>

        {/* Spacer to push footer to bottom */}
        <div className="flex-grow" />

        {/* Footer Info */}
        <div className={`flex items-end justify-between ${!isSmall ? 'mt-2.5' : 'mt-auto'}`}>
          {/* Left side: Archived badge + Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Archived Badge */}
            {note.isArchived && (
              <span
                className={`inline-flex items-center gap-1 rounded-md font-medium ${isMicro ? 'px-1.5 py-0.5 text-[8px]' : (isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]')}`}
                style={{
                  backgroundColor: isDarkMode
                    ? 'color-mix(in srgb, var(--color-warning) 20%, transparent)'
                    : 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
                  color: isDarkMode ? 'var(--color-warning)' : 'var(--color-warning-dark, #b45309)',
                  border: `1px solid ${isDarkMode ? 'color-mix(in srgb, var(--color-warning) 30%, transparent)' : 'color-mix(in srgb, var(--color-warning) 25%, transparent)'}`,
                }}
              >
                <svg className={isMicro ? 'w-2.5 h-2.5' : 'w-3 h-3'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Archived
              </span>
            )}

            {/* Tags */}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {displayTags.slice(0, isMicro ? 2 : (isCompact ? 2 : 3)).map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className={`inline-flex items-center rounded-md font-medium ${isMicro ? 'px-1 py-0 text-[8px]' : (isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]')
                      }`}
                    style={{
                      backgroundColor: isDarkMode
                        ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                        : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                      color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                      opacity: isDarkMode ? 1 : 0.7,
                    }}
                  >
                    <span className="opacity-50 mr-0.5">#</span>{tag}
                  </span>
                ))}
                {displayTags.length > (isMicro ? 2 : (isCompact ? 2 : 3)) && (
                  <span
                    className={`inline-flex items-center rounded-md font-medium ${isMicro ? 'px-1 py-0 text-[8px]' : (isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]')
                      }`}
                    style={{
                      backgroundColor: isDarkMode
                        ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                        : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                      color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                      opacity: isDarkMode ? 1 : 0.7,
                    }}
                  >
                    +{displayTags.length - (isMicro ? 2 : (isCompact ? 2 : 3))}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Metadata / Date */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {isSmall && chunkCount !== undefined && chunkCount > 0 ? (
              <span
                className={`${isMicro ? 'text-[8px] px-1' : 'text-[9px] px-1.5'} font-medium py-0.5 rounded`}
                style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}
              >
                {chunkCount} chunk{chunkCount !== 1 ? 's' : ''}
              </span>
            ) : isSmall && chunkIndex !== undefined ? (
              <span
                className={`${isMicro ? 'text-[8px] px-1' : 'text-[9px] px-1.5'} font-medium py-0.5 rounded`}
                style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}
              >
                Chunk {chunkIndex + 1}
              </span>
            ) : !isSmall ? (
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {formatRelativeDate(displayCreatedOn)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
