import { useState, useMemo, useCallback, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useGitHubBranches, useGitHubRepositoryTree, useGitHubFileContent } from '../hooks';
import type { BranchSummary } from '../../../types/github';
import { FileTreeView } from './code-browser/FileTreeView';
import { CodeViewer } from './code-browser/CodeViewer';
import { useBoundStore } from '../../../store/bound-store';
import { useShallow } from 'zustand/react/shallow';

interface GitHubCodeBrowserProps {
  owner?: string;
  repo?: string;
}

export function GitHubCodeBrowser({ owner, repo }: GitHubCodeBrowserProps) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [prevBranch, setPrevBranch] = useState<string | null>(null);

  // Get branch from store
  const githubSelectedBranch = useBoundStore((state) => state.githubSelectedBranch);

  // Mobile sidebar state
  const { showMobileFileTree, setShowMobileFileTree } = useBoundStore(
    useShallow((state) => ({
      showMobileFileTree: state.showMobileFileTree,
      setShowMobileFileTree: state.setShowMobileFileTree,
    }))
  );

  // Close mobile sidebar on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMobileFileTree) {
        setShowMobileFileTree(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showMobileFileTree, setShowMobileFileTree]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (showMobileFileTree) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileFileTree]);

  // Reset file selection when branch changes (React recommended pattern for derived state)
  if (githubSelectedBranch !== prevBranch) {
    setPrevBranch(githubSelectedBranch);
    setSelectedFilePath(null);
  }

  // Fetch branches
  const {
    data: branchesData,
    isLoading: branchesLoading,
    error: branchesError,
  } = useGitHubBranches(owner, repo);

  // Derive the active branch from store selection or default
  const branches = branchesData?.branches;
  const selectedBranch = useMemo((): BranchSummary | null => {
    if (!branches?.length) return null;

    // If user has selected a branch, use that
    if (githubSelectedBranch) {
      const userBranch = branches.find(b => b.name === githubSelectedBranch);
      if (userBranch) return userBranch;
    }

    // Otherwise, use default branch or first branch
    const defaultBranch = branches.find(b => b.isDefault);
    return defaultBranch ?? branches[0] ?? null;
  }, [branches, githubSelectedBranch]);

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

  // Handle file selection - close mobile sidebar after selection
  const handleFileSelect = useCallback((path: string) => {
    setSelectedFilePath(path);
    // Close mobile sidebar after file selection
    setShowMobileFileTree(false);
  }, [setShowMobileFileTree]);

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
      className="flex flex-col h-full overflow-hidden"
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* Main content area - two pane layout */}
      <div className="flex flex-1 min-h-0">
        {/* Mobile: Overlay drawer for file tree */}
        <div className="md:hidden">
          {/* Overlay backdrop */}
          {showMobileFileTree && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-200"
              onClick={() => setShowMobileFileTree(false)}
              aria-hidden="true"
            />
          )}
          {/* Slide-in drawer */}
          <div
            className={`fixed inset-y-0 left-0 w-72 max-w-[80vw] z-60 transform transition-transform duration-300 ease-out backdrop-blur-sm rounded-r-xl ${
              showMobileFileTree ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 95%, transparent)',
              borderRight: '1px solid color-mix(in srgb, var(--text-primary) 8%, transparent)',
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
        </div>

        {/* Desktop: File tree sidebar with glass morphism */}
        <div
          className="hidden md:block w-90 flex-shrink-0 overflow-hidden backdrop-blur-sm rounded-l-xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)',
            borderRight: '1px solid color-mix(in srgb, var(--text-primary) 8%, transparent)',
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

        {/* Code viewer - full width on mobile */}
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
