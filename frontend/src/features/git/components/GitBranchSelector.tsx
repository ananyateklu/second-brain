/**
 * Git Branch Selector Component
 * Dropdown to view, switch, create, and delete branches
 */

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  GitBranch,
  ChevronDown,
  Check,
  Plus,
  Trash2,
  Cloud,
  Loader2,
  Search,
  X,
  GitMerge,
  Upload,
} from 'lucide-react';
import { useGitBranches, useSwitchBranch, useCreateBranch, useDeleteBranch, usePublishBranch } from '../hooks';
import type { GitBranch as GitBranchType } from '../../../types/git';

interface GitBranchSelectorProps {
  currentBranch: string;
}

export const GitBranchSelector = memo(function GitBranchSelector({
  currentBranch,
}: GitBranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const newBranchInputRef = useRef<HTMLInputElement>(null);

  const { data: branches, isLoading } = useGitBranches();
  const switchBranch = useSwitchBranch();
  const createBranch = useCreateBranch();
  const deleteBranch = useDeleteBranch();
  const publishBranch = usePublishBranch();

  // Update dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsCreating(false);
        setDeleteConfirm(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Focus new branch input when creating
  useEffect(() => {
    if (isCreating && newBranchInputRef.current) {
      newBranchInputRef.current.focus();
    }
  }, [isCreating]);

  // Filter branches based on search
  const filteredBranches = useMemo(() => {
    if (!branches) return { local: [], remote: [] };

    const query = searchQuery.toLowerCase();
    const filtered = branches.filter((b) =>
      b.name.toLowerCase().includes(query)
    );

    return {
      local: filtered.filter((b) => !b.isRemote),
      remote: filtered.filter((b) => b.isRemote),
    };
  }, [branches, searchQuery]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery('');
      setIsCreating(false);
      setDeleteConfirm(null);
    }
  }, [isOpen]);

  const handleSwitchBranch = useCallback(
    (branch: GitBranchType) => {
      if (branch.isCurrent) return;
      switchBranch.mutate(branch.name, {
        onSuccess: () => {
          setIsOpen(false);
        },
      });
    },
    [switchBranch]
  );

  const handleCreateBranch = useCallback(() => {
    if (!newBranchName.trim()) return;
    createBranch.mutate(
      { branchName: newBranchName.trim(), switchToNewBranch: true },
      {
        onSuccess: () => {
          setNewBranchName('');
          setIsCreating(false);
          setIsOpen(false);
        },
      }
    );
  }, [newBranchName, createBranch]);

  const handleDeleteBranch = useCallback(
    (branchName: string) => {
      deleteBranch.mutate(
        { branchName, force: false },
        {
          onSuccess: () => {
            setDeleteConfirm(null);
          },
        }
      );
    },
    [deleteBranch]
  );

  const handlePublishBranch = useCallback(
    (branchName: string) => {
      publishBranch.mutate({ branchName });
    },
    [publishBranch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreating) {
          setIsCreating(false);
          setNewBranchName('');
        } else {
          setIsOpen(false);
        }
      }
      if (e.key === 'Enter' && isCreating) {
        handleCreateBranch();
      }
    },
    [isCreating, handleCreateBranch]
  );

  const renderBranchItem = (branch: GitBranchType) => {
    const isDeleting = deleteConfirm === branch.name;

    return (
      <div
        key={branch.name}
        className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-150 ${branch.isCurrent ? 'bg-green-500/10' : 'hover:bg-[var(--surface-hover)]'
          }`}
        onClick={() => !isDeleting && handleSwitchBranch(branch)}
      >
        {/* Branch icon / Check mark */}
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {branch.isCurrent ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : branch.isRemote ? (
            <Cloud className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
          ) : (
            <GitBranch className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>

        {/* Branch name */}
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm truncate block ${branch.isCurrent ? 'font-semibold' : ''}`}
            style={{ color: branch.isCurrent ? '#22c55e' : 'var(--text-primary)' }}
          >
            {branch.name}
          </span>
          {branch.lastCommitMessage && (
            <span
              className="text-xs truncate block"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {branch.lastCommitMessage}
            </span>
          )}
        </div>

        {/* Actions for local branches */}
        {!branch.isRemote && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isDeleting ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBranch(branch.name);
                  }}
                  className="px-2 py-1 text-xs font-medium rounded bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(null);
                  }}
                  className="px-2 py-1 text-xs font-medium rounded hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {/* Publish button (only for branches without upstream) */}
                {!branch.upstream && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePublishBranch(branch.name);
                    }}
                    disabled={publishBranch.isPending}
                    className="p-1 rounded hover:bg-[var(--color-brand-500)]/20 transition-colors disabled:opacity-50"
                    title="Publish branch to remote"
                  >
                    {publishBranch.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-brand-500)' }} />
                    ) : (
                      <Upload className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-500)' }} />
                    )}
                  </button>
                )}
                {/* Delete button (only for non-current branches) */}
                {!branch.isCurrent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(branch.name);
                    }}
                    className="p-1 rounded hover:bg-red-500/20 transition-colors"
                    title="Delete branch"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Upstream indicator (always visible when tracking) */}
        {branch.upstream && !branch.isRemote && (
          <div className="flex items-center gap-1 flex-shrink-0" title={`Tracks ${branch.upstream}`}>
            <GitMerge className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}
      </div>
    );
  };

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      className="fixed w-80 max-h-96 overflow-hidden rounded-xl z-[9999]"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-2xl), 0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Search / Create input */}
      <div
        className="p-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {isCreating ? (
          <div className="flex items-center gap-2">
            <input
              ref={newBranchInputRef}
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="New branch name..."
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-transparent outline-none"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim() || createBranch.isPending}
              className="p-2 rounded-lg transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-brand-500)',
                color: 'white',
              }}
            >
              {createBranch.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewBranchName('');
              }}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
            >
              <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branches..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-transparent outline-none"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-secondary)' }}
              title="Create new branch"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Branch list */}
      <div className="overflow-y-auto max-h-72">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : (
          <>
            {/* Local branches */}
            {filteredBranches.local.length > 0 && (
              <div>
                <div
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Local
                </div>
                {filteredBranches.local.map(renderBranchItem)}
              </div>
            )}

            {/* Remote branches */}
            {filteredBranches.remote.length > 0 && (
              <div>
                <div
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    color: 'var(--text-tertiary)',
                    borderTop: filteredBranches.local.length > 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  Remote
                </div>
                {filteredBranches.remote.map(renderBranchItem)}
              </div>
            )}

            {/* Empty state */}
            {filteredBranches.local.length === 0 && filteredBranches.remote.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {searchQuery ? 'No branches found' : 'No branches available'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 h-10 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        <GitBranch className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-500)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {currentBranch || 'No branch'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
        />
      </button>

      {/* Dropdown rendered via portal */}
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
});
