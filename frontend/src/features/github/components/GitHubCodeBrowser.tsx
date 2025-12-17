import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, GitBranch, AlertCircle } from 'lucide-react';
import { useGitHubBranches, useGitHubRepositoryTree, useGitHubFileContent } from '../hooks';
import type { BranchSummary } from '../../../types/github';
import { FileTreeView } from './code-browser/FileTreeView';
import { CodeViewer } from './code-browser/CodeViewer';

interface GitHubCodeBrowserProps {
  owner?: string;
  repo?: string;
}

export function GitHubCodeBrowser({ owner, repo }: GitHubCodeBrowserProps) {
  // Track user's manual branch selection (null = use default)
  const [userSelectedBranchName, setUserSelectedBranchName] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  // Fetch branches
  const {
    data: branchesData,
    isLoading: branchesLoading,
    error: branchesError,
  } = useGitHubBranches(owner, repo);

  // Derive the active branch from user selection or default
  const branches = branchesData?.branches;
  const selectedBranch = useMemo((): BranchSummary | null => {
    if (!branches?.length) return null;

    // If user has selected a branch, use that
    if (userSelectedBranchName) {
      const userBranch = branches.find(b => b.name === userSelectedBranchName);
      if (userBranch) return userBranch;
    }

    // Otherwise, use default branch or first branch
    const defaultBranch = branches.find(b => b.isDefault);
    return defaultBranch ?? branches[0] ?? null;
  }, [branches, userSelectedBranchName]);

  // Fetch repository tree based on selected branch
  const treeRequest = useMemo(() => {
    const commitSha = selectedBranch?.commitSha;
    if (!commitSha) return null;
    return {
      treeSha: commitSha,
      owner,
      repo,
    };
  }, [selectedBranch?.commitSha, owner, repo]);

  const {
    data: treeData,
    isLoading: treeLoading,
    error: treeError,
  } = useGitHubRepositoryTree(treeRequest);

  // Fetch file content based on selected file
  const fileRequest = useMemo(() => {
    if (!selectedFilePath) return null;
    return {
      path: selectedFilePath,
      ref: selectedBranch?.name,
      owner,
      repo,
    };
  }, [selectedFilePath, selectedBranch?.name, owner, repo]);

  const {
    data: fileContent,
    isLoading: fileLoading,
    error: fileError,
  } = useGitHubFileContent(fileRequest);

  // Handle branch selection
  const handleBranchSelect = useCallback((branch: BranchSummary) => {
    setUserSelectedBranchName(branch.name);
    setSelectedFilePath(null); // Reset file selection when branch changes
    setIsBranchDropdownOpen(false);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((path: string) => {
    setSelectedFilePath(path);
  }, []);

  // If no repository is configured
  if (!owner || !repo) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 10%, transparent)' }}
        >
          <AlertCircle className="h-8 w-8" style={{ color: 'var(--color-brand-500)' }} />
        </div>
        <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No repository selected</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Please configure a GitHub repository first</p>
      </div>
    );
  }

  // Branch loading/error state
  if (branchesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--color-brand-500)' }}
        />
      </div>
    );
  }

  if (branchesError) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)' }}
        >
          <AlertCircle className="h-8 w-8" style={{ color: 'var(--color-error)' }} />
        </div>
        <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Failed to load branches</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {branchesError.message}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Branch selector header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="relative">
          <button
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <GitBranch className="h-4 w-4" style={{ color: 'var(--color-brand-500)' }} />
            <span className="max-w-[150px] truncate">
              {selectedBranch?.name || 'Select branch'}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isBranchDropdownOpen ? 'rotate-180' : ''
              }`}
              style={{ color: 'var(--text-tertiary)' }}
            />
          </button>

          {/* Branch dropdown */}
          {isBranchDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsBranchDropdownOpen(false)}
              />
              <div
                className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-auto rounded-lg border z-20 thin-scrollbar"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  boxShadow: 'var(--shadow-lg)',
                  animation: 'scale-in 0.15s ease-out',
                }}
              >
                {branchesData?.branches.map((branch) => {
                  const isSelected = selectedBranch?.name === branch.name;
                  return (
                    <button
                      key={branch.name}
                      onClick={() => handleBranchSelect(branch)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-all duration-150"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-primary-alpha)'
                          : 'transparent',
                        color: isSelected
                          ? 'var(--color-brand-400)'
                          : 'var(--text-primary)',
                        borderLeft: isSelected
                          ? '3px solid var(--color-brand-500)'
                          : '3px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--foreground) 5%, transparent)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <GitBranch className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{branch.name}</span>
                      {branch.isDefault && (
                        <span
                          className="ml-auto text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--surface-card)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          default
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {selectedBranch && (
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {treeData?.totalCount?.toLocaleString() ?? '...'} entries
          </span>
        )}
      </div>

      {/* Main content area - two pane layout */}
      <div className="flex flex-1 min-h-0">
        {/* File tree sidebar with glassmorphism */}
        <div
          className="w-72 flex-shrink-0 overflow-hidden"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            borderRight: '1px solid var(--glass-border)',
          }}
        >
          <FileTreeView
            entries={treeData?.entries ?? []}
            truncated={treeData?.truncated ?? false}
            isLoading={treeLoading}
            error={treeError}
            selectedPath={selectedFilePath}
            onSelectFile={handleFileSelect}
          />
        </div>

        {/* Code viewer */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <CodeViewer
            content={fileContent ?? null}
            isLoading={fileLoading}
            error={fileError}
            selectedPath={selectedFilePath}
          />
        </div>
      </div>
    </div>
  );
}
