import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GitHubEmptyState } from './GitHubEmptyState';

describe('GitHubEmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Default State', () => {
    it('should display default title when no error', () => {
      render(<GitHubEmptyState />);

      expect(screen.getByText('Connect to GitHub')).toBeInTheDocument();
    });

    it('should display default description when no error', () => {
      render(<GitHubEmptyState />);

      expect(
        screen.getByText(/View your pull requests, review status, and monitor GitHub Actions/)
      ).toBeInTheDocument();
    });

    it('should display GitHub logo', () => {
      render(<GitHubEmptyState />);

      // Check for the GitHub logo SVG container
      const logoContainer = document.querySelector('svg[viewBox="0 0 24 24"]');
      expect(logoContainer).toBeInTheDocument();
    });

    it('should display help link', () => {
      render(<GitHubEmptyState />);

      const helpLink = screen.getByText('Learn more about GitHub tokens');
      expect(helpLink).toBeInTheDocument();
      expect(helpLink).toHaveAttribute(
        'href',
        'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens'
      );
      expect(helpLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Not Configured State', () => {
    it('should display configuration title when error contains "not configured"', () => {
      const error = new Error('GitHub integration is not configured');
      render(<GitHubEmptyState error={error} />);

      expect(screen.getByText('Configure GitHub Integration')).toBeInTheDocument();
    });

    it('should display configuration steps', () => {
      const error = new Error('not configured');
      render(<GitHubEmptyState error={error} />);

      expect(screen.getByText('Setup Instructions')).toBeInTheDocument();
      expect(screen.getByText(/Personal access tokens/)).toBeInTheDocument();
    });

    it('should display required scopes', () => {
      const error = new Error('not configured');
      render(<GitHubEmptyState error={error} />);

      expect(screen.getByText('repo')).toBeInTheDocument();
      expect(screen.getByText('workflow')).toBeInTheDocument();
    });

    it('should display configuration keys', () => {
      const error = new Error('not configured');
      render(<GitHubEmptyState error={error} />);

      expect(screen.getByText('GitHub:PersonalAccessToken')).toBeInTheDocument();
      expect(screen.getByText('GitHub:DefaultOwner')).toBeInTheDocument();
      expect(screen.getByText('GitHub:DefaultRepo')).toBeInTheDocument();
    });
  });

  describe('Unauthorized State', () => {
    it('should display authentication title when error contains "Unauthorized"', () => {
      const error = new Error('Unauthorized');
      render(<GitHubEmptyState error={error} />);

      expect(screen.getByText('GitHub Authentication Required')).toBeInTheDocument();
    });

    it('should display authentication title when error contains "authentication"', () => {
      const error = new Error('authentication failed');
      render(<GitHubEmptyState error={error} />);

      expect(screen.getByText('GitHub Authentication Required')).toBeInTheDocument();
    });

    it('should display token update message for unauthorized errors', () => {
      const error = new Error('Unauthorized');
      render(<GitHubEmptyState error={error} />);

      expect(
        screen.getByText(/Your GitHub Personal Access Token may be invalid or expired/)
      ).toBeInTheDocument();
    });

    it('should display setup instructions for unauthorized errors', () => {
      const error = new Error('Unauthorized');
      render(<GitHubEmptyState error={error} />);

      expect(screen.getByText('Setup Instructions')).toBeInTheDocument();
    });
  });

  describe('Generic Error State', () => {
    it('should display error message for generic errors', () => {
      const error = new Error('Network error occurred');
      render(<GitHubEmptyState error={error} />);

      expect(screen.getByText(/Network error occurred/)).toBeInTheDocument();
    });

    it('should display default title for generic errors', () => {
      const error = new Error('Network error occurred');
      render(<GitHubEmptyState error={error} />);

      expect(screen.getByText('Connect to GitHub')).toBeInTheDocument();
    });

    it('should not display setup instructions for generic errors', () => {
      const error = new Error('Network error occurred');
      render(<GitHubEmptyState error={error} />);

      expect(screen.queryByText('Setup Instructions')).not.toBeInTheDocument();
    });
  });

  describe('Configure Button', () => {
    it('should display Open Settings button when onConfigure is provided', () => {
      const onConfigure = vi.fn();
      render(<GitHubEmptyState onConfigure={onConfigure} />);

      expect(screen.getByText('Open Settings')).toBeInTheDocument();
    });

    it('should call onConfigure when Open Settings is clicked', () => {
      const onConfigure = vi.fn();
      render(<GitHubEmptyState onConfigure={onConfigure} />);

      fireEvent.click(screen.getByText('Open Settings'));

      expect(onConfigure).toHaveBeenCalledTimes(1);
    });

    it('should not display Open Settings button when onConfigure is not provided', () => {
      render(<GitHubEmptyState />);

      expect(screen.queryByText('Open Settings')).not.toBeInTheDocument();
    });
  });

  describe('Null Error', () => {
    it('should handle null error gracefully', () => {
      render(<GitHubEmptyState error={null} />);

      expect(screen.getByText('Connect to GitHub')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should render with proper container structure', () => {
      render(<GitHubEmptyState />);

      const container = screen.getByText('Connect to GitHub').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('should render numbered steps with proper styling', () => {
      const error = new Error('not configured');
      render(<GitHubEmptyState error={error} />);

      // Check for step numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const error = new Error('not configured');
      render(<GitHubEmptyState error={error} />);

      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Configure GitHub Integration');

      const subHeading = screen.getByRole('heading', { level: 3 });
      expect(subHeading).toHaveTextContent('Setup Instructions');
    });

    it('should have accessible link for GitHub tokens documentation', () => {
      render(<GitHubEmptyState />);

      const link = screen.getByRole('link', { name: /Learn more about GitHub tokens/ });
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
