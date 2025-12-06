import { memo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { NoteCard } from './NoteCard';
import { NoteListItem } from './NoteListItem';
import { Note } from '../types/note';
import { NotesViewMode } from '../../../store/ui-store';

interface VirtualizedNoteListProps {
  notes: Note[];
  viewMode?: NotesViewMode;
  isBulkMode?: boolean;
  selectedNoteIds?: Set<string>;
  onNoteSelect?: (noteId: string) => void;
  /** Enable virtualization (recommended for 50+ notes) */
  enableVirtualization?: boolean;
}

// Estimated heights for virtualization
const CARD_HEIGHT = 200; // Approximate card height in grid view
const LIST_ITEM_HEIGHT = 80; // Approximate list item height
const GRID_GAP = 20; // Gap between grid items

/**
 * VirtualizedNoteList - A performant note list that supports virtual scrolling
 * for large datasets. Automatically switches between card and list view modes.
 * 
 * For lists with fewer than 50 items, virtualization can be disabled for simplicity.
 * For larger lists, virtualization significantly improves performance.
 */
export const VirtualizedNoteList = memo(({
  notes,
  viewMode = 'card',
  isBulkMode = false,
  selectedNoteIds,
  onNoteSelect,
  enableVirtualization = true,
}: VirtualizedNoteListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate columns for grid view based on viewport
  const getColumnCount = useCallback(() => {
    if (viewMode === 'list') return 1;
    // Responsive grid: 1 col on mobile, 2 on tablet, 3 on desktop
    if (typeof window === 'undefined') return 3;
    const width = parentRef.current?.clientWidth ?? window.innerWidth;
    if (width < 768) return 1;
    if (width < 1024) return 2;
    return 3;
  }, [viewMode]);

  // For grid view, we need to calculate rows
  const columnCount = getColumnCount();
  const rowCount = viewMode === 'list' ? notes.length : Math.ceil(notes.length / columnCount);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is safe to use here
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => viewMode === 'list' ? LIST_ITEM_HEIGHT : CARD_HEIGHT + GRID_GAP,
    overscan: 12, // Render more items to prevent blank space during fast scrolling
  });

  // If virtualization is disabled or we have few notes, render normally
  if (!enableVirtualization || notes.length < 50) {
    if (viewMode === 'list') {
      return (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              isBulkMode={isBulkMode}
              isSelected={selectedNoteIds?.has(note.id) ?? false}
              onSelect={onNoteSelect}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isBulkMode={isBulkMode}
            isSelected={selectedNoteIds?.has(note.id) ?? false}
            onSelect={onNoteSelect}
          />
        ))}
      </div>
    );
  }

  // Virtualized list view
  if (viewMode === 'list') {
    return (
      <div
        ref={parentRef}
        className="h-full overflow-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const note = notes[virtualItem.index];
            if (!note) return null;

            return (
              <div
                key={note.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <NoteListItem
                  note={note}
                  isBulkMode={isBulkMode}
                  isSelected={selectedNoteIds?.has(note.id) ?? false}
                  onSelect={onNoteSelect}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Virtualized grid view
  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const rowNotes = notes.slice(startIndex, startIndex + columnCount);

          return (
            <div
              key={virtualRow.index}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: GRID_GAP,
              }}
            >
              {rowNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isBulkMode={isBulkMode}
                  isSelected={selectedNoteIds?.has(note.id) ?? false}
                  onSelect={onNoteSelect}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});
