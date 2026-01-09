/**
 * Notes Main Content Component
 * Handles the main content area including loading, empty, trash, and notes list states
 */

import { memo, type RefObject } from 'react';
import { NoteList } from '../NoteList';
import { DirectoryContentSkeleton } from '../DirectorySkeleton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { TrashNotesContent } from '../../../../pages/notes-directory/components/TrashNotesContent';
import { MobilePagination } from './MobilePagination';
import type { NoteListItem, TrashNotesResponse } from '../../../../types/notes';
import type { NotesViewMode } from '../../../../store/types';

export interface NotesMainContentProps {
  /** Whether notes are loading */
  isLoading: boolean;
  /** Whether search results are stale (deferred value not caught up) */
  isSearchStale: boolean;
  /** Whether data is being fetched */
  isFetching: boolean;
  /** Whether viewing trash mode */
  isTrashMode: boolean;
  /** Whether trash is loading (separate from regular notes) */
  isTrashLoading: boolean;
  /** Notes to display */
  displayedNotes: NoteListItem[];
  /** Trash data when in trash mode */
  trashData?: TrashNotesResponse;
  /** View mode (card or list) */
  viewMode: NotesViewMode;
  /** Whether bulk selection mode is active */
  isBulkMode: boolean;
  /** Set of selected note IDs */
  selectedNoteIds: Set<string>;
  /** Callback when a note is selected/deselected */
  onNoteSelect: (noteId: string) => void;
  /** Callback to restore a note from trash */
  onRestoreNote: (noteId: string) => void;
  /** Whether restore operation is pending */
  isRestorePending: boolean;
  /** Callback to permanently delete a note */
  onPermanentDelete: (noteId: string) => void;
  /** Whether permanent delete operation is pending */
  isPermanentDeletePending: boolean;
  /** Empty state description text */
  emptyStateDescription: string;
  /** Pagination - current page */
  currentPage: number;
  /** Pagination - total pages */
  totalPages: number;
  /** Pagination - total items */
  totalItems: number;
  /** Pagination - items per page */
  itemsPerPage: number;
  /** Pagination - page change callback */
  onPageChange: (page: number) => void;
  /** Ref to the scrollable container for scroll detection */
  scrollableRef: RefObject<HTMLDivElement | null>;
}

export const NotesMainContent = memo(({
  isLoading,
  isSearchStale,
  isFetching,
  isTrashMode,
  isTrashLoading,
  displayedNotes,
  trashData,
  viewMode,
  isBulkMode,
  selectedNoteIds,
  onNoteSelect,
  onRestoreNote,
  isRestorePending,
  onPermanentDelete,
  isPermanentDeletePending,
  emptyStateDescription,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  scrollableRef,
}: NotesMainContentProps) => {
  const showLoading = isTrashMode ? isTrashLoading : isLoading;

  return (
    <div
      ref={scrollableRef}
      className="flex-1 overflow-y-auto p-4 md:p-6 thin-scrollbar transition-opacity duration-200"
      style={{ opacity: isSearchStale || isFetching ? 0.7 : 1 }}
    >
      {showLoading ? (
        <DirectoryContentSkeleton />
      ) : isTrashMode ? (
        <TrashNotesContent
          trashData={trashData}
          directoryViewMode={viewMode}
          onRestoreNote={onRestoreNote}
          isRestorePending={isRestorePending}
          onPermanentDelete={onPermanentDelete}
          isPermanentDeletePending={isPermanentDeletePending}
        />
      ) : displayedNotes.length === 0 ? (
        <EmptyState
          icon={
            <svg
              className="h-8 w-8"
              style={{ color: 'var(--text-secondary)' }}
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
          }
          title="No notes found"
          description={emptyStateDescription}
        />
      ) : (
        <NoteList
          notes={displayedNotes}
          viewMode={viewMode}
          isBulkMode={isBulkMode}
          selectedNoteIds={selectedNoteIds}
          onNoteSelect={onNoteSelect}
        />
      )}

      {/* Mobile Inline Pagination - at bottom of content */}
      {!isTrashMode && displayedNotes.length > 0 && (
        <MobilePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
});

NotesMainContent.displayName = 'NotesMainContent';
