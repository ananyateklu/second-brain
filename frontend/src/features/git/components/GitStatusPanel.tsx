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
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: 'var(--surface-elevated)',
      }}
    >
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-3 cursor-pointer transition-colors duration-200"
        onClick={onToggle}
        style={{
          backgroundColor: isExpanded ? 'transparent' : 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            {icon}
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </span>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              color: accentColor,
            }}
          >
            {files.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="pb-2">
          <div className="space-y-0">
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
      className="h-full flex flex-col overflow-hidden rounded-2xl relative"
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

      {/* Commit Input Section */}
      <div className="px-4 pt-4 pb-3">
        {/* Commit message input */}
        <textarea
          ref={commitTextareaRef}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={handleCommitKeyDown}
          placeholder="Message (Cmd+Enter to commit)"
          rows={1}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-all duration-200 focus:outline-none"
          style={{
            backgroundColor: 'var(--background-primary)',
            border: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
            color: 'var(--text-primary)',
            minHeight: '38px', // Minimum height to match single row
            maxHeight: '200px', // Maximum height before scrolling
            overflowY: 'hidden', // Will be set to 'auto' if content exceeds maxHeight
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-brand-500)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-alpha)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--border) 50%, transparent)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {/* Commit button */}
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || status.stagedChanges.length === 0 || commit.isPending}
          className="group relative flex items-center justify-center gap-2 w-full mt-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            boxShadow: 'var(--btn-primary-shadow)',
          }}
        >
          {/* Shimmer effect */}
          {!commit.isPending && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          )}
          {commit.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin relative z-10" />
              <span className="relative z-10">Committing...</span>
            </>
          ) : (
            <>
              <GitCommit className="w-4 h-4 relative z-10" />
              <span className="relative z-10">
                Commit{status.stagedChanges.length > 0 ? ` (${status.stagedChanges.length})` : ''}
              </span>
            </>
          )}
        </button>
      </div>

      {/* File sections */}
      <div className="flex-1 overflow-y-auto pt-2 pb-3 space-y-3 [scrollbar-width:thin] [scrollbar-color:var(--color-brand-600)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--color-brand-600)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--color-brand-500)]">
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
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 10%, transparent)',
              }}
            >
              <CheckCircle2
                className="w-8 h-8"
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
              Your working directory is clean
            </p>
          </div>
        )}
      </div>

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
