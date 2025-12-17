import { useState, useMemo, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { TreeEntrySummary } from '../../../../types/github';
import { buildFileTree, filterFileTree, countFiles } from '../../utils/build-file-tree';
import { FileSearchInput } from './FileSearchInput';
import { FileTreeNode } from './FileTreeNode';

interface FileTreeViewProps {
  entries: TreeEntrySummary[];
  truncated: boolean;
  isLoading: boolean;
  error?: Error | null;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function FileTreeView({
  entries,
  truncated,
  isLoading,
  error,
  selectedPath,
  onSelectFile,
}: FileTreeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Build hierarchical tree from flat entries
  const tree = useMemo(() => buildFileTree(entries), [entries]);

  // Filter tree based on search query
  const filteredTree = useMemo(
    () => filterFileTree(tree, searchQuery),
    [tree, searchQuery]
  );

  // Count files for display
  const totalFileCount = useMemo(() => countFiles(tree), [tree]);
  const filteredFileCount = useMemo(
    () => (searchQuery ? countFiles(filteredTree) : totalFileCount),
    [filteredTree, searchQuery, totalFileCount]
  );

  // Handle directory toggle
  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Handle file selection
  const handleSelect = useCallback(
    (path: string) => {
      onSelectFile(path);
    },
    [onSelectFile]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: 'var(--color-brand-500)' }}
        />
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading file tree...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)' }}
        >
          <AlertTriangle className="h-6 w-6" style={{ color: 'var(--color-error)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Failed to load file tree</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {error.message}
        </p>
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No files in this repository</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="p-3 flex-shrink-0">
        <FileSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search files..."
          resultCount={filteredFileCount}
          totalCount={totalFileCount}
        />
      </div>

      {/* Truncation warning */}
      {truncated && (
        <div
          className="mx-3 mb-2 px-3 py-2 text-xs rounded-lg flex items-center gap-2 border"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
            color: 'var(--color-warning)',
            borderColor: 'color-mix(in srgb, var(--color-warning) 20%, transparent)',
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Large repository - some files may not be shown
          </span>
        </div>
      )}

      {/* File tree */}
      <div
        className="flex-1 overflow-auto border-t thin-scrollbar"
        style={{ borderColor: 'var(--border)' }}
        role="tree"
        aria-label="Repository files"
      >
        {filteredTree.length === 0 ? (
          <div
            className="flex items-center justify-center h-32 text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            No files match your search
          </div>
        ) : (
          <div className="py-1">
            {filteredTree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onSelect={handleSelect}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* File count footer */}
      <div
        className="px-3 py-2 text-xs flex-shrink-0 border-t"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-tertiary)',
          backgroundColor: 'var(--surface-card)',
        }}
      >
        {totalFileCount.toLocaleString()} files
      </div>
    </div>
  );
}
