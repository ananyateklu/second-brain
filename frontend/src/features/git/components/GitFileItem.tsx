/**
 * Git File Item Component
 * Displays a single file change with status badge and actions
 */

import { memo, useCallback, useState, useMemo } from 'react';
import { ArrowRight, Undo2, Plus, Minus, Loader2 } from 'lucide-react';
import { getIcon } from 'material-file-icons';
import type { GitFileChange, GitFileStatus } from '../../../types/git';

interface GitFileItemProps {
  file: GitFileChange;
  isActive: boolean;
  onViewDiff: (filePath: string) => void;
  onStage?: (file: GitFileChange) => void;
  onUnstage?: (file: GitFileChange) => void;
  onDiscard?: (file: GitFileChange) => void;
  /** Whether this file is currently being staged (optimistic UI) */
  isPendingStage?: boolean;
  /** Whether this file is currently being unstaged (optimistic UI) */
  isPendingUnstage?: boolean;
}

// Get status-specific styling using theme colors
const getStatusStyles = (status: GitFileStatus): {
  color: string;
  bgColor: string;
  label: string;
  displayStatus: string;
} => {
  switch (status) {
    case 'M':
      return {
        color: 'var(--color-git-modified)',
        bgColor: 'var(--color-git-modified-bg)',
        label: 'Modified',
        displayStatus: 'M',
      };
    case 'A':
      return {
        color: 'var(--color-git-add)',
        bgColor: 'var(--color-git-add-line-bg)',
        label: 'Added',
        displayStatus: 'A',
      };
    case 'D':
      return {
        color: 'var(--color-git-remove)',
        bgColor: 'var(--color-git-remove-line-bg)',
        label: 'Deleted',
        displayStatus: 'D',
      };
    case 'R':
      return {
        color: 'var(--color-accent-blue)',
        bgColor: 'var(--color-accent-blue-alpha)',
        label: 'Renamed',
        displayStatus: 'R',
      };
    case 'C':
      return {
        color: 'var(--color-accent-blue)',
        bgColor: 'var(--color-accent-blue-alpha)',
        label: 'Copied',
        displayStatus: 'C',
      };
    case '?':
      return {
        color: 'var(--color-git-add)',
        bgColor: 'var(--color-git-add-line-bg)',
        label: 'Untracked',
        displayStatus: 'U', // Display as U to match VS Code convention
      };
    case 'U':
      return {
        color: 'var(--color-warning)',
        bgColor: 'var(--color-warning-light)',
        label: 'Unmerged',
        displayStatus: 'U',
      };
    default:
      return {
        color: 'var(--text-tertiary)',
        bgColor: 'color-mix(in srgb, var(--text-tertiary) 10%, transparent)',
        label: 'Unknown',
        displayStatus: '?',
      };
  }
};

// Material file icon component using material-file-icons library
const MaterialFileIcon = memo(function MaterialFileIcon({ fileName }: { fileName: string }) {
  const icon = useMemo(() => getIcon(fileName), [fileName]);

  return (
    <div
      className="w-4 h-4 flex items-center justify-center"
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  );
});

export const GitFileItem = memo(function GitFileItem({
  file,
  isActive,
  onViewDiff,
  onStage,
  onUnstage,
  onDiscard,
  isPendingStage = false,
  isPendingUnstage = false,
}: GitFileItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const statusStyles = getStatusStyles(file.status);
  const isPending = isPendingStage || isPendingUnstage;

  const handleClick = useCallback(() => {
    onViewDiff(file.filePath);
  }, [file.filePath, onViewDiff]);

  const handleStageClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStage?.(file);
    },
    [file, onStage]
  );

  const handleUnstageClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onUnstage?.(file);
    },
    [file, onUnstage]
  );

  const handleDiscardClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDiscard?.(file);
    },
    [file, onDiscard]
  );

  // Extract filename from path
  const pathParts = file.filePath.split('/').filter(Boolean);
  const fileName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : file.filePath;
  const directory = pathParts.length > 1
    ? pathParts.slice(0, -1).join('/')
    : '';

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center gap-3 py-1.5 px-3 cursor-pointer transition-all duration-200"
      style={{
        backgroundColor: isActive
          ? 'color-mix(in srgb, var(--color-brand-500) 15%, transparent)'
          : isHovered
            ? 'color-mix(in srgb, var(--surface-hover) 70%, transparent)'
            : 'transparent',
        transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
      }}
    >
      {/* File type icon */}
      <div
        className="flex items-center justify-center w-4 h-4 rounded-lg flex-shrink-0 transition-all duration-200"
        style={{
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        <MaterialFileIcon fileName={fileName} />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 truncate">
          <span
            className="text-sm font-medium flex-shrink-0"
            style={{ color: 'var(--text-primary)' }}
          >
            {fileName}
          </span>
          {directory && (
            <span
              className="text-xs truncate"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {directory}
            </span>
          )}
          {file.oldPath && (
            <span
              className="text-xs flex items-center gap-1 flex-shrink-0"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <ArrowRight className="w-3 h-3" />
              {file.oldPath.split('/').pop()}
            </span>
          )}
        </div>
      </div>

      {/* Actions and Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Show loading spinner when operation is pending */}
        {isPending ? (
          <div className="flex items-center justify-center w-7 h-7">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-secondary)' }} />
          </div>
        ) : (
          <>
            {/* Discard button (show on hover or when selected for unstaged/untracked files) */}
            {onDiscard && (isHovered || isActive) && (
              <button
                onClick={handleDiscardClick}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                title="Discard changes"
              >
                <Undo2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            )}

            {/* Stage button (show on hover or when selected for unstaged/untracked files) */}
            {onStage && (isHovered || isActive) && (
              <button
                onClick={handleStageClick}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                title="Stage file"
              >
                <Plus className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            )}

            {/* Unstage button (show on hover or when selected for staged files) */}
            {onUnstage && (isHovered || isActive) && (
              <button
                onClick={handleUnstageClick}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                title="Unstage file"
              >
                <Minus className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            )}
          </>
        )}

        {/* Status badge */}
        <div
          className="flex items-center justify-center px-1.5 py-1 transition-all duration-200"
          style={{
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            opacity: isPending ? 0.5 : 1,
          }}
          title={statusStyles.label}
        >
          <span
            className="text-xs font-semibold"
            style={{ color: statusStyles.color }}
          >
            {statusStyles.displayStatus}
          </span>
        </div>
      </div>
    </div>
  );
});
