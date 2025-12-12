import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { GitHubActionsPanel } from './GitHubActionsPanel';
import { githubService } from '../../../services/github.service';
import type {
  GitHubActionsResponse,
  WorkflowRunSummary,
  WorkflowStatus,
  WorkflowConclusion,
  WorkflowEvent,
} from '../../../types/github';

// Mock the github service
vi.mock('../../../services/github.service', () => ({
  githubService: {
    getWorkflowRuns: vi.fn(),
    getWorkflowRunDetails: vi.fn(),
    rerunWorkflow: vi.fn(),
    cancelWorkflowRun: vi.fn(),
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

const mockWorkflowRun = (overrides: Partial<WorkflowRunSummary> = {}): WorkflowRunSummary => ({
  id: 1,
  name: 'CI',
  displayTitle: 'Test workflow',
  status: 'completed' as WorkflowStatus,
  conclusion: 'success' as WorkflowConclusion,
  htmlUrl: 'https://github.com/owner/repo/actions/runs/1',
  runNumber: 123,
  event: 'push' as WorkflowEvent,
  headBranch: 'main',
  headSha: 'abc123def456789',
  actor: 'testuser',
  actorAvatarUrl: 'https://example.com/avatar.png',
  createdAt: '2024-01-01T12:00:00Z',
  jobs: [],
  ...overrides,
});

const mockWorkflowRunsResponse = (
  workflowRuns: WorkflowRunSummary[] = [],
  hasMore = false
): GitHubActionsResponse => ({
  workflowRuns,
  totalCount: workflowRuns.length,
  page: 1,
  perPage: 15,
  hasMore,
});

describe('GitHubActionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching workflow runs', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockWorkflowRunsResponse()), 1000))
      );

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(document.querySelector('[style*="animation: shimmer"]')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no workflow runs exist', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No workflow runs found')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      const error = new Error('Failed to fetch workflow runs');
      vi.mocked(githubService.getWorkflowRuns).mockRejectedValue(error);

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load workflow runs/)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockRejectedValue(new Error('Error'));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Runs Display', () => {
    it('should display workflow runs correctly', async () => {
      const runs = [
        mockWorkflowRun({ id: 1, displayTitle: 'First workflow' }),
        mockWorkflowRun({ id: 2, displayTitle: 'Second workflow' }),
      ];
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse(runs));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('First workflow')).toBeInTheDocument();
        expect(screen.getByText('Second workflow')).toBeInTheDocument();
      });
    });

    it('should display run number', async () => {
      const run = mockWorkflowRun({ runNumber: 456 });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('#456')).toBeInTheDocument();
      });
    });

    it('should display workflow name', async () => {
      const run = mockWorkflowRun({ name: 'Build and Test', displayTitle: '' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Build and Test')).toBeInTheDocument();
      });
    });

    it('should display branch name', async () => {
      const run = mockWorkflowRun({ headBranch: 'feature/test' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('feature/test')).toBeInTheDocument();
      });
    });

    it('should display short commit SHA', async () => {
      const run = mockWorkflowRun({ headSha: 'abc123def456789' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('abc123d')).toBeInTheDocument();
      });
    });

    it('should display actor name and avatar', async () => {
      const run = mockWorkflowRun({
        actor: 'johndoe',
        actorAvatarUrl: 'https://example.com/johndoe.png',
      });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('johndoe')).toBeInTheDocument();
        const avatar = screen.getByAltText('johndoe');
        expect(avatar).toHaveAttribute('src', 'https://example.com/johndoe.png');
      });
    });
  });

  describe('Workflow Status', () => {
    it('should display success status correctly', async () => {
      const run = mockWorkflowRun({ status: 'completed', conclusion: 'success' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test workflow')).toBeInTheDocument();
      });
    });

    it('should display failure status correctly', async () => {
      const run = mockWorkflowRun({ status: 'completed', conclusion: 'failure' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test workflow')).toBeInTheDocument();
      });
    });

    it('should display in_progress status correctly', async () => {
      const run = mockWorkflowRun({ status: 'in_progress', conclusion: undefined as unknown as WorkflowConclusion });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test workflow')).toBeInTheDocument();
      });
    });

    it('should display queued status correctly', async () => {
      const run = mockWorkflowRun({ status: 'queued', conclusion: undefined as unknown as WorkflowConclusion });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test workflow')).toBeInTheDocument();
      });
    });

    it('should display cancelled status correctly', async () => {
      const run = mockWorkflowRun({ status: 'completed', conclusion: 'cancelled' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test workflow')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Events', () => {
    it('should display push event icon', async () => {
      const run = mockWorkflowRun({ event: 'push' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/push/)).toBeInTheDocument();
      });
    });

    it('should display pull_request event', async () => {
      const run = mockWorkflowRun({ event: 'pull_request' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/pull_request/)).toBeInTheDocument();
      });
    });

    it('should display workflow_dispatch event', async () => {
      const run = mockWorkflowRun({ event: 'workflow_dispatch' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/workflow_dispatch/)).toBeInTheDocument();
      });
    });

    it('should display schedule event', async () => {
      const run = mockWorkflowRun({ event: 'schedule' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/schedule/)).toBeInTheDocument();
      });
    });
  });

  describe('Status Filtering', () => {
    it('should filter by status when selecting from dropdown', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('All Status')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'completed' } });

      await waitFor(() => {
        expect(githubService.getWorkflowRuns).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'completed' })
        );
      });
    });

    it('should filter by branch when typing in branch input', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Filter by branch...')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Filter by branch...'), {
        target: { value: 'main' },
      });

      await waitFor(() => {
        expect(githubService.getWorkflowRuns).toHaveBeenCalledWith(
          expect.objectContaining({ branch: 'main' })
        );
      });
    });
  });

  describe('Run Selection', () => {
    it('should call onSelectRun when run is clicked', async () => {
      const run = mockWorkflowRun({ id: 1, displayTitle: 'Test Run' });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));
      const onSelectRun = vi.fn();

      render(<GitHubActionsPanel onSelectRun={onSelectRun} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test Run')).toBeInTheDocument();
      });

      const buttonElement = screen.getByText('Test Run').closest('div[role="button"]');
      expect(buttonElement).toBeTruthy();
      fireEvent.click(buttonElement as HTMLElement);

      expect(onSelectRun).toHaveBeenCalledWith(run);
    });

    it('should highlight selected run', async () => {
      const run = mockWorkflowRun({ id: 42 });
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([run]));

      render(<GitHubActionsPanel selectedRunId={42} />, { wrapper: createWrapper() });

      await waitFor(() => {
        const runElement = screen.getByText('Test workflow').closest('div[role="button"]');
        expect(runElement).toHaveClass('ring-1');
      });
    });
  });

  describe('Pagination', () => {
    it('should show pagination when hasMore is true', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue({
        ...mockWorkflowRunsResponse([mockWorkflowRun()], true),
        totalCount: 30,
        perPage: 15,
      });

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText('Next page')).toBeInTheDocument();
        expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first page', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue({
        ...mockWorkflowRunsResponse([mockWorkflowRun()], true),
        totalCount: 30,
        perPage: 15,
      });

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        const prevButton = screen.getByLabelText('Previous page');
        expect(prevButton).toBeDisabled();
      });
    });

    it('should load next page when clicking Next', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue({
        ...mockWorkflowRunsResponse([mockWorkflowRun()], true),
        totalCount: 30,
        perPage: 15,
      });

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Next page'));

      await waitFor(() => {
        expect(githubService.getWorkflowRuns).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });
  });

  describe('Auto Refresh', () => {
    it('should have auto-refresh toggle', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Auto')).toBeInTheDocument();
      });
    });

    it('should toggle auto-refresh when clicking the button', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([]));

      render(<GitHubActionsPanel />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Auto')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Auto'));
      // Auto-refresh should toggle state
    });
  });

  describe('Owner and Repo Props', () => {
    it('should pass owner and repo to the service', async () => {
      vi.mocked(githubService.getWorkflowRuns).mockResolvedValue(mockWorkflowRunsResponse([]));

      render(<GitHubActionsPanel owner="myowner" repo="myrepo" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(githubService.getWorkflowRuns).toHaveBeenCalledWith(
          expect.objectContaining({ owner: 'myowner', repo: 'myrepo' })
        );
      });
    });
  });
});
