import { Note } from '../types/note';
import { useUIStore } from '../../../store/ui-store';
import { useDeleteNote } from '../hooks/use-notes-query';
import { toast } from '../../../hooks/use-toast';
import { formatRelativeDate } from '../../../utils/date-utils';
import { useState, memo, useMemo } from 'react';
import { useThemeStore } from '../../../store/theme-store';

interface NoteListItemProps {
  note: Note;
  showDeleteButton?: boolean;
  isBulkMode?: boolean;
  isSelected?: boolean;
  onSelect?: (noteId: string) => void;
}


export const NoteListItem = memo(function NoteListItem({
  note,
  showDeleteButton = true,
  isBulkMode = false,
  isSelected = false,
  onSelect,
}: NoteListItemProps) {
  const openEditModal = useUIStore((state) => state.openEditModal);
  const deleteNoteMutation = useDeleteNote();
  const [isHovered, setIsHovered] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';

  const handleItemClick = () => {
    if (isBulkMode && onSelect) {
      onSelect(note.id);
    } else {
      openEditModal(note);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
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


  // Extract tags
  const displayTags = useMemo(() => {
    if (note.tags && note.tags.length > 0) {
      return note.tags;
    }

    if (note.content) {
      const tagPattern = /#([a-zA-Z0-9_-]+)/g;
      const tags: string[] = [];
      let match;

      while ((match = tagPattern.exec(note.content)) !== null) {
        const tag = match[1];
        if (tag && !tags.includes(tag)) {
          tags.push(tag);
        }
      }

      return tags;
    }

    return [];
  }, [note.tags, note.content]);

  const getBorderColor = () => {
    if (isBulkMode && isSelected) {
      return 'var(--color-brand-500)';
    }
    if (isHovered) {
      return 'var(--color-brand-500)';
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
      className="group relative border rounded-xl transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-md"
      style={{
        backgroundColor: getBackgroundStyle(),
        borderColor: getBorderColor(),
        borderWidth: isBulkMode && isSelected ? '2px' : '1px',
        boxShadow: isHovered
          ? 'var(--shadow-md), 0 0 20px -10px var(--color-primary-alpha)'
          : 'var(--shadow-sm)',
        transform: isHovered ? 'scale-[1.005]' : 'none',
      }}
      onClick={handleItemClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Bulk Selection Checkbox */}
        {isBulkMode && (
          <div
            className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded border-2 transition-all duration-200"
            style={{
              backgroundColor: isSelected ? 'var(--color-brand-600)' : 'var(--surface-card)',
              borderColor: isSelected ? 'var(--color-brand-600)' : 'var(--border)',
            }}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        {/* Note Icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: isDarkMode
              ? 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)'
              : 'color-mix(in srgb, var(--color-brand-100) 50%, transparent)',
          }}
        >
          <svg
            className="w-4 h-4"
            style={{ color: isDarkMode ? 'var(--color-brand-400)' : 'var(--color-brand-600)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
            title={note.title}
          >
            {note.title}
          </h3>
        </div>

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
            {displayTags.slice(0, 2).map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{
                  backgroundColor: isDarkMode
                    ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                    : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                  color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                }}
              >
                <span className="opacity-50 mr-0.5">#</span>{tag}
              </span>
            ))}
            {displayTags.length > 2 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                style={{
                  backgroundColor: isDarkMode
                    ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                    : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                  color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                }}
              >
                +{displayTags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <span
          className="hidden md:block text-[11px] flex-shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {formatRelativeDate(note.createdAt)}
        </span>

        {/* Delete Button */}
        {showDeleteButton && !isBulkMode && (
          <button
            onClick={handleDelete}
            className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

