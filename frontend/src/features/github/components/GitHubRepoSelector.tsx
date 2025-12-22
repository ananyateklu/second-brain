import { useState, useRef, useEffect, useMemo } from 'react';
import { useGitHubRepositories } from '../hooks';
import { useBoundStore } from '../../../store/bound-store';
import type { RepositorySummary } from '../../../types/github';

interface RepoConfig {
  owner: string;
  repo: string;
  fullName: string;
}

interface GitHubRepoSelectorProps {
  currentOwner?: string;
  currentRepo?: string;
  fullName?: string;
  htmlUrl?: string;
  onRepoChange: (owner: string, repo: string) => void;
}

const loadRecentRepos = (): RepoConfig[] => {
  try {
    const stored = localStorage.getItem('github_recent_repos');
    return stored ? (JSON.parse(stored) as RepoConfig[]) : [];
  } catch {
    return [];
  }
};

const saveRecentRepos = (repos: RepoConfig[]): void => {
  try {
    localStorage.setItem('github_recent_repos', JSON.stringify(repos));
  } catch {
    // Ignore storage errors
  }
};

export const GitHubRepoSelector = ({
  currentOwner,
  currentRepo,
  fullName,
  htmlUrl,
  onRepoChange,
}: GitHubRepoSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [recentRepos, setRecentRepos] = useState<RepoConfig[]>(() => loadRecentRepos());
  const prevRepoRef = useRef<string | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = useBoundStore((state) => state.theme);
  const isBlueTheme = theme === 'blue';

  // Fetch user's repositories
  const { data: reposData, isLoading: isLoadingRepos, refetch, isFetching } = useGitHubRepositories({
    sort: 'pushed',
    perPage: 100,
  });

  // Filter repositories based on search input
  const repositories = reposData?.repositories;
  const filteredRepos = useMemo(() => {
    if (!repositories) return [];
    if (!inputValue.trim()) return repositories;

    const search = inputValue.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.fullName.toLowerCase().includes(search) ||
        repo.name.toLowerCase().includes(search) ||
        repo.owner.toLowerCase().includes(search)
    );
  }, [repositories, inputValue]);

  // Update recent repos when current repo changes
  useEffect(() => {
    const currentFullName = currentOwner && currentRepo ? `${currentOwner}/${currentRepo}` : undefined;
    if (currentFullName && currentFullName !== prevRepoRef.current && currentOwner && currentRepo) {
      prevRepoRef.current = currentFullName;
      const newRepo: RepoConfig = {
        owner: currentOwner,
        repo: currentRepo,
        fullName: currentFullName,
      };
      setRecentRepos((prev) => {
        const filtered = prev.filter((r) => r.fullName !== newRepo.fullName);
        const updated = [newRepo, ...filtered].slice(0, 5);
        saveRecentRepos(updated);
        return updated;
      });
    }
  }, [currentOwner, currentRepo]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.includes('/')) {
      const [owner, repo] = trimmed.split('/');
      if (owner && repo) {
        onRepoChange(owner.trim(), repo.trim());
        setIsOpen(false);
        setInputValue('');
      }
    }
  };

  const handleSelectRepo = (repo: RepositorySummary | RepoConfig) => {
    const owner = 'owner' in repo && typeof repo.owner === 'string' ? repo.owner : repo.owner;
    const repoName = 'name' in repo ? repo.name : repo.repo;
    onRepoChange(owner, repoName);
    setIsOpen(false);
    setInputValue('');
  };

  // Check if a repo is in the fetched list
  const isRepoInList = (repoFullName: string) => {
    return reposData?.repositories?.some((r) => r.fullName === repoFullName) ?? false;
  };

  // Get recent repos that are NOT in the fetched list (external repos)
  const externalRecentRepos = recentRepos.filter((r) => !isRepoInList(r.fullName));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current repo display / trigger */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-opacity-80 min-w-0 max-w-[20rem]"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
        }}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
        </svg>
        <span className="font-medium truncate min-w-0" title={fullName || 'Select repository'}>
          {fullName || 'Select repository'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl border shadow-lg z-50 overflow-hidden"
          style={{
            backgroundColor: isBlueTheme
              ? 'rgba(10, 22, 40, 0.98)'
              : 'var(--surface-card-solid)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-xl)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          }}
        >
          {/* Search Input */}
          <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputValue.includes('/')) {
                    handleSubmit(inputValue);
                  }
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder="Search or enter owner/repo"
                className="w-full pl-10 pr-3 py-2 rounded-lg text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-[color:var(--color-primary)] focus:ring-opacity-50 focus:border-[color:var(--color-primary)]"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
            {inputValue.includes('/') && (
              <button
                onClick={() => handleSubmit(inputValue)}
                className="mt-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                Go to {inputValue}
              </button>
            )}
          </div>

          {/* Repository List */}
          <div className="max-h-80 overflow-y-auto thin-scrollbar">
            {isLoadingRepos ? (
              <div className="p-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Loading repositories...
                </span>
              </div>
            ) : (
              <>
                {/* Your Repositories */}
                {filteredRepos.length > 0 && (
                  <div className="p-2">
                    <p
                      className="text-xs font-medium px-2 py-1 uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Your Repositories
                    </p>
                    {filteredRepos.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => handleSelectRepo(repo)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-opacity-80"
                        style={{
                          backgroundColor:
                            repo.fullName === fullName
                              ? 'var(--color-primary-alpha)'
                              : 'transparent',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium" title={repo.fullName}>
                                {repo.fullName}
                              </span>
                              {repo.isPrivate && (
                                <svg
                                  className="w-3.5 h-3.5 flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 16 16"
                                  style={{ color: 'var(--text-tertiary)' }}
                                >
                                  <path d="M4 4v2h-.25A1.75 1.75 0 002 7.75v5.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-5.5A1.75 1.75 0 0012.25 6H12V4a4 4 0 10-8 0zm6.5 2V4a2.5 2.5 0 00-5 0v2h5zM12 7.5h.25a.25.25 0 01.25.25v5.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-5.5a.25.25 0 01.25-.25H12z" />
                                </svg>
                              )}
                            </div>
                            {repo.description && (
                              <p
                                className="text-xs truncate mt-0.5"
                                style={{ color: 'var(--text-tertiary)' }}
                                title={repo.description}
                              >
                                {repo.description}
                              </p>
                            )}
                          </div>
                          {repo.fullName === fullName && (
                            <svg
                              className="w-4 h-4 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* External Recent Repos (not in user's repos) */}
                {externalRecentRepos.length > 0 && !inputValue && (
                  <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p
                      className="text-xs font-medium px-2 py-1 uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Recent External
                    </p>
                    {externalRecentRepos.map((repo) => (
                      <button
                        key={repo.fullName}
                        onClick={() => handleSelectRepo(repo)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-opacity-80"
                        style={{
                          backgroundColor:
                            repo.fullName === fullName
                              ? 'var(--color-primary-alpha)'
                              : 'transparent',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
                          </svg>
                          <span className="truncate min-w-0" title={repo.fullName}>
                            {repo.fullName}
                          </span>
                          {repo.fullName === fullName && (
                            <svg
                              className="w-4 h-4 ml-auto flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {filteredRepos.length === 0 && !isLoadingRepos && (
                  <div className="p-4 text-center">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {inputValue
                        ? 'No repositories found matching your search'
                        : 'No repositories available'}
                    </p>
                    {inputValue.includes('/') && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        Press Enter to go to this repository
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom actions */}
          <div className="p-2 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-surface-elevated disabled:opacity-50"
              style={{ color: 'var(--text-secondary)' }}
              title="Refresh repositories"
            >
              <svg
                className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
            {htmlUrl && (
              <a
                href={htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-surface-elevated ml-auto"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                View on GitHub
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
