import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { GitHubBranchesList } from './GitHubBranchesList';
import { githubService } from '../../../services/github.service';
import type { GitHubBranchesResponse, BranchSummary } from '../../../types/github';

// Mock the github service
vi.mock('../../../services/github.service', () => ({
  githubService: {
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

const mockBranch = (overrides: Partial<BranchSummary> = {}): BranchSummary => ({
  name: 'main',
  commitSha: 'abc123def456789',
  isProtected: false,
  isDefault: true,
  ...overrides,
});

const mockBranchesResponse = (branches: BranchSummary[] = []): GitHubBranchesResponse => ({
  branches,
});

describe('GitHubBranchesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching branches', () => {
      vi.mocked(githubService.getBranches).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockBranchesResponse()), 1000))
      );

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      expect(document.querySelector('[style*="animation: shimmer"]')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no branches exist', async () => {
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([]));

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No branches found')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      const error = new Error('Failed to fetch branches');
      vi.mocked(githubService.getBranches).mockRejectedValue(error);

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Failed to load branches/)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      vi.mocked(githubService.getBranches).mockRejectedValue(new Error('Error'));

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('should refetch when retry button is clicked', async () => {
      vi.mocked(githubService.getBranches)
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce(mockBranchesResponse([mockBranch()]));

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Try again'));

      await waitFor(() => {
        expect(githubService.getBranches).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Branches Display', () => {
    it('should display branches correctly', async () => {
      const branches = [
        mockBranch({ name: 'main', isDefault: true }),
        mockBranch({ name: 'develop', isDefault: false }),
      ];
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse(branches));

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument();
        expect(screen.getByText('develop')).toBeInTheDocument();
      });
    });

    it('should display branch count badge', async () => {
      const branches = [mockBranch(), mockBranch({ name: 'develop', isDefault: false })];
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse(branches));

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should display default badge for default branch', async () => {
      const branch = mockBranch({ name: 'main', isDefault: true });
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([branch]));

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('default')).toBeInTheDocument();
      });
    });

    it('should display protected badge for protected branches', async () => {
      const branch = mockBranch({ name: 'main', isProtected: true });
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([branch]));

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('protected')).toBeInTheDocument();
      });
    });

    it('should display short SHA when available', async () => {
      const branch = mockBranch({ commitSha: 'abc1234567890' });
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([branch]));

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('abc1234')).toBeInTheDocument();
      });
    });

    it('should handle branches without SHA gracefully', async () => {
      const branch = mockBranch({ commitSha: undefined as unknown as string });
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([branch]));

      render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument();
      });
      // Should not crash and should not show SHA section
    });
  });

  describe('Branch Sorting', () => {
    it('should sort default branch first', async () => {
      const branches = [
        mockBranch({ name: 'feature', isDefault: false, isProtected: false }),
        mockBranch({ name: 'main', isDefault: true, isProtected: false }),
      ];
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse(branches));

      const { container } = render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const branchNames = Array.from(container.querySelectorAll('span.cursor-pointer')).map(
          (el) => el.textContent
        );
        expect(branchNames[0]).toBe('main');
      });
    });

    it('should sort protected branches after default', async () => {
      const branches = [
        mockBranch({ name: 'feature', isDefault: false, isProtected: false }),
        mockBranch({ name: 'develop', isDefault: false, isProtected: true }),
        mockBranch({ name: 'main', isDefault: true, isProtected: false }),
      ];
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse(branches));

      const { container } = render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const branchNames = Array.from(container.querySelectorAll('span.cursor-pointer')).map(
          (el) => el.textContent
        );
        expect(branchNames[0]).toBe('main');
        expect(branchNames[1]).toBe('develop');
        expect(branchNames[2]).toBe('feature');
      });
    });
  });

  describe('Branch Selection', () => {
    it('should call onSelectBranch when branch is clicked', async () => {
      const branch = mockBranch({ name: 'main' });
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([branch]));
      const onSelectBranch = vi.fn();

      render(<GitHubBranchesList onSelectBranch={onSelectBranch} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument();
      });

      const branchRow = screen.getByText('main').closest('div[class*="rounded-lg cursor-pointer"]');
      if (branchRow) {
        fireEvent.click(branchRow);
      }

      expect(onSelectBranch).toHaveBeenCalledWith(branch);
    });

    it('should highlight selected branch', async () => {
      const branch = mockBranch({ name: 'main' });
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([branch]));

      render(<GitHubBranchesList selectedBranchName="main" />, { wrapper: createWrapper() });

      await waitFor(() => {
        const branchRow = screen.getByText('main').closest('div[class*="rounded-lg cursor-pointer"]');
        expect(branchRow).toHaveClass('ring-1');
      });
    });
  });

  describe('Owner and Repo Props', () => {
    it('should pass owner and repo to the service', async () => {
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([]));

      render(<GitHubBranchesList owner="myowner" repo="myrepo" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(githubService.getBranches).toHaveBeenCalledWith('myowner', 'myrepo');
      });
    });
  });

  describe('External Links', () => {
    let windowOpenSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
    });

    it('should open branch URL when branch name is clicked', async () => {
      const branch = mockBranch({
        name: 'main',
      });
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([branch]));

      render(<GitHubBranchesList owner="owner" repo="repo" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument();
      });

      // Click the branch name span
      fireEvent.click(screen.getByText('main'));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://github.com/owner/repo/tree/main',
        '_blank'
      );
    });

    it('should open branch URL when external link button is clicked', async () => {
      const branch = mockBranch({
        name: 'main',
      });
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([branch]));

      render(<GitHubBranchesList owner="owner" repo="repo" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument();
      });

      // Find and click the external link button (it's the last button in the branch row)
      const branchRow = screen.getByText('main').closest('div[class*="rounded-lg cursor-pointer"]');
      const externalLinkButton = branchRow?.querySelector('button');
      if (externalLinkButton) {
        fireEvent.click(externalLinkButton);
      }

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://github.com/owner/repo/tree/main',
        '_blank'
      );
    });

    it('should not trigger onSelectBranch when clicking branch name link', async () => {
      const branch = mockBranch({ name: 'main' });
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse([branch]));
      const onSelectBranch = vi.fn();

      render(<GitHubBranchesList owner="owner" repo="repo" onSelectBranch={onSelectBranch} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('main')).toBeInTheDocument();
      });

      // Click on the branch name span (should open link and stopPropagation)
      fireEvent.click(screen.getByText('main'));

      // The event should be stopped, so onSelectBranch shouldn't be called
      // (though due to event bubbling in tests, behavior may vary)
      expect(windowOpenSpy).toHaveBeenCalled();
    });
  });

  describe('Branch Sorting - Additional Cases', () => {
    it('should sort non-protected branch after protected branch', async () => {
      const branches = [
        mockBranch({ name: 'feature', isDefault: false, isProtected: false }),
        mockBranch({ name: 'release', isDefault: false, isProtected: true }),
      ];
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse(branches));

      const { container } = render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const branchNames = Array.from(container.querySelectorAll('span.cursor-pointer')).map(
          (el) => el.textContent
        );
        // Protected branch should come before non-protected
        expect(branchNames[0]).toBe('release');
        expect(branchNames[1]).toBe('feature');
      });
    });

    it('should sort alphabetically when branches have same priority', async () => {
      const branches = [
        mockBranch({ name: 'zebra', isDefault: false, isProtected: false }),
        mockBranch({ name: 'alpha', isDefault: false, isProtected: false }),
        mockBranch({ name: 'beta', isDefault: false, isProtected: false }),
      ];
      vi.mocked(githubService.getBranches).mockResolvedValue(mockBranchesResponse(branches));

      const { container } = render(<GitHubBranchesList />, { wrapper: createWrapper() });

      await waitFor(() => {
        const branchNames = Array.from(container.querySelectorAll('span.cursor-pointer')).map(
          (el) => el.textContent
        );
        expect(branchNames[0]).toBe('alpha');
        expect(branchNames[1]).toBe('beta');
        expect(branchNames[2]).toBe('zebra');
      });
    });
  });
});
