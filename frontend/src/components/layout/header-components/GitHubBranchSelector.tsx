import { useState, useRef, useEffect, useMemo } from 'react';
import { GitBranch, ChevronDown } from 'lucide-react';
import { useBoundStore } from '../../../store/bound-store';
import { useGitHubBranches } from '../../../features/github/hooks';
import type { BranchSummary } from '../../../types/github';

/**
 * Compact GitHub branch selector for the header
 * Only shown on the Code tab of the GitHub page
 */
export const GitHubBranchSelector = () => {
  const githubOwner = useBoundStore((state) => state.githubOwner);
  const githubRepo = useBoundStore((state) => state.githubRepo);
  const githubSelectedBranch = useBoundStore((state) => state.githubSelectedBranch);
  const setGitHubSelectedBranch = useBoundStore((state) => state.setGitHubSelectedBranch);
  const theme = useBoundStore((state) => state.theme);
  const isBlueTheme = theme === 'blue';

  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch branches
  const { data: branchesData, isLoading } = useGitHubBranches(
    githubOwner ?? undefined,
    githubRepo ?? undefined
  );

  const branches = branchesData?.branches ?? [];

  // Get the selected branch object or default
  const selectedBranch = useMemo((): BranchSummary | null => {
    if (!branches.length) return null;

    // If user has selected a branch, use that
    if (githubSelectedBranch) {
      const found = branches.find((b) => b.name === githubSelectedBranch);
      if (found) return found;
    }

    // Otherwise, use default branch or first branch
    const defaultBranch = branches.find((b) => b.isDefault);
    return defaultBranch ?? branches[0] ?? null;
  }, [branches, githubSelectedBranch]);

  // Filter branches based on search
  const filteredBranches = useMemo(() => {
    if (!searchValue.trim()) return branches;
    const search = searchValue.toLowerCase();
    return branches.filter((b) => b.name.toLowerCase().includes(search));
  }, [branches, searchValue]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchValue('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBranch = (branch: BranchSummary) => {
    setGitHubSelectedBranch(branch.name);
    setIsOpen(false);
    setSearchValue('');
  };

  // Don't render if no repo is selected
  if (!githubOwner || !githubRepo) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current branch display / trigger */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-opacity-80"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
      >
        <GitBranch className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-brand-500)' }} />
        <span className="font-medium truncate max-w-[150px]" title={selectedBranch?.name || 'Select branch'}>
          {isLoading ? 'Loading...' : selectedBranch?.name || 'Select branch'}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-72 rounded-xl border shadow-lg z-50 overflow-hidden"
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
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setSearchValue('');
                  }
                }}
                placeholder="Search branches"
                className="w-full pl-10 pr-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          </div>

          {/* Branches List */}
          <div className="max-h-64 overflow-y-auto thin-scrollbar">
            {isLoading ? (
              <div className="p-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Loading...
                </span>
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {searchValue ? 'No branches found' : 'No branches available'}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredBranches.map((branch) => {
                  const isSelected = selectedBranch?.name === branch.name;
                  return (
                    <button
                      key={branch.name}
                      onClick={() => handleSelectBranch(branch)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-primary-alpha)'
                          : 'transparent',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <GitBranch className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                      <span className="truncate flex-1" title={branch.name}>
                        {branch.name}
                      </span>
                      {branch.isDefault && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{
                            backgroundColor: 'var(--surface-card)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          default
                        </span>
                      )}
                      {isSelected && (
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
