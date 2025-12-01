/**
 * Notes Directory Page
 * Folder-based hierarchical view of notes with ChatPage-style UI
 */

import { useState, useMemo, useRef } from 'react';
import { useNotes } from '../features/notes/hooks/use-notes-query';
import { Note } from '../features/notes/types/note';
import { NoteListItem } from '../features/notes/components/NoteListItem';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useThemeStore } from '../store/theme-store';

type FolderFilter = string | null;
type ArchiveFilter = 'all' | 'not-archived' | 'archived';

export function NotesDirectoryPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: notes, isLoading, error } = useNotes();
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';

  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<FolderFilter>(null);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('all');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Calculate folder stats
  const folderStats = useMemo(() => {
    if (!notes) return { all: 0, archived: 0, active: 0, unfiled: 0, folders: {} as Record<string, number> };

    const stats = {
      all: notes.length,
      archived: notes.filter((n) => n.isArchived).length,
      active: notes.filter((n) => !n.isArchived).length,
      unfiled: notes.filter((n) => !n.folder && !n.isArchived).length,
      folders: {} as Record<string, number>,
    };

    notes
      .filter((n) => !n.isArchived && n.folder)
      .forEach((note) => {
        if (note.folder) {
          stats.folders[note.folder] = (stats.folders[note.folder] || 0) + 1;
        }
      });

    return stats;
  }, [notes]);

  // Get sorted list of folders
  const folderList = useMemo(() => {
    return Object.keys(folderStats.folders).sort();
  }, [folderStats.folders]);

  // Filter notes based on selection
  const filteredNotes = useMemo(() => {
    if (!notes) return [];

    return notes.filter((note: Note) => {
      // Archive filter
      if (archiveFilter === 'archived' && !note.isArchived) return false;
      if (archiveFilter === 'not-archived' && note.isArchived) return false;

      // Folder filter
      if (selectedFolder === '') {
        // Unfiled - no folder
        return !note.folder && !note.isArchived;
      }
      if (selectedFolder !== null) {
        return note.folder === selectedFolder && !note.isArchived;
      }

      return true;
    });
  }, [notes, selectedFolder, archiveFilter]);

  const isSelected = (folder: FolderFilter) => selectedFolder === folder;

  const getItemStyle = (itemId: string, selected: boolean) => ({
    backgroundColor: selected
      ? isDarkMode
        ? 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)'
        : 'color-mix(in srgb, var(--color-brand-100) 50%, transparent)'
      : hoveredItem === itemId
        ? 'var(--surface-hover)'
        : 'transparent',
    color: selected ? 'var(--color-brand-600)' : 'var(--text-primary)',
    borderLeft: selected ? '3px solid var(--color-brand-600)' : '3px solid transparent',
  });

  const handleFolderSelect = (folder: FolderFilter) => {
    setSelectedFolder(folder);
    if (folder !== null) {
      setArchiveFilter('not-archived');
    }
  };

  // Get the title for the current view
  const getCurrentTitle = () => {
    if (archiveFilter === 'archived') return 'Archived Notes';
    if (selectedFolder === '') return 'Unfiled Notes';
    if (selectedFolder) return selectedFolder;
    if (archiveFilter === 'not-archived') return 'Active Notes';
    return 'All Notes';
  };

  if (error) {
    return (
      <div
        ref={containerRef}
        className="flex overflow-hidden rounded-3xl border transition-all duration-300"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-2xl)',
          height: 'calc(100vh - 2rem)',
        }}
      >
        <div className="flex-1 flex items-center justify-center">
          <div
            className="rounded-xl border p-6 text-center shadow-sm"
            style={{
              backgroundColor: 'var(--color-error-light)',
              borderColor: 'var(--color-error-border)',
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg
                className="h-5 w-5"
                style={{ color: 'var(--color-error-text)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-base font-semibold" style={{ color: 'var(--color-error-text)' }}>
                Error: {error instanceof Error ? error.message : 'Failed to load notes'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex overflow-hidden rounded-3xl border transition-all duration-300"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-2xl)',
        height: 'calc(100vh - 2rem)',
      }}
    >
      {/* Folder Sidebar */}
      {showSidebar && (
        <div
          className="border-r flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-out w-64 md:w-72"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Sidebar Header */}
          <div
            className="flex-shrink-0 px-4 py-[1.43rem] border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Folders
            </h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--surface-card) 80%, transparent)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              title="Hide sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-2 [scrollbar-width:thin] [scrollbar-color:var(--color-brand-400)_transparent]">
            {/* All Notes */}
            <button
              onClick={() => {
                setSelectedFolder(null);
                setArchiveFilter('all');
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
              style={getItemStyle('all', selectedFolder === null && archiveFilter === 'all')}
              onMouseEnter={() => setHoveredItem('all')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                All Notes
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {folderStats.all}
              </span>
            </button>

            {/* Active Notes */}
            <button
              onClick={() => {
                setSelectedFolder(null);
                setArchiveFilter('not-archived');
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
              style={getItemStyle('active', selectedFolder === null && archiveFilter === 'not-archived')}
              onMouseEnter={() => setHoveredItem('active')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Active
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {folderStats.active}
              </span>
            </button>

            {/* Archived Notes */}
            <button
              onClick={() => {
                setSelectedFolder(null);
                setArchiveFilter('archived');
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
              style={getItemStyle('archived', archiveFilter === 'archived')}
              onMouseEnter={() => setHoveredItem('archived')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span className="flex items-center gap-3">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{
                    color: archiveFilter === 'archived' ? 'var(--color-warning)' : 'currentColor',
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                <span style={{ color: archiveFilter === 'archived' ? 'var(--color-warning)' : 'inherit' }}>
                  Archived
                </span>
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor:
                    archiveFilter === 'archived'
                      ? 'color-mix(in srgb, var(--color-warning) 20%, transparent)'
                      : 'var(--surface-hover)',
                  color: archiveFilter === 'archived' ? 'var(--color-warning)' : 'var(--text-tertiary)',
                }}
              >
                {folderStats.archived}
              </span>
            </button>

            {/* Divider */}
            <div className="mx-4 my-2 border-t" style={{ borderColor: 'var(--border)' }} />

            {/* Unfiled */}
            {folderStats.unfiled > 0 && (
              <button
                onClick={() => handleFolderSelect('')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
                style={getItemStyle('unfiled', isSelected(''))}
                onMouseEnter={() => setHoveredItem('unfiled')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <span className="flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Unfiled
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--surface-hover)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {folderStats.unfiled}
                </span>
              </button>
            )}

            {/* Folder List */}
            {folderList.length > 0 && (
              <>
                <div
                  className="px-4 py-2 text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Folders
                </div>
                {folderList.map((folder) => (
                  <button
                    key={folder}
                    onClick={() => handleFolderSelect(folder)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
                    style={getItemStyle(`folder-${folder}`, isSelected(folder))}
                    onMouseEnter={() => setHoveredItem(`folder-${folder}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                      <span className="truncate">{folder}</span>
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--surface-hover)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {folderStats.folders[folder]}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Header */}
        <div
          className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--surface-card) 80%, transparent)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
                title="Show sidebar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                style={{ color: 'var(--text-secondary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {getCurrentTitle()}
              </h1>
            </div>
          </div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>

        {/* Notes Content */}
        <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:var(--color-brand-400)_transparent]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner message="Loading notes..." />
            </div>
          ) : filteredNotes.length === 0 ? (
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
              description={
                selectedFolder
                  ? `No notes in "${selectedFolder}" folder.`
                  : archiveFilter === 'archived'
                    ? 'No archived notes.'
                    : 'No notes match the current filter.'
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredNotes
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((note) => (
                  <NoteListItem key={note.id} note={note} showDeleteButton={true} />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Note Modal */}
      <EditNoteModal />
    </div>
  );
}

