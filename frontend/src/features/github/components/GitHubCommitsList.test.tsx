import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { GitHubCommitsList } from './GitHubCommitsList';
import { githubService } from '../../../services/github.service';
import type {
  GitHubCommitsResponse,
  CommitSummary,
  GitHubBranchesResponse,
  BranchSummary,
} from '../../../types/github';

// Mock the github service
vi.mock('../../../services/github.service', () => ({
  githubService: {
    getCommits: vi.fn(),
    getBranches: vi.fn(),
  },
}));

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const mockCommit = (overrides: Partial<CommitSummary> = {}): CommitSummary => ({
  sha: 'abc123def456789',
  shortSha: 'abc123d',
  message: 'Test commit message',
  author: 'testuser',
  authorAvatarUrl: 'https://example.com/avatar.png',
  authoredAt: '2024-01-01T12:00:00Z',
  committer: 'testuser',
  htmlUrl: 'https://github.com/owner/repo/commit/abc123',
  additions: 50,
  deletions: 20,
  filesChanged: 5,
  ...overrides,
});

const mockBranch = (overrides: Partial<BranchSummary> = {}): BranchSummary => ({
  name: 'main',
  sha: 'abc123',
  isProtected: false,
  isDefault: true,
  htmlUrl: 'https://github.com/owner/repo/tree/main',
  ...overrides,
});

const mockCommitsResponse = (commits: CommitSummary[] = [], hasMore = false): GitHubCommitsResponse => ({
  commits,
  totalCount: commits.length,
  page: 1,
  perPage: 20,
  hasMore,
});

const mockBranchesResponse = (branches: BranchSummary[] = []): GitHubBranchesResponse => ({
  branches,
  totalCount: branches.length,
});

describe('GitHubCommitsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([mockBranch()]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching commits', async () => {
      vi.mocked(githubService.getCommits).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCommitsResponse()), 1000))
      );

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      expect(screen.getByText('Loading commits...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no commits exist', async () => {
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([]));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No commits found')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      const error = new Error('Failed to fetch commits');
      vi.mocked(githubService.getCommits).mockRejectedValue(error);

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load commits/)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(githubService.getCommits).mockRejectedValue(new Error('Error'));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });
  });

  describe('Commits Display', () => {
    it('should display commits correctly', async () => {
      const commits = [
        mockCommit({ sha: 'abc123', shortSha: 'abc123', message: 'First commit' }),
        mockCommit({ sha: 'def456', shortSha: 'def456', message: 'Second commit' }),
      ];
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse(commits));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('First commit')).toBeInTheDocument();
        expect(screen.getByText('Second commit')).toBeInTheDocument();
      });
    });

    it('should display commit count badge', async () => {
      const commits = [mockCommit(), mockCommit({ sha: 'def456' })];
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse(commits));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should display short SHA', async () => {
      const commit = mockCommit({ shortSha: 'abc1234' });
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([commit]));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('abc1234')).toBeInTheDocument();
      });
    });

    it('should display author name', async () => {
      const commit = mockCommit({ author: 'johndoe' });
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([commit]));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
      });
    });

    it('should display additions and deletions', async () => {
      const commit = mockCommit({ additions: 100, deletions: 50 });
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([commit]));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('+100')).toBeInTheDocument();
        expect(screen.getByText('-50')).toBeInTheDocument();
      });
    });

    it('should display files changed count', async () => {
      const commit = mockCommit({ filesChanged: 10 });
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([commit]));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });
  });

  describe('Branch Selection', () => {
    it('should display branch selector when branches are available', async () => {
      const branches = [
        mockBranch({ name: 'main', isDefault: true }),
        mockBranch({ name: 'develop', isDefault: false }),
      ];
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse(branches));
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([]));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
      });
    });

    it('should change branch filter when selecting different branch', async () => {
      const branches = [
        mockBranch({ name: 'main', isDefault: true }),
        mockBranch({ name: 'develop', isDefault: false }),
      ];
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse(branches));
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([]));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'develop' } });

      await waitFor(() => {
        expect(githubService.getCommits).toHaveBeenCalledWith(
          expect.objectContaining({ branch: 'develop' })
        );
      });
    });
  });

  describe('Commit Selection', () => {
    it('should call onSelectCommit when commit is clicked', async () => {
      const commit = mockCommit({ message: 'Test Commit' });
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([commit]));
      const onSelectCommit = vi.fn();

      render(<GitHubCommitsList onSelectCommit={onSelectCommit} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test Commit')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Test Commit').closest('div[class*="rounded-xl"]')!);

      expect(onSelectCommit).toHaveBeenCalledWith(commit);
    });

    it('should highlight selected commit', async () => {
      const commit = mockCommit({ sha: 'abc123def456' });
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([commit]));

      render(<GitHubCommitsList selectedSha="abc123def456" />, { wrapper: createWrapper() });

      await waitFor(() => {
        const commitRow = screen.getByText('abc123d').closest('div[class*="rounded-xl"]');
        expect(commitRow).toHaveClass('ring-2');
      });
    });
  });

  describe('Pagination', () => {
    it('should show pagination when hasMore is true', async () => {
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([mockCommit()], true));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first page', async () => {
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([mockCommit()], true));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const prevButton = screen.getByText('Previous');
        expect(prevButton).toBeDisabled();
      });
    });

    it('should load next page when clicking Next', async () => {
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([mockCommit()], true));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Page 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(githubService.getCommits).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });
  });

  describe('Commit Message Handling', () => {
    it('should handle multi-line commit messages', async () => {
      const commit = mockCommit({ message: 'First line\n\nSecond line details' });
      vi.mocked(githubService.getCommits).mockResolvedValue(mockCommitsResponse([commit]));

      render(<GitHubCommitsList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('First line')).toBeInTheDocument();
        // Should show ellipsis indicator for multi-line
        expect(screen.getByText('...')).toBeInTheDocument();
      });
    });
  });
});
