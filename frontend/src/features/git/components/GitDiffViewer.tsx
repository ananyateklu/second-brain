/**
 * Git Diff Viewer Component
 * Displays file diff with syntax highlighting
 */

import { memo, useMemo } from 'react';
import { X, FileCode, Plus, Minus, Code2, FileSearch } from 'lucide-react';
import type { GitDiffResult } from '../../../types/git';

interface GitDiffViewerProps {
  diff: GitDiffResult | null;
  isLoading: boolean;
  onClose: () => void;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header' | 'header-add' | 'header-remove';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

const parseDiff = (diffText: string): DiffLine[] => {
  if (!diffText) return [];

  const lines = diffText.split('\n');
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;
  let isNewFile = false;
  let isDeletedFile = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('@@')) {
      // Parse hunk header: @@ -1,5 +1,6 @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ type: 'header', content: line });
      isNewFile = false;
      isDeletedFile = false;
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      result.push({ type: 'add', content: line.slice(1), newLineNum: newLine++ });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.push({ type: 'remove', content: line.slice(1), oldLineNum: oldLine++ });
    } else if (line.startsWith('---')) {
      // Check if this is a new file (--- /dev/null)
      isNewFile = line.includes('/dev/null');
      result.push({ type: 'header', content: line });
    } else if (line.startsWith('+++')) {
      // Check if this is a deleted file (+++ /dev/null)
      isDeletedFile = line.includes('/dev/null');
      // Style based on whether it's a new file, deleted file, or modified file
      let type: DiffLine['type'] = 'header';
      if (isDeletedFile) {
        type = 'header-remove'; // Deleted file - red
      } else if (isNewFile) {
        type = 'header-add'; // New file - green
      }
      result.push({ type, content: line });
    } else if (line.startsWith('diff ') || line.startsWith('index ')) {
      result.push({ type: 'header', content: line });
    } else {
      result.push({
        type: 'context',
        content: line.startsWith(' ') ? line.slice(1) : line,
        oldLineNum: oldLine++,
        newLineNum: newLine++,
      });
    }
  }

  return result;
};

const DiffLineComponent = memo(function DiffLineComponent({ line }: { line: DiffLine }) {
  const styles = {
    add: {
      bg: 'var(--color-git-add-bg)',
      borderLeft: '3px solid var(--color-git-add)',
      text: 'var(--color-git-add)',
      lineNumBg: 'var(--color-git-add-line-bg)',
    },
    remove: {
      bg: 'var(--color-git-remove-bg)',
      borderLeft: '3px solid var(--color-git-remove)',
      text: 'var(--color-git-remove)',
      lineNumBg: 'var(--color-git-remove-line-bg)',
    },
    context: {
      bg: 'transparent',
      borderLeft: '3px solid transparent',
      text: 'var(--text-primary)',
      lineNumBg: 'transparent',
    },
    header: {
      bg: 'var(--surface-elevated)',
      borderLeft: '3px solid var(--color-brand-500)',
      text: 'var(--text-secondary)',
      lineNumBg: 'transparent',
    },
    'header-add': {
      bg: 'var(--color-git-add-bg)',
      borderLeft: '3px solid var(--color-git-add)',
      text: 'var(--color-git-add)',
      lineNumBg: 'transparent',
    },
    'header-remove': {
      bg: 'var(--color-git-remove-bg)',
      borderLeft: '3px solid var(--color-git-remove)',
      text: 'var(--color-git-remove)',
      lineNumBg: 'transparent',
    },
  };

  const style = styles[line.type];
  const prefix = { add: '+', remove: '-', context: ' ', header: '', 'header-add': '', 'header-remove': '' }[line.type];

  if (line.type === 'header' || line.type === 'header-add' || line.type === 'header-remove') {
    return (
      <div
        className="flex font-mono text-xs py-2 px-4"
        style={{
          backgroundColor: style.bg,
          borderLeft: style.borderLeft,
          color: style.text,
        }}
      >
        <span className="font-semibold">{line.content}</span>
      </div>
    );
  }

  return (
    <div
      className="flex font-mono text-xs group"
      style={{
        backgroundColor: style.bg,
        borderLeft: style.borderLeft,
      }}
    >
      {/* Line numbers */}
      <div
        className="flex select-none"
        style={{
          backgroundColor: style.lineNumBg,
        }}
      >
        <span
          className="w-12 text-right px-2 py-0.5"
          style={{
            color: 'var(--text-tertiary)',
            borderRight: '1px solid var(--border)',
          }}
        >
          {line.oldLineNum ?? ''}
        </span>
        <span
          className="w-12 text-right px-2 py-0.5"
          style={{
            color: 'var(--text-tertiary)',
            borderRight: '1px solid var(--border)',
          }}
        >
          {line.newLineNum ?? ''}
        </span>
      </div>

      {/* Prefix */}
      <span
        className="w-6 text-center py-0.5 select-none font-bold"
        style={{ color: style.text }}
      >
        {prefix}
      </span>

      {/* Content */}
      <pre
        className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all"
        style={{ color: style.text }}
      >
        {line.content || ' '}
      </pre>
    </div>
  );
});

