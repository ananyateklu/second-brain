import { useMemo, useState } from 'react';
import { Note } from '../types/note';
import { useThemeStore } from '../../../store/theme-store';
import { FolderFilter, ArchiveFilter } from './NotesFilter';

interface FolderSidebarProps {
  notes: Note[];
  selectedFolder: FolderFilter;
  onFolderSelect: (folder: FolderFilter) => void;
  archiveFilter: ArchiveFilter;
  onArchiveFilterChange: (filter: ArchiveFilter) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function FolderSidebar({
  notes,
  selectedFolder,
  onFolderSelect,
  archiveFilter,
  onArchiveFilterChange,
  isCollapsed = false,
  onToggleCollapse,
}: FolderSidebarProps) {
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Calculate folder stats
  const folderStats = useMemo(() => {
    const stats = {
      all: notes.length,
      archived: notes.filter(n => n.isArchived).length,
      active: notes.filter(n => !n.isArchived).length,
      unfiled: notes.filter(n => !n.folder && !n.isArchived).length,
      folders: {} as Record<string, number>,
    };

    notes
      .filter(n => !n.isArchived && n.folder)
      .forEach(note => {
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

  const isSelected = (folder: FolderFilter) => {
    return selectedFolder === folder;
  };

  const getItemStyle = (itemId: string, selected: boolean) => ({
    backgroundColor: selected
      ? isDarkMode
        ? 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)'
        : 'color-mix(in srgb, var(--color-brand-100) 50%, transparent)'
      : hoveredItem === itemId
        ? 'var(--surface-hover)'
        : 'transparent',
    color: selected
      ? 'var(--color-brand-600)'
      : 'var(--text-primary)',
    borderLeft: selected
      ? '3px solid var(--color-brand-600)'
      : '3px solid transparent',
  });

  if (isCollapsed) {
    return (
      <div
        className="h-full flex flex-col items-center py-4 border-r"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)',
          width: '48px',
        }}
      >
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg transition-colors mb-4"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Expand sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {/* Collapsed icons */}
        <button
          onClick={() => {
            onFolderSelect(null);
            onArchiveFilterChange('all');
          }}
          className="p-2 rounded-lg transition-colors mb-2"
          style={{
            backgroundColor: selectedFolder === null && archiveFilter === 'all'
              ? 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)'
              : 'transparent',
            color: selectedFolder === null && archiveFilter === 'all'
              ? 'var(--color-brand-600)'
              : 'var(--text-secondary)',
          }}
          title="All notes"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </button>
        <button
          onClick={() => { onArchiveFilterChange('archived'); }}
          className="p-2 rounded-lg transition-colors"
          style={{
            backgroundColor: archiveFilter === 'archived'
              ? 'color-mix(in srgb, var(--color-warning) 20%, transparent)'
              : 'transparent',
            color: archiveFilter === 'archived'
              ? 'var(--color-warning)'
              : 'var(--text-secondary)',
          }}
          title="Archived notes"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col border-r overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        width: '240px',
        minWidth: '240px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Folders
        </h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* All Notes */}
        <button
          onClick={() => {
            onFolderSelect(null);
            onArchiveFilterChange('all');
          }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
          style={getItemStyle('all', selectedFolder === null && archiveFilter === 'all')}
          onMouseEnter={() => { setHoveredItem('all'); }}
          onMouseLeave={() => { setHoveredItem(null); }}
        >
          <span className="flex items-center gap-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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

        {/* Active Notes (not archived) */}
        <button
          onClick={() => {
            onFolderSelect(null);
            onArchiveFilterChange('not-archived');
          }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
          style={getItemStyle('active', selectedFolder === null && archiveFilter === 'not-archived')}
          onMouseEnter={() => { setHoveredItem('active'); }}
          onMouseLeave={() => { setHoveredItem(null); }}
        >
          <span className="flex items-center gap-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
            onFolderSelect(null);
            onArchiveFilterChange('archived');
          }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
          style={getItemStyle('archived', archiveFilter === 'archived')}
          onMouseEnter={() => { setHoveredItem('archived'); }}
          onMouseLeave={() => { setHoveredItem(null); }}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span style={{ color: archiveFilter === 'archived' ? 'var(--color-warning)' : 'inherit' }}>
              Archived
            </span>
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: archiveFilter === 'archived'
                ? 'color-mix(in srgb, var(--color-warning) 20%, transparent)'
                : 'var(--surface-hover)',
              color: archiveFilter === 'archived'
                ? 'var(--color-warning)'
                : 'var(--text-tertiary)',
            }}
          >
            {folderStats.archived}
          </span>
        </button>

        {/* Divider */}
        <div
          className="mx-4 my-2 border-t"
          style={{ borderColor: 'var(--border)' }}
        />

        {/* Unfiled */}
        {folderStats.unfiled > 0 && (
          <button
            onClick={() => {
              onFolderSelect('');
              onArchiveFilterChange('not-archived');
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
            style={getItemStyle('unfiled', isSelected(''))}
            onMouseEnter={() => { setHoveredItem('unfiled'); }}
            onMouseLeave={() => { setHoveredItem(null); }}
          >
            <span className="flex items-center gap-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                onClick={() => {
                  onFolderSelect(folder);
                  onArchiveFilterChange('not-archived');
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
                style={getItemStyle(`folder-${folder}`, isSelected(folder))}
                onMouseEnter={() => { setHoveredItem(`folder-${folder}`); }}
                onMouseLeave={() => { setHoveredItem(null); }}
              >
                <span className="flex items-center gap-3 truncate">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
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
  );
}

