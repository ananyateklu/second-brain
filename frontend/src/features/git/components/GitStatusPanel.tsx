/**
 * Git Status Panel Component
 * Displays staged, unstaged, and untracked files with actions
 */

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  GitCommit,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useBoundStore } from '../../../store/bound-store';
import { GitFileItem } from './GitFileItem';
import { GitDiscardDialog } from './GitDiscardDialog';
import { useStageFiles, useUnstageFiles, useStageAll, useUnstageAll, useCommit } from '../hooks';
import type { GitStatus, GitFileChange } from '../../../types/git';

interface GitStatusPanelProps {
  status: GitStatus;
  onViewDiff: (filePath: string, staged: boolean) => void;
}

interface FileSectionProps {
  title: string;
  files: GitFileChange[];
  isExpanded: boolean;
  onToggle: () => void;
  activeFile: string | null;
  onViewDiff: (filePath: string) => void;
  onStage?: (file: GitFileChange) => void;
  onUnstage?: (file: GitFileChange) => void;
  onDiscard?: (file: GitFileChange) => void;
  actions?: React.ReactNode;
  icon: React.ReactNode;
  accentColor: string;
}

const FileSection = memo(function FileSection({
  title,
  files,
  isExpanded,
  onToggle,
  activeFile,
  onViewDiff,
  onStage,
  onUnstage,
  onDiscard,
  actions,
  icon,
  accentColor,
}: FileSectionProps) {
  if (files.length === 0) return null;

  return (
    <div>
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors duration-150"
        onClick={onToggle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 5%, transparent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="transition-transform duration-200"
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              color: accentColor,
            }}
          >
            {icon}
          </div>
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {title}
          </span>
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              color: accentColor,
            }}
          >
            {files.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {actions && (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* File List */}
      {isExpanded && (
        <div className="py-1">
          {files.map((file) => (
            <GitFileItem
              key={file.filePath}
              file={file}
              isActive={activeFile === file.filePath}
              onViewDiff={onViewDiff}
              onStage={onStage}
              onUnstage={onUnstage}
              onDiscard={onDiscard}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Action button for section headers
const ActionButton = ({
  onClick,
  disabled,
  children,
  variant = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'default' | 'stage' | 'unstage' | 'discard';
}) => {
  const baseStyles = 'text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50';
  const variantStyles = {
    default: '',
    stage: 'hover:bg-green-500/10 hover:text-green-500',
    unstage: 'hover:bg-red-500/10 hover:text-red-500',
    discard: 'hover:bg-red-500/10 hover:text-red-500',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]}`}
      style={{
        color: 'var(--text-secondary)',
        backgroundColor: 'transparent',
      }}
    >
      {children}
    </button>
  );
};

export const GitStatusPanel = memo(function GitStatusPanel({
  status,
  onViewDiff,
}: GitStatusPanelProps) {
  const selectedDiffFile = useBoundStore((state) => state.selectedDiffFile);
  const setSelectedDiffFile = useBoundStore((state) => state.setSelectedDiffFile);

  const stageFiles = useStageFiles();
  const unstageFiles = useUnstageFiles();
  const stageAll = useStageAll();
  const unstageAll = useUnstageAll();
  const commit = useCommit();

  // Commit message state
  const [commitMessage, setCommitMessage] = useState('');
  const commitTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = commitTextareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, with a max height constraint
      const maxHeight = 200; // Maximum height in pixels (about 8-9 lines)
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      // Enable scrolling if content exceeds max height
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [commitMessage]);

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    staged: true,
    unstaged: true,
  });

  // Discard dialog state
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [filesToDiscard, setFilesToDiscard] = useState<GitFileChange[]>([]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Individual file stage handler
  const handleStageFile = useCallback((file: GitFileChange) => {
    stageFiles.mutate([file.filePath]);
  }, [stageFiles]);

  // Individual file unstage handler
  const handleUnstageFile = useCallback((file: GitFileChange) => {
    unstageFiles.mutate([file.filePath]);
  }, [unstageFiles]);

  const handleDiscardFile = useCallback((file: GitFileChange) => {
    setFilesToDiscard([file]);
    setDiscardDialogOpen(true);
  }, []);

  const handleDiscardAll = useCallback(() => {
    setFilesToDiscard(status.unstagedChanges);
    setDiscardDialogOpen(true);
  }, [status.unstagedChanges]);

  const handleDiscardSuccess = useCallback(() => {
    // Clear the selected diff after discarding files
    setSelectedDiffFile(null, false);
  }, [setSelectedDiffFile]);

  const handleViewStagedDiff = useCallback(
    (filePath: string) => onViewDiff(filePath, true),
    [onViewDiff]
  );

  const handleViewUnstagedDiff = useCallback(
    (filePath: string) => onViewDiff(filePath, false),
    [onViewDiff]
  );

  const handleCommit = useCallback(() => {
    if (!commitMessage.trim() || status.stagedChanges.length === 0) return;
    commit.mutate(commitMessage.trim(), {
      onSuccess: () => {
        setCommitMessage('');
      },
    });
  }, [commitMessage, status.stagedChanges.length, commit]);

  const handleCommitKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && e.metaKey) {
        e.preventDefault();
        handleCommit();
      }
    },
    [handleCommit]
  );

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
      }}
    >
      {/* Commit Input Section */}
      <div className="p-3 flex-shrink-0">
        {/* Commit message input */}
        <div className="flex gap-2">
          <textarea
            ref={commitTextareaRef}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={handleCommitKeyDown}
            placeholder="Commit message..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-xl text-sm resize-none transition-all duration-200 focus:outline-none"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              minHeight: '36px',
              maxHeight: '120px',
              overflowY: 'hidden',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-brand-500)';
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary-alpha)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          {/* Commit button */}
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || status.stagedChanges.length === 0 || commit.isPending}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: status.stagedChanges.length > 0 && commitMessage.trim() ? 'var(--color-brand-500)' : 'var(--surface-elevated)',
              color: status.stagedChanges.length > 0 && commitMessage.trim() ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
            title="Commit staged changes (Cmd+Enter)"
          >
            {commit.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitCommit className="w-4 h-4" />
            )}
            {status.stagedChanges.length > 0 && (
              <span className="text-xs font-semibold">{status.stagedChanges.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* File sections */}
      <div
        className="flex-1 overflow-y-auto border-t thin-scrollbar"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Staged Changes */}
        <FileSection
          title="Staged"
          files={status.stagedChanges}
          isExpanded={expandedSections.staged}
          onToggle={() => toggleSection('staged')}
          activeFile={selectedDiffFile}
          onViewDiff={handleViewStagedDiff}
          onUnstage={handleUnstageFile}
          icon={
            <ChevronRight
              className="w-3.5 h-3.5"
              style={{ color: 'var(--color-git-add)' }}
            />
          }
          accentColor="var(--color-git-add)"
          actions={
            status.stagedChanges.length > 0 && (
              <ActionButton
                onClick={() => unstageAll.mutate()}
                disabled={unstageAll.isPending}
                variant="unstage"
              >
                Unstage All
              </ActionButton>
            )
          }
        />

        {/* Unstaged Changes (Modified + Untracked) */}
        <FileSection
          title="Unstaged"
          files={[...status.unstagedChanges, ...status.untrackedFiles]}
          isExpanded={expandedSections.unstaged}
          onToggle={() => toggleSection('unstaged')}
          activeFile={selectedDiffFile}
          onViewDiff={handleViewUnstagedDiff}
          onStage={handleStageFile}
          onDiscard={handleDiscardFile}
          icon={
            <ChevronRight
              className="w-3.5 h-3.5"
              style={{ color: 'var(--color-git-modified)' }}
            />
          }
          accentColor="var(--color-git-modified)"
          actions={
            (status.unstagedChanges.length > 0 || status.untrackedFiles.length > 0) && (
              <div className="flex items-center gap-1">
                {status.unstagedChanges.length > 0 && (
                  <ActionButton
                    onClick={handleDiscardAll}
                    variant="discard"
                  >
                    Discard All
                  </ActionButton>
                )}
                <ActionButton
                  onClick={() => stageAll.mutate()}
                  disabled={stageAll.isPending}
                  variant="stage"
                >
                  Stage All
                </ActionButton>
              </div>
            )
          }
        />

        {/* Empty state */}
        {!status.hasChanges && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 10%, transparent)',
              }}
            >
              <CheckCircle2
                className="w-6 h-6"
                style={{ color: 'var(--color-brand-500)' }}
              />
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              No changes
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Working directory is clean
            </p>
          </div>
        )}
      </div>

      {/* Footer with file count */}
      {status.hasChanges && (
        <div
          className="px-3 py-2 text-xs flex-shrink-0 border-t"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-tertiary)',
            backgroundColor: 'var(--surface-card)',
          }}
        >
          {status.stagedChanges.length + status.unstagedChanges.length + status.untrackedFiles.length} changed files
        </div>
      )}

      {/* Discard confirmation dialog */}
      <GitDiscardDialog
        isOpen={discardDialogOpen}
        onClose={() => setDiscardDialogOpen(false)}
        files={filesToDiscard}
        onSuccess={handleDiscardSuccess}
      />
    </div>
  );
});