export const GitDiffViewer = memo(function GitDiffViewer({
  diff,
  isLoading,
  onClose,
}: GitDiffViewerProps) {
  const parsedLines = useMemo(() => {
    if (!diff?.diff) return [];
    return parseDiff(diff.diff);
  }, [diff]);

  const stats = useMemo(() => {
    const additions = parsedLines.filter((l) => l.type === 'add').length;
    const deletions = parsedLines.filter((l) => l.type === 'remove').length;
    return { additions, deletions };
  }, [parsedLines]);

  // Extract filename for display
  const fileName = diff?.filePath?.split('/').pop() ?? '';
  const directory = diff?.filePath?.includes('/')
    ? diff.filePath.substring(0, diff.filePath.lastIndexOf('/'))
    : '';

  if (isLoading) {
    return (
      <div
        className="h-full rounded-2xl flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-2xl), 0 0 40px -15px var(--color-primary-alpha)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="animate-spin rounded-full h-10 w-10 border-2"
            style={{
              borderColor: 'var(--border)',
              borderTopColor: 'var(--color-brand-500)',
            }}
          />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading diff...
          </p>
        </div>
      </div>
    );
  }

  if (!diff) {
    return (
      <div
        className="h-full rounded-2xl flex flex-col items-center justify-center text-center p-8 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-2xl), 0 0 40px -15px var(--color-primary-alpha)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Ambient glow effect */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle, var(--color-primary), transparent)',
          }}
        />
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 10%, transparent)',
          }}
        >
          <FileSearch
            className="w-10 h-10"
            style={{ color: 'var(--color-brand-500)' }}
          />
        </div>
        <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          Select a file to view diff
        </p>
        <p className="text-sm mt-2 max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
          Click on any file in the changes panel to see what's changed
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-full rounded-2xl flex flex-col overflow-hidden relative"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-2xl), 0 0 40px -15px var(--color-primary-alpha)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Ambient glow effect */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--color-primary), transparent)',
        }}
      />
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* File icon */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <Code2 className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </div>

          {/* File info */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-semibold truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {fileName}
              </span>
              {/* Stats badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {stats.additions > 0 && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: 'var(--color-git-add-line-bg)',
                    }}
                  >
                    <Plus className="w-3 h-3" style={{ color: 'var(--color-git-add)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-git-add)' }}>
                      {stats.additions}
                    </span>
                  </div>
                )}
                {stats.deletions > 0 && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: 'var(--color-git-remove-line-bg)',
                    }}
                  >
                    <Minus className="w-3 h-3" style={{ color: 'var(--color-git-remove)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-git-remove)' }}>
                      {stats.deletions}
                    </span>
                  </div>
                )}
                {stats.additions === 0 && stats.deletions === 0 && (
                  <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    Binary or metadata change
                  </span>
                )}
              </div>
            </div>
            {directory && (
              <p
                className="text-xs truncate mt-0.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {directory}
              </p>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
          }}
          title="Close diff"
        >
          <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* Diff content */}
      <div
        className="flex-1 overflow-auto"
        style={{
          backgroundColor: 'var(--surface-elevated)',
        }}
      >
        {parsedLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--text-tertiary) 10%, transparent)',
              }}
            >
              <FileCode className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              No changes in this file
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              The file content is identical
            </p>
          </div>
        ) : (
          <div className="min-w-fit">
            {parsedLines.map((line, idx) => (
              <DiffLineComponent key={idx} line={line} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
