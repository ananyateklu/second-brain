import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { GitHubIssuesList } from './GitHubIssuesList';
import { githubService } from '../../../services/github.service';
import type { GitHubIssuesResponse, IssueSummary } from '../../../types/github';

// Mock the github service
vi.mock('../../../services/github.service', () => ({
  githubService: {
    getIssues: vi.fn(),
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

const mockIssue = (overrides: Partial<IssueSummary> = {}): IssueSummary => ({
  number: 1,
  title: 'Test Issue',
  state: 'open',
  author: 'testuser',
  authorAvatarUrl: 'https://example.com/avatar.png',
  htmlUrl: 'https://github.com/owner/repo/issues/1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z',
  labels: [],
  commentsCount: 0,
  assignees: [],
  ...overrides,
});

const mockIssuesResponse = (issues: IssueSummary[] = [], hasMore = false): GitHubIssuesResponse => ({
  issues,
  totalCount: issues.length,
  page: 1,
  perPage: 20,
  hasMore,
});

describe('GitHubIssuesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching issues', () => {
      vi.mocked(githubService.getIssues).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockIssuesResponse()), 1000))
      );

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      expect(document.querySelector('[style*="animation: shimmer"]')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no issues exist', async () => {
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse([]));

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No issues found')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      const error = new Error('Failed to fetch issues');
      vi.mocked(githubService.getIssues).mockRejectedValue(error);

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load issues/)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(githubService.getIssues).mockRejectedValue(new Error('Error'));

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });
  });

  describe('Issues Display', () => {
    it('should display issues correctly', async () => {
      const issues = [
        mockIssue({ number: 1, title: 'First Issue' }),
        mockIssue({ number: 2, title: 'Second Issue' }),
      ];
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse(issues));

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('First Issue')).toBeInTheDocument();
        expect(screen.getByText('Second Issue')).toBeInTheDocument();
      });
    });

    it('should display issue count badge', async () => {
      const issues = [mockIssue(), mockIssue({ number: 2 })];
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse(issues));

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should display issue number and author', async () => {
      const issue = mockIssue({ number: 42, author: 'johndoe' });
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse([issue]));

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('#42')).toBeInTheDocument();
        expect(screen.getByText('by johndoe')).toBeInTheDocument();
      });
    });

    it('should display labels', async () => {
      const issue = mockIssue({
        labels: [
          { id: 1, name: 'bug', color: 'ff0000' },
          { id: 2, name: 'enhancement', color: '00ff00' },
        ],
      });
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse([issue]));

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('bug')).toBeInTheDocument();
        expect(screen.getByText('enhancement')).toBeInTheDocument();
      });
    });

    it('should display comments count when present', async () => {
      const issue = mockIssue({ commentsCount: 5 });
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse([issue]));

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });
  });

  describe('State Filtering', () => {
    it('should default to open state filter', async () => {
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse([]));

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const openButton = screen.getByText('open');
        expect(openButton).toBeInTheDocument();
      });
    });

    it('should change state filter when clicking closed', async () => {
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse([]));

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('closed')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('closed'));

      await waitFor(() => {
        expect(githubService.getIssues).toHaveBeenCalledWith(
          expect.objectContaining({ state: 'closed' })
        );
      });
    });

    it('should have all state filter option', async () => {
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse([]));

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('all')).toBeInTheDocument();
      });
    });
  });

  describe('Issue Selection', () => {
    it('should call onSelectIssue when issue is clicked', async () => {
      const issue = mockIssue({ number: 1, title: 'Test Issue' });
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse([issue]));
      const onSelectIssue = vi.fn();

      render(<GitHubIssuesList onSelectIssue={onSelectIssue} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test Issue')).toBeInTheDocument();
      });

      const issueElement = screen.getByText('Test Issue').closest('div[class*="rounded-lg"]');
      expect(issueElement).toBeTruthy();
      fireEvent.click(issueElement as HTMLElement);

      expect(onSelectIssue).toHaveBeenCalledWith(issue);
    });

    it('should highlight selected issue', async () => {
      const issue = mockIssue({ number: 42 });
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse([issue]));

      render(<GitHubIssuesList selectedIssueNumber={42} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const issueRow = screen.getByText('#42').closest('div[class*="rounded-lg"]');
        expect(issueRow).toHaveClass('ring-1');
      });
    });
  });

  describe('Pagination', () => {
    it('should show pagination when hasMore is true', async () => {
      vi.mocked(githubService.getIssues).mockResolvedValue({
        ...mockIssuesResponse([mockIssue()], true),
        totalCount: 40,
      });

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText('Next page')).toBeInTheDocument();
        expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first page', async () => {
      vi.mocked(githubService.getIssues).mockResolvedValue({
        ...mockIssuesResponse([mockIssue()], true),
        totalCount: 40,
      });

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const prevButton = screen.getByLabelText('Previous page');
        expect(prevButton).toBeDisabled();
      });
    });

    it('should load next page when clicking Next', async () => {
      vi.mocked(githubService.getIssues).mockResolvedValue({
        ...mockIssuesResponse([mockIssue()], true),
        totalCount: 40,
      });

      render(<GitHubIssuesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Next page'));

      await waitFor(() => {
        expect(githubService.getIssues).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });
  });

  describe('Owner and Repo Props', () => {
    it('should pass owner and repo to the service', async () => {
      vi.mocked(githubService.getIssues).mockResolvedValue(mockIssuesResponse([]));

      render(<GitHubIssuesList owner="myowner" repo="myrepo" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(githubService.getIssues).toHaveBeenCalledWith(
          expect.objectContaining({ owner: 'myowner', repo: 'myrepo' })
        );
      });
    });
  });
});
