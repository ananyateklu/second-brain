import { useState, useRef, useEffect } from 'react';

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleSelectRecent = (repo: RepoConfig) => {
    onRepoChange(repo.owner, repo.repo);
    setIsOpen(false);
    setInputValue('');
  };

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
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
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
          className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border shadow-lg z-50 overflow-x-hidden"
          style={{
            backgroundColor: 'var(--surface-card)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Input */}
          <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit(inputValue);
                  }
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder="owner/repository"
                className="w-full px-3 py-2 pr-10 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                onClick={() => handleSubmit(inputValue)}
                disabled={!inputValue.includes('/')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-elevated disabled:opacity-50"
                title="Go to repository"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
              Enter as owner/repo (e.g., facebook/react)
            </p>
          </div>

          {/* Recent repos */}
          {recentRepos.length > 0 && (
            <div className="p-2">
              <p
                className="text-xs font-medium px-2 py-1"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Recent repositories
              </p>
              {recentRepos.map((repo) => (
                <button
                  key={repo.fullName}
                  onClick={() => handleSelectRecent(repo)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-opacity-80 ${
                    repo.fullName === fullName ? 'bg-primary/10' : ''
                  }`}
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
                    <span className="truncate min-w-0" title={repo.fullName}>{repo.fullName}</span>
                    {repo.fullName === fullName && (
                      <svg
                        className="w-4 h-4 ml-auto text-primary"
                        fill="currentColor"
                        viewBox="0 0 20 20"
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

          {/* Link to current repo */}
          {htmlUrl && (
            <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <a
                href={htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-surface-elevated"
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};
