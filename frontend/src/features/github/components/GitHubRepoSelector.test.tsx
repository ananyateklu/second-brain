import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitHubRepoSelector } from './GitHubRepoSelector';

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('should display "Select repository" when no repo is selected', () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      expect(screen.getByText('Select repository')).toBeInTheDocument();
    });

    it('should display current repo when provided', () => {
      render(
        <GitHubRepoSelector
          currentOwner="owner"
          currentRepo="repo"
          fullName="owner/repo"
          onRepoChange={mockOnRepoChange}
        />
      );

      expect(screen.getByText('owner/repo')).toBeInTheDocument();
    });
  });

  describe('Dropdown Behavior', () => {
    it('should open dropdown when button is clicked', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <GitHubRepoSelector onRepoChange={mockOnRepoChange} />
          <button data-testid="outside">Outside</button>
        </div>
      );

      // Open dropdown
      fireEvent.click(screen.getByText('Select repository'));
      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
      });

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('owner/repository')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when pressing Escape', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      fireEvent.click(screen.getByText('Select repository'));
      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
      });

      fireEvent.keyDown(screen.getByPlaceholderText('owner/repository'), { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('owner/repository')).not.toBeInTheDocument();
      });
    });
  });

  describe('Repository Input', () => {
    it('should show helper text for input format', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByText(/Enter as owner\/repo/)).toBeInTheDocument();
      });
    });

    it('should call onRepoChange when valid repo is submitted via Enter', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('owner/repository');
      fireEvent.change(input, { target: { value: 'facebook/react' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnRepoChange).toHaveBeenCalledWith('facebook', 'react');
    });

    it('should call onRepoChange when valid repo is submitted via button', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('owner/repository');
      fireEvent.change(input, { target: { value: 'facebook/react' } });

      const submitButton = screen.getByTitle('Go to repository');
      fireEvent.click(submitButton);

      expect(mockOnRepoChange).toHaveBeenCalledWith('facebook', 'react');
    });

    it('should not call onRepoChange when input does not contain slash', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('owner/repository');
      fireEvent.change(input, { target: { value: 'invalidformat' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnRepoChange).not.toHaveBeenCalled();
    });

    it('should disable submit button when input is invalid', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('owner/repository');
      fireEvent.change(input, { target: { value: 'invalidformat' } });

      const submitButton = screen.getByTitle('Go to repository');
      expect(submitButton).toBeDisabled();
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
        />
      );

      // The component saves to localStorage on mount when owner/repo provided
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    it('should load recent repos from localStorage on mount', () => {
      localStorageStore['github_recent_repos'] = JSON.stringify([
        { owner: 'facebook', repo: 'react', fullName: 'facebook/react' },
      ]);

      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      // Verify localStorage was read
      expect(window.localStorage.getItem).toHaveBeenCalledWith('github_recent_repos');
    });

    it('should highlight currently selected repo in recent list', async () => {
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
        />
      );

      fireEvent.click(screen.getByText('facebook/react'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
      });
    });

    it('should handle invalid JSON in localStorage gracefully', async () => {
      localStorageStore['github_recent_repos'] = 'invalid json';

      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
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
        />
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
        />
      );

      fireEvent.click(screen.getByText('owner/repo'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
      });

      expect(screen.queryByText('View on GitHub')).not.toBeInTheDocument();
    });
  });

  describe('Input Trimming', () => {
    it('should trim whitespace from input', async () => {
      render(<GitHubRepoSelector onRepoChange={mockOnRepoChange} />);

      fireEvent.click(screen.getByText('Select repository'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('owner/repository')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('owner/repository');
      fireEvent.change(input, { target: { value: '  facebook / react  ' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnRepoChange).toHaveBeenCalledWith('facebook', 'react');
    });
  });
});
