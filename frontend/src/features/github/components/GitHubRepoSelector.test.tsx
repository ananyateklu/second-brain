import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { GitHubRepoSelector } from './GitHubRepoSelector';
import { githubService } from '../../../services/github.service';

// Mock the github service
vi.mock('../../../services/github.service', () => ({
  githubService: {
    getUserRepositories: vi.fn(),
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

// Store for localStorage mock
let localStorageStore: Record<string, string> = {};

// Override localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageStore[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageStore[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageStore[key];
    }),
    clear: vi.fn(() => {
      localStorageStore = {};
    }),
    get length() {
      return Object.keys(localStorageStore).length;
    },
    key: vi.fn((index: number) => Object.keys(localStorageStore)[index] || null),
  },
  writable: true,
});

describe('GitHubRepoSelector', () => {
  const mockOnRepoChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore = {};
    // Mock the repositories API to return empty by default
    vi.mocked(githubService.getUserRepositories).mockResolvedValue({
      repositories: [],
      totalCount: 0,
      page: 1,
      perPage: 100,
      hasMore: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('should display "Select repository" when no repo is selected', () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      expect(screen.getByText('Select repository')).toBeInTheDocument();
    });

    it('should display current repo when provided', () => {
      render(
        <GitHubRepoSelector
          currentOwner="owner"
          currentRepo="repo"
          fullName="owner/repo"
          onRepoChange={mockOnRepoChange}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('owner/repo')).toBeInTheDocument();
    });
  });

  describe('Dropdown Behavior', () => {
    it('should open dropdown when button is clicked', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <div>
            <GitHubRepoSelector onRepoChange={mockOnRepoChange} />
            <button data-testid="outside">Outside</button>
          </div>
        </Wrapper>
      );

      // Open dropdown
      fireEvent.click(screen.getByText('Select repository'));
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search or enter owner/repo')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when pressing Escape', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Select repository'));
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });

      fireEvent.keyDown(screen.getByPlaceholderText('Search or enter owner/repo'), { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search or enter owner/repo')).not.toBeInTheDocument();
      });
    });
  });

  describe('Repository Input', () => {
    it('should show "Go to" button when input contains slash', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search or enter owner/repo');
      fireEvent.change(input, { target: { value: 'facebook/react' } });

      await waitFor(() => {
        expect(screen.getByText('Go to facebook/react')).toBeInTheDocument();
      });
    });

    it('should call onRepoChange when valid repo is submitted via Enter', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search or enter owner/repo');
      fireEvent.change(input, { target: { value: 'facebook/react' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnRepoChange).toHaveBeenCalledWith('facebook', 'react');
    });

    it('should call onRepoChange when valid repo is submitted via button', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search or enter owner/repo');
      fireEvent.change(input, { target: { value: 'facebook/react' } });

      await waitFor(() => {
        expect(screen.getByText('Go to facebook/react')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Go to facebook/react');
      fireEvent.click(submitButton);

      expect(mockOnRepoChange).toHaveBeenCalledWith('facebook', 'react');
    });

    it('should not call onRepoChange when input does not contain slash', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search or enter owner/repo');
      fireEvent.change(input, { target: { value: 'invalidformat' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnRepoChange).not.toHaveBeenCalled();
    });

    it('should not show "Go to" button when input does not contain slash', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search or enter owner/repo');
      fireEvent.change(input, { target: { value: 'invalidformat' } });

      expect(screen.queryByText(/^Go to/)).not.toBeInTheDocument();
    });
  });

  describe('Recent Repositories', () => {
    it('should save repo to recent list when selected', () => {
      render(
        <GitHubRepoSelector
          currentOwner="owner"
          currentRepo="repo"
          fullName="owner/repo"
          onRepoChange={mockOnRepoChange}
        />,
        { wrapper: createWrapper() }
      );

      // The component saves to localStorage on mount when owner/repo provided
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    it('should load recent repos from localStorage on mount', () => {
      localStorageStore['github_recent_repos'] = JSON.stringify([
        { owner: 'facebook', repo: 'react', fullName: 'facebook/react' },
      ]);

      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      // Verify localStorage was read
      expect(window.localStorage.getItem).toHaveBeenCalledWith('github_recent_repos');
    });

    it('should show dropdown when clicked with selected repo', async () => {
      localStorageStore['github_recent_repos'] = JSON.stringify([
        { owner: 'facebook', repo: 'react', fullName: 'facebook/react' },
        { owner: 'vercel', repo: 'next.js', fullName: 'vercel/next.js' },
      ]);

      render(
        <GitHubRepoSelector
          currentOwner="facebook"
          currentRepo="react"
          fullName="facebook/react"
          onRepoChange={mockOnRepoChange}
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByText('facebook/react'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });
    });

    it('should handle invalid JSON in localStorage gracefully', async () => {
      localStorageStore['github_recent_repos'] = 'invalid json';

      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });
      // Should not throw and should render normally
    });
  });

  describe('GitHub Link', () => {
    it('should display "View on GitHub" link when htmlUrl is provided', async () => {
      render(
        <GitHubRepoSelector
          currentOwner="owner"
          currentRepo="repo"
          fullName="owner/repo"
          htmlUrl="https://github.com/owner/repo"
          onRepoChange={mockOnRepoChange}
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByText('owner/repo'));

      await waitFor(() => {
        const link = screen.getByText('View on GitHub');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://github.com/owner/repo');
        expect(link).toHaveAttribute('target', '_blank');
      });
    });

    it('should not display "View on GitHub" link when htmlUrl is not provided', async () => {
      render(
        <GitHubRepoSelector
          currentOwner="owner"
          currentRepo="repo"
          fullName="owner/repo"
          onRepoChange={mockOnRepoChange}
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByText('owner/repo'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });

      expect(screen.queryByText('View on GitHub')).not.toBeInTheDocument();
    });
  });

  describe('Input Trimming', () => {
    it('should trim whitespace from input', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search or enter owner/repo')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search or enter owner/repo');
      fireEvent.change(input, { target: { value: '  facebook / react  ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnRepoChange).toHaveBeenCalledWith('facebook', 'react');
    });
  });
});
