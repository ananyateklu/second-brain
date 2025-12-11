import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { GitHubCommentsView } from './GitHubCommentsView';
import { githubService } from '../../../services/github.service';
import type { GitHubCommentsResponse, CommentSummary } from '../../../types/github';

// Mock the github service
vi.mock('../../../services/github.service', () => ({
  githubService: {
    getIssueComments: vi.fn(),
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

const mockComment = (overrides: Partial<CommentSummary> = {}): CommentSummary => ({
  id: 1,
  body: 'This is a test comment',
  author: 'testuser',
  authorAvatarUrl: 'https://example.com/avatar.png',
  htmlUrl: 'https://github.com/owner/repo/issues/1#issuecomment-1',
  createdAt: '2024-01-01T12:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z',
  ...overrides,
});

const mockCommentsResponse = (comments: CommentSummary[] = []): GitHubCommentsResponse => ({
  comments,
  totalCount: comments.length,
});

describe('GitHubCommentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching comments', async () => {
      vi.mocked(githubService.getIssueComments).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCommentsResponse()), 1000))
      );

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      expect(screen.getByText('Loading comments...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no comments exist', async () => {
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No comments yet')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      const error = new Error('Failed to fetch comments');
      vi.mocked(githubService.getIssueComments).mockRejectedValue(error);

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load comments/)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(githubService.getIssueComments).mockRejectedValue(new Error('Error'));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('should refetch when retry button is clicked', async () => {
      vi.mocked(githubService.getIssueComments)
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce(mockCommentsResponse([mockComment()]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Try again'));

      await waitFor(() => {
        expect(githubService.getIssueComments).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Comments Display', () => {
    it('should display comments correctly', async () => {
      const comments = [
        mockComment({ id: 1, body: 'First comment' }),
        mockComment({ id: 2, body: 'Second comment' }),
      ];
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse(comments));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('First comment')).toBeInTheDocument();
        expect(screen.getByText('Second comment')).toBeInTheDocument();
      });
    });

    it('should display comment count badge', async () => {
      const comments = [mockComment(), mockComment({ id: 2 })];
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse(comments));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should display author name', async () => {
      const comment = mockComment({ author: 'johndoe' });
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([comment]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
      });
    });

    it('should display author avatar', async () => {
      const comment = mockComment({ author: 'johndoe', authorAvatarUrl: 'https://example.com/avatar.jpg' });
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([comment]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const avatar = screen.getByAltText('johndoe');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      });
    });

    it('should show edited indicator when comment was updated', async () => {
      const comment = mockComment({
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-02T12:00:00Z',
      });
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([comment]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('· edited')).toBeInTheDocument();
      });
    });

    it('should not show edited indicator when comment was not updated', async () => {
      const comment = mockComment({
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
      });
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([comment]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      expect(screen.queryByText('· edited')).not.toBeInTheDocument();
    });
  });

  describe('Markdown Rendering', () => {
    it('should render inline code', async () => {
      const comment = mockComment({ body: 'Use `console.log()` for debugging' });
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([comment]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('console.log()')).toBeInTheDocument();
      });
    });

    it('should render headers', async () => {
      const comment = mockComment({ body: '# Header 1\n## Header 2\n### Header 3' });
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([comment]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Header 1')).toBeInTheDocument();
        expect(screen.getByText('Header 2')).toBeInTheDocument();
        expect(screen.getByText('Header 3')).toBeInTheDocument();
      });
    });

    it('should render list items', async () => {
      const comment = mockComment({ body: '- Item 1\n- Item 2' });
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([comment]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });

    it('should render numbered lists', async () => {
      const comment = mockComment({ body: '1. First\n2. Second' });
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([comment]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
      });
    });

    it('should render blockquotes', async () => {
      const comment = mockComment({ body: '> This is a quote' });
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([comment]));

      render(<GitHubCommentsView issueNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('This is a quote')).toBeInTheDocument();
      });
    });
  });

  describe('Owner and Repo Props', () => {
    it('should pass owner, repo, and issueNumber to the service', async () => {
      vi.mocked(githubService.getIssueComments).mockResolvedValue(mockCommentsResponse([]));

      render(<GitHubCommentsView issueNumber={42} owner="myowner" repo="myrepo" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(githubService.getIssueComments).toHaveBeenCalledWith(42, 'myowner', 'myrepo');
      });
    });
  });
});
