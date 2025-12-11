import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { GitHubPullRequestList } from './GitHubPullRequestList';
import { githubService } from '../../../services/github.service';
import type {
  GitHubPullRequestsResponse,
  PullRequestSummary,
  PullRequestState,
  CheckRunSummary,
  GitHubLabel,
} from '../../../types/github';

// Mock the github service
vi.mock('../../../services/github.service', () => ({
  githubService: {
    getPullRequests: vi.fn(),
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

const mockLabel = (overrides: Partial<GitHubLabel> = {}): GitHubLabel => ({
  id: 1,
  name: 'bug',
  color: 'ff0000',
  ...overrides,
});

// const _mockReview = (overrides: Partial<ReviewSummary> = {}): ReviewSummary => ({
//   state: 'APPROVED',
//   author: 'reviewer',
//   authorAvatarUrl: 'https://example.com/avatar.png',
//   submittedAt: '2024-01-01T12:00:00Z',
//   ...overrides,
// });

const mockCheckRun = (overrides: Partial<CheckRunSummary> = {}): CheckRunSummary => ({
  name: 'test',
  status: 'completed',
  conclusion: 'success',
  htmlUrl: 'https://github.com/owner/repo/runs/1',
  ...overrides,
});

const mockPR = (overrides: Partial<PullRequestSummary> = {}): PullRequestSummary => ({
  number: 1,
  title: 'Test PR',
  state: 'open' as PullRequestState,
  author: 'testuser',
  authorAvatarUrl: 'https://example.com/avatar.png',
  htmlUrl: 'https://github.com/owner/repo/pull/1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z',
  headBranch: 'feature-branch',
  baseBranch: 'main',
  isDraft: false,
  isMerged: false,
  labels: [],
  additions: 50,
  deletions: 20,
  commentsCount: 0,
  changedFiles: 5,
  reviews: [],
  checkRuns: [],
  ...overrides,
});

const mockPRsResponse = (pullRequests: PullRequestSummary[] = [], hasMore = false): GitHubPullRequestsResponse => ({
  pullRequests,
  totalCount: pullRequests.length,
  page: 1,
  perPage: 20,
  hasMore,
});

describe('GitHubPullRequestList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching PRs', async () => {
      vi.mocked(githubService.getPullRequests).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPRsResponse()), 1000))
      );

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no PRs exist', async () => {
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/No.*pull requests found/)).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      const error = new Error('Failed to fetch PRs');
      vi.mocked(githubService.getPullRequests).mockRejectedValue(error);

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load pull requests/)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(githubService.getPullRequests).mockRejectedValue(new Error('Error'));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('Pull Requests Display', () => {
    it('should display PRs correctly', async () => {
      const prs = [
        mockPR({ number: 1, title: 'First PR' }),
        mockPR({ number: 2, title: 'Second PR' }),
      ];
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse(prs));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('First PR')).toBeInTheDocument();
        expect(screen.getByText('Second PR')).toBeInTheDocument();
      });
    });

    it('should display PR number', async () => {
      const pr = mockPR({ number: 42 });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('#42')).toBeInTheDocument();
      });
    });

    it('should display branch information', async () => {
      const pr = mockPR({ headBranch: 'feature/test', baseBranch: 'main' });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('feature/test')).toBeInTheDocument();
        expect(screen.getByText('main')).toBeInTheDocument();
      });
    });

    it('should display draft badge for draft PRs', async () => {
      const pr = mockPR({ isDraft: true });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument();
      });
    });

    it('should display additions and deletions', async () => {
      const pr = mockPR({ additions: 100, deletions: 50 });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('+100')).toBeInTheDocument();
        expect(screen.getByText('-50')).toBeInTheDocument();
      });
    });

    it('should display author avatar', async () => {
      const pr = mockPR({ author: 'johndoe', authorAvatarUrl: 'https://example.com/johndoe.png' });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const avatar = screen.getAllByAltText('johndoe')[0];
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', 'https://example.com/johndoe.png');
      });
    });
  });

  describe('Labels', () => {
    it('should display labels', async () => {
      const pr = mockPR({
        labels: [
          mockLabel({ name: 'bug', color: 'ff0000' }),
          mockLabel({ id: 2, name: 'enhancement', color: '00ff00' }),
        ],
      });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('bug')).toBeInTheDocument();
        expect(screen.getByText('enhancement')).toBeInTheDocument();
      });
    });

    it('should show +N when more than 4 labels', async () => {
      const pr = mockPR({
        labels: [
          mockLabel({ id: 1, name: 'label1' }),
          mockLabel({ id: 2, name: 'label2' }),
          mockLabel({ id: 3, name: 'label3' }),
          mockLabel({ id: 4, name: 'label4' }),
          mockLabel({ id: 5, name: 'label5' }),
          mockLabel({ id: 6, name: 'label6' }),
        ],
      });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('+2')).toBeInTheDocument();
      });
    });
  });

  describe('Check Status', () => {
    it('should display success check status', async () => {
      const pr = mockPR({
        checkRuns: [mockCheckRun({ status: 'completed', conclusion: 'success' })],
      });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Checks/)).toBeInTheDocument();
      });
    });

    it('should display failure check status', async () => {
      const pr = mockPR({
        checkRuns: [mockCheckRun({ status: 'completed', conclusion: 'failure' })],
      });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Checks/)).toBeInTheDocument();
      });
    });

    it('should display pending check status', async () => {
      const pr = mockPR({
        checkRuns: [mockCheckRun({ status: 'in_progress', conclusion: undefined })],
      });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Checks/)).toBeInTheDocument();
      });
    });
  });

  describe('State Filtering', () => {
    it('should default to open state filter', async () => {
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(githubService.getPullRequests).toHaveBeenCalledWith(
          expect.objectContaining({ state: 'open' })
        );
      });
    });

    it('should change state filter when clicking Closed', async () => {
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Closed')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Closed'));

      await waitFor(() => {
        expect(githubService.getPullRequests).toHaveBeenCalledWith(
          expect.objectContaining({ state: 'closed' })
        );
      });
    });

    it('should have all state filter option', async () => {
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
      });
    });
  });

  describe('PR Selection', () => {
    it('should call onSelectPR when PR is clicked', async () => {
      const pr = mockPR({ number: 1, title: 'Test PR' });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));
      const onSelectPR = vi.fn();

      render(<GitHubPullRequestList onSelectPR={onSelectPR} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test PR')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Test PR').closest('button')!);

      expect(onSelectPR).toHaveBeenCalledWith(pr);
    });

    it('should highlight selected PR', async () => {
      const pr = mockPR({ number: 42 });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList selectedPRNumber={42} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const prButton = screen.getByText('#42').closest('button');
        expect(prButton).toHaveClass('ring-2');
      });
    });
  });

  describe('Pagination', () => {
    it('should show pagination when hasMore is true', async () => {
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([mockPR()], true));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first page', async () => {
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([mockPR()], true));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const prevButton = screen.getByText('Previous');
        expect(prevButton).toBeDisabled();
      });
    });

    it('should load next page when clicking Next', async () => {
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([mockPR()], true));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Page 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(githubService.getPullRequests).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });
  });

  describe('PR States', () => {
    it('should display open state correctly', async () => {
      const pr = mockPR({ state: 'open' as PullRequestState });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test PR')).toBeInTheDocument();
      });
    });

    it('should display closed state correctly', async () => {
      const pr = mockPR({ state: 'closed' as PullRequestState });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test PR')).toBeInTheDocument();
      });
    });

    it('should display merged state correctly', async () => {
      const pr = mockPR({ state: 'merged' as PullRequestState });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test PR')).toBeInTheDocument();
      });
    });
  });

  describe('Owner and Repo Props', () => {
    it('should pass owner and repo to the service', async () => {
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([]));

      render(<GitHubPullRequestList owner="myowner" repo="myrepo" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(githubService.getPullRequests).toHaveBeenCalledWith(
          expect.objectContaining({ owner: 'myowner', repo: 'myrepo' })
        );
      });
    });
  });

  describe('Comments Count', () => {
    it('should display comments count when present', async () => {
      const pr = mockPR({ commentsCount: 5 });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should not display comments section when count is 0', async () => {
      const pr = mockPR({ commentsCount: 0 });
      vi.mocked(githubService.getPullRequests).mockResolvedValue(mockPRsResponse([pr]));

      render(<GitHubPullRequestList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test PR')).toBeInTheDocument();
      });
    });
  });
});
