import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { GitHubPRFilesView } from './GitHubPRFilesView';
import { githubService } from '../../../services/github.service';
import type { GitHubPullRequestFilesResponse, PullRequestFileSummary, FileChangeStatus } from '../../../types/github';

// Mock the github service
vi.mock('../../../services/github.service', () => ({
  githubService: {
    getPullRequestFiles: vi.fn(),
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

const mockFile = (overrides: Partial<PullRequestFileSummary> = {}): PullRequestFileSummary => ({
  filename: 'src/components/Button.tsx',
  status: 'modified' as FileChangeStatus,
  additions: 10,
  deletions: 5,
  changes: 15,
  blobUrl: 'https://github.com/owner/repo/blob/abc123/src/components/Button.tsx',
  rawUrl: 'https://github.com/owner/repo/raw/abc123/src/components/Button.tsx',
  patch: '@@ -1,5 +1,10 @@',
  ...overrides,
});

const mockFilesResponse = (files: PullRequestFileSummary[] = []): GitHubPullRequestFilesResponse => ({
  files,
  totalCount: files.length,
});

describe('GitHubPRFilesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching files', async () => {
      vi.mocked(githubService.getPullRequestFiles).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockFilesResponse()), 1000))
      );

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      expect(screen.getByText('Loading files...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no files changed', async () => {
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse([]));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No files changed')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      const error = new Error('Failed to fetch files');
      vi.mocked(githubService.getPullRequestFiles).mockRejectedValue(error);

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load files/)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(githubService.getPullRequestFiles).mockRejectedValue(new Error('Error'));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('should refetch when retry button is clicked', async () => {
      vi.mocked(githubService.getPullRequestFiles)
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce(mockFilesResponse([mockFile()]));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Try again'));

      await waitFor(() => {
        expect(githubService.getPullRequestFiles).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Files Display', () => {
    it('should display files correctly', async () => {
      const files = [
        mockFile({ filename: 'src/App.tsx' }),
        mockFile({ filename: 'src/index.ts' }),
      ];
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse(files));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('App.tsx')).toBeInTheDocument();
        expect(screen.getByText('index.ts')).toBeInTheDocument();
      });
    });

    it('should display file count badge', async () => {
      const files = [mockFile(), mockFile({ filename: 'src/another.ts' })];
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse(files));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should display directory path separately from filename', async () => {
      const file = mockFile({ filename: 'src/components/ui/Button.tsx' });
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse([file]));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('src/components/ui/')).toBeInTheDocument();
        expect(screen.getByText('Button.tsx')).toBeInTheDocument();
      });
    });

    it('should display additions and deletions for each file', async () => {
      const file = mockFile({ additions: 25, deletions: 10 });
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse([file]));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        // There are both total and per-file additions/deletions
        const additions = screen.getAllByText('+25');
        const deletions = screen.getAllByText('-10');
        expect(additions.length).toBeGreaterThan(0);
        expect(deletions.length).toBeGreaterThan(0);
      });
    });

    it('should display total additions and deletions', async () => {
      const files = [
        mockFile({ additions: 20, deletions: 5 }),
        mockFile({ filename: 'src/other.ts', additions: 30, deletions: 15 }),
      ];
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse(files));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('+50')).toBeInTheDocument();
        expect(screen.getByText('-20')).toBeInTheDocument();
      });
    });

    it('should display 0 when no additions or deletions', async () => {
      const file = mockFile({ additions: 0, deletions: 0 });
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse([file]));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });

  describe('File Status Icons', () => {
    it('should display correct icon for added files', async () => {
      const file = mockFile({ status: 'added' as FileChangeStatus });
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse([file]));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('+')).toBeInTheDocument();
      });
    });

    it('should display correct icon for removed files', async () => {
      const file = mockFile({ status: 'removed' as FileChangeStatus });
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse([file]));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('-')).toBeInTheDocument();
      });
    });

    it('should display correct icon for modified files', async () => {
      const file = mockFile({ status: 'modified' as FileChangeStatus });
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse([file]));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('~')).toBeInTheDocument();
      });
    });

    it('should display correct icon for renamed files', async () => {
      const file = mockFile({ status: 'renamed' as FileChangeStatus });
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse([file]));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('→')).toBeInTheDocument();
      });
    });
  });

  describe('Owner and Repo Props', () => {
    it('should pass owner, repo, and pullNumber to the service', async () => {
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse([]));

      render(<GitHubPRFilesView pullNumber={42} owner="myowner" repo="myrepo" />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(githubService.getPullRequestFiles).toHaveBeenCalledWith(42, 'myowner', 'myrepo');
      });
    });
  });

  describe('Files without directory', () => {
    it('should handle files at root level', async () => {
      const file = mockFile({ filename: 'README.md' });
      vi.mocked(githubService.getPullRequestFiles).mockResolvedValue(mockFilesResponse([file]));

      render(<GitHubPRFilesView pullNumber={1} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('README.md')).toBeInTheDocument();
      });
    });
  });
});
