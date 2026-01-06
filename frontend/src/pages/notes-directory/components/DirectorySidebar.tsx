import { useState } from 'react';
import { useBoundStore } from '../../../store/bound-store';
import type { ArchiveFilter, FolderFilter, FolderStats } from '../notes-directory.types';

interface DirectorySidebarProps {
  folderStats: FolderStats;
  folderList: string[];
  selectedFolder: FolderFilter;
  archiveFilter: ArchiveFilter;
  isTrashMode: boolean;
  trashCount: number;
  onSelectFolder: (folder: FolderFilter, archive: ArchiveFilter) => void;
  onSelectTrash: () => void;
}

export function DirectorySidebar({
  folderStats,
  folderList,
  selectedFolder,
  archiveFilter,
  isTrashMode,
  trashCount,
  onSelectFolder,
  onSelectTrash,
}: DirectorySidebarProps) {
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isSelected = (folder: FolderFilter) => selectedFolder === folder;

  const getItemStyle = (itemId: string, selected: boolean) => ({
    backgroundColor: selected
      ? isDarkMode
        ? 'color-mix(in srgb, var(--color-brand-600) 15%, transparent)'
        : 'color-mix(in srgb, var(--color-brand-100) 40%, transparent)'
      : hoveredItem === itemId
        ? isDarkMode
          ? 'color-mix(in srgb, var(--text-primary) 5%, transparent)'
          : 'color-mix(in srgb, var(--text-primary) 4%, transparent)'
        : 'transparent',
    color: selected ? 'var(--color-brand-600)' : 'var(--text-primary)',
    borderLeft: selected ? '3px solid var(--color-brand-600)' : '3px solid transparent',
    transition: 'all 0.15s ease',
  });

  return (
    <div
      className="border-r flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-out w-[23rem]"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto thin-scrollbar">
        {/* All Notes */}
        <button
          onClick={() => { onSelectFolder(null, 'all'); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
          style={getItemStyle('all', selectedFolder === null && archiveFilter === 'all' && !isTrashMode)}
          onMouseEnter={() => { setHoveredItem('all'); }}
          onMouseLeave={() => { setHoveredItem(null); }}
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
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
              color: 'var(--text-tertiary)',
            }}
          >
            {folderStats.all}
          </span>
        </button>

        {/* Active Notes */}
        <button
          onClick={() => { onSelectFolder(null, 'not-archived'); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
          style={getItemStyle('active', selectedFolder === null && archiveFilter === 'not-archived' && !isTrashMode)}
          onMouseEnter={() => { setHoveredItem('active'); }}
          onMouseLeave={() => { setHoveredItem(null); }}
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
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
              color: 'var(--text-tertiary)',
            }}
          >
            {folderStats.active}
          </span>
        </button>

        {/* Archived Notes */}
        <button
          onClick={() => { onSelectFolder(null, 'archived'); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
          style={getItemStyle('archived', archiveFilter === 'archived' && !isTrashMode)}
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
                color: archiveFilter === 'archived' && !isTrashMode ? 'var(--color-warning)' : 'currentColor',
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
            <span style={{ color: archiveFilter === 'archived' && !isTrashMode ? 'var(--color-warning)' : 'inherit' }}>
              Archived
            </span>
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor:
                archiveFilter === 'archived' && !isTrashMode
                  ? 'color-mix(in srgb, var(--color-warning) 20%, transparent)'
                  : 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
              color: archiveFilter === 'archived' && !isTrashMode ? 'var(--color-warning)' : 'var(--text-tertiary)',
            }}
          >
            {folderStats.archived}
          </span>
        </button>

        {/* Trash */}
        <button
          onClick={onSelectTrash}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
          style={getItemStyle('trash', isTrashMode)}
          onMouseEnter={() => { setHoveredItem('trash'); }}
          onMouseLeave={() => { setHoveredItem(null); }}
        >
          <span className="flex items-center gap-3">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{
                color: isTrashMode ? 'var(--color-error)' : 'currentColor',
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span style={{ color: isTrashMode ? 'var(--color-error)' : 'inherit' }}>
              Trash
            </span>
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor:
                isTrashMode
                  ? 'color-mix(in srgb, var(--color-error) 20%, transparent)'
                  : 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
              color: isTrashMode ? 'var(--color-error)' : 'var(--text-tertiary)',
            }}
          >
            {trashCount}
          </span>
        </button>

        {/* Divider */}
        <div
          className="mx-4 my-3 h-px"
          style={{
            background: 'linear-gradient(to right, transparent, color-mix(in srgb, var(--text-primary) 10%, transparent), transparent)',
          }}
        />

        {/* Unfiled */}
        {folderStats.unfiled > 0 && (
          <button
            onClick={() => { onSelectFolder('', 'not-archived'); }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
            style={getItemStyle('unfiled', isSelected(''))}
            onMouseEnter={() => { setHoveredItem('unfiled'); }}
            onMouseLeave={() => { setHoveredItem(null); }}
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
            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Folders
              </span>
              <div
                className="flex-1 h-px"
                style={{
                  background: 'linear-gradient(to right, color-mix(in srgb, var(--text-primary) 8%, transparent), transparent)',
                }}
              />
            </div>
            {folderList.map((folder) => (
              <button
                key={folder}
                onClick={() => { onSelectFolder(folder, 'not-archived'); }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150"
                style={getItemStyle(`folder-${folder}`, isSelected(folder))}
                onMouseEnter={() => { setHoveredItem(`folder-${folder}`); }}
                onMouseLeave={() => { setHoveredItem(null); }}
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
                    backgroundColor: 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
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
