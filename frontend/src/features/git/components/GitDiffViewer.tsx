/**
 * Git Diff Viewer Component
 * Displays file diff with syntax highlighting
 */

import { memo, useMemo } from 'react';
import { X, FileCode, FileSearch } from 'lucide-react';
import { getIcon } from 'material-file-icons';
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

// Material file icon component using material-file-icons library
const MaterialFileIcon = memo(function MaterialFileIcon({ fileName }: { fileName: string }) {
  const icon = useMemo(() => getIcon(fileName), [fileName]);

  return (
    <div
      className="w-5 h-5 flex items-center justify-center"
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  );
});

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
      <div className="flex flex-col items-center justify-center h-full">
        <div
          className="animate-spin rounded-full h-8 w-8 border-2"
          style={{
            borderColor: 'var(--border)',
            borderTopColor: 'var(--color-brand-500)',
          }}
        />
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading diff...
        </p>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 10%, transparent)',
          }}
        >
          <FileSearch
            className="w-10 h-10"
            style={{ color: 'var(--color-brand-500)', opacity: 0.7 }}
          />
        </div>
        <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
          Select a file to view
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Choose a file from the changes on the left
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ animation: 'fadeInSlideUp 0.2s ease-out' }}>
      {/* File header */}
      <div
        className="flex items-center justify-between px-4 py-[16px] border-b flex-shrink-0"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <MaterialFileIcon fileName={fileName} />
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {fileName}
            </span>
            {directory && (
              <span
                className="text-xs truncate hidden sm:block"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {directory}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Stats badges */}
          {stats.additions > 0 && (
            <span className="text-xs font-medium" style={{ color: 'var(--color-git-add)' }}>
              +{stats.additions}
            </span>
          )}
          {stats.deletions > 0 && (
            <span className="text-xs font-medium" style={{ color: 'var(--color-git-remove)' }}>
              -{stats.deletions}
            </span>
          )}
          {stats.additions === 0 && stats.deletions === 0 && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Binary
            </span>
          )}
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-hover)]"
            title="Close diff"
          >
            <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Diff content */}
      <div
        className="flex-1 overflow-auto thin-scrollbar"
        style={{ backgroundColor: 'var(--surface-card)' }}
      >
        {parsedLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--text-tertiary) 10%, transparent)',
              }}
            >
              <FileCode className="w-6 h-6" style={{ color: 'var(--text-tertiary)' }} />
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
