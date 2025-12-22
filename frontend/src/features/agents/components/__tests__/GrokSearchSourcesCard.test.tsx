/**
 * GrokSearchSourcesCard Component Tests
 * Unit tests for the GrokSearchSourcesCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GrokSearchSourcesCard } from '../GrokSearchSourcesCard';
import type { GrokSearchSource } from '../../../../types/chat';

// Helper to create mock Grok search source
function createMockSource(overrides: Partial<GrokSearchSource> = {}): GrokSearchSource {
  return {
    url: 'https://example.com/article',
    title: 'Test Article Title',
    snippet: 'This is a snippet of the article content.',
    sourceType: 'web',
    ...overrides,
  };
}

describe('GrokSearchSourcesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should return null when sources array is empty', () => {
      const { container } = render(<GrokSearchSourcesCard sources={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render "Grok Live Search" title', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource()]} />);
      expect(screen.getByText('Grok Live Search')).toBeInTheDocument();
    });

    it('should render source count badge', () => {
      render(
        <GrokSearchSourcesCard
          sources={[createMockSource(), createMockSource(), createMockSource()]}
        />
      );
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render X icon in timeline', () => {
      const { container } = render(<GrokSearchSourcesCard sources={[createMockSource()]} />);
      // Check for the X icon in timeline
      const iconContainer = container.querySelector('.absolute.left-\\[7px\\]');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });
  });

  // ============================================
  // Source Type Tests
  // ============================================
  describe('source types', () => {
    it('should render Web badge for web source', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource({ sourceType: 'web' })]} />);
      expect(screen.getByText('Web')).toBeInTheDocument();
    });

    it('should render X Post badge for x_post source', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource({ sourceType: 'x_post' })]} />);
      expect(screen.getByText('X Post')).toBeInTheDocument();
    });

    it('should render News badge for news source', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource({ sourceType: 'news' })]} />);
      expect(screen.getByText('News')).toBeInTheDocument();
    });

    it('should render different icons for different source types', () => {
      const { container: webContainer } = render(
        <GrokSearchSourcesCard sources={[createMockSource({ sourceType: 'web' })]} />
      );
      const { container: xContainer } = render(
        <GrokSearchSourcesCard sources={[createMockSource({ sourceType: 'x_post' })]} />
      );

      // Each should have unique icon styling
      const webIcon = webContainer.querySelector('.w-5.h-5.rounded svg');
      const xIcon = xContainer.querySelector('.w-5.h-5.rounded svg');

      expect(webIcon).toBeInTheDocument();
      expect(xIcon).toBeInTheDocument();
    });

    it('should use correct colors for web source', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource({ sourceType: 'web' })]} />);

      const badge = screen.getByText('Web');
      // Purple color for web
      expect(badge).toHaveStyle({
        backgroundColor: 'var(--color-accent-purple-alpha, rgba(139, 92, 246, 0.1))',
      });
    });

    it('should use correct colors for x_post source', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource({ sourceType: 'x_post' })]} />);

      const badge = screen.getByText('X Post');
      // Twitter blue for X posts
      expect(badge).toHaveStyle({ backgroundColor: 'rgba(29, 155, 240, 0.1)' });
    });

    it('should use correct colors for news source', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource({ sourceType: 'news' })]} />);

      const badge = screen.getByText('News');
      // Red for news
      expect(badge).toHaveStyle({ backgroundColor: 'rgba(239, 68, 68, 0.1)' });
    });
  });

  // ============================================
  // Expand/Collapse Tests
  // ============================================
  describe('expand and collapse', () => {
    it('should be expanded by default', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource({ title: 'Test Article' })]} />);
      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });

    it('should collapse when header is clicked', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource({ title: 'Test Article' })]} />);

      const headerButton = screen.getByRole('button');
      fireEvent.click(headerButton);

      expect(screen.queryByText('Test Article')).not.toBeInTheDocument();
    });

    it('should expand when clicked again', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource({ title: 'Test Article' })]} />);

      const headerButton = screen.getByRole('button');
      fireEvent.click(headerButton); // Collapse
      fireEvent.click(headerButton); // Expand

      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });

    it('should show chevron rotation when expanded', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource()]} />);

      const headerButton = screen.getByRole('button');
      const chevron = headerButton.querySelector('svg:last-of-type');

      expect(chevron).toHaveClass('rotate-180');

      fireEvent.click(headerButton);
      expect(chevron).not.toHaveClass('rotate-180');
    });
  });

  // ============================================
  // Source Display Tests
  // ============================================
  describe('source display', () => {
    it('should render source title', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource({ title: 'Article Title' })]} />);
      expect(screen.getByText('Article Title')).toBeInTheDocument();
    });

    it('should render source URL', () => {
      render(
        <GrokSearchSourcesCard sources={[createMockSource({ url: 'https://example.com/page' })]} />
      );
      expect(screen.getByText('https://example.com/page')).toBeInTheDocument();
    });

    it('should use hostname as title when title is not provided', () => {
      render(
        <GrokSearchSourcesCard
          sources={[createMockSource({ title: '', url: 'https://example.com/article' })]}
        />
      );
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('should render snippet when provided', () => {
      render(
        <GrokSearchSourcesCard sources={[createMockSource({ snippet: 'This is a snippet' })]} />
      );
      expect(screen.getByText('This is a snippet')).toBeInTheDocument();
    });

    it('should render multiple sources', () => {
      render(
        <GrokSearchSourcesCard
          sources={[
            createMockSource({ title: 'Source 1' }),
            createMockSource({ title: 'Source 2' }),
            createMockSource({ title: 'Source 3' }),
          ]}
        />
      );

      expect(screen.getByText('Source 1')).toBeInTheDocument();
      expect(screen.getByText('Source 2')).toBeInTheDocument();
      expect(screen.getByText('Source 3')).toBeInTheDocument();
    });
  });

  // ============================================
  // Published Date Tests
  // ============================================
  describe('published date', () => {
    it('should show "Just now" for very recent posts', () => {
      const recentDate = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
      render(
        <GrokSearchSourcesCard sources={[createMockSource({ publishedAt: recentDate })]} />
      );
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should show hours ago for posts within 24 hours', () => {
      const hoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // 5 hours ago
      render(
        <GrokSearchSourcesCard sources={[createMockSource({ publishedAt: hoursAgo })]} />
      );
      expect(screen.getByText('5h ago')).toBeInTheDocument();
    });

    it('should show days ago for posts within a week', () => {
      const daysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago
      render(
        <GrokSearchSourcesCard sources={[createMockSource({ publishedAt: daysAgo })]} />
      );
      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });

    it('should show formatted date for older posts', () => {
      // Use a date that's more than a week ago
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      render(
        <GrokSearchSourcesCard sources={[createMockSource({ publishedAt: oldDate })]} />
      );
      // Should show a month+day format when date is older than a week
      // Format is locale-dependent, so just check that a month abbreviation is shown
      const sourceCard = screen.getByRole('link');
      const hasDate = /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/.test(sourceCard.textContent || '');
      expect(hasDate).toBe(true);
    });

    it('should not show date when publishedAt is not provided', () => {
      render(
        <GrokSearchSourcesCard sources={[createMockSource({ publishedAt: undefined })]} />
      );
      // Should not have the separator dot
      const source = screen.getByRole('link');
      expect(source.textContent).not.toContain('ago');
    });
  });

  // ============================================
  // Link Tests
  // ============================================
  describe('link behavior', () => {
    it('should render source as a link', () => {
      render(
        <GrokSearchSourcesCard sources={[createMockSource({ url: 'https://example.com' })]} />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should open link in new tab', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource()]} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should have noopener noreferrer for security', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource()]} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // ============================================
  // Streaming Tests
  // ============================================
  describe('streaming behavior', () => {
    it('should show streaming indicator when streaming', () => {
      render(
        <GrokSearchSourcesCard sources={[createMockSource()]} isStreaming={true} />
      );

      const headerButton = screen.getByRole('button');
      const pulseIndicator = headerButton.querySelector('.animate-pulse.w-1\\.5.h-1\\.5');
      expect(pulseIndicator).toBeInTheDocument();
    });

    it('should not show streaming indicator when not streaming', () => {
      render(
        <GrokSearchSourcesCard sources={[createMockSource()]} isStreaming={false} />
      );

      const headerButton = screen.getByRole('button');
      const pulseIndicator = headerButton.querySelector('.animate-pulse.w-1\\.5.h-1\\.5');
      expect(pulseIndicator).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have proper wrapper classes', () => {
      const { container } = render(<GrokSearchSourcesCard sources={[createMockSource()]} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('relative', 'pl-12', 'py-2');
    });

    it('should have hover effect on source card', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource()]} />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('hover:scale-[1.01]');
    });

    it('should truncate long titles', () => {
      render(<GrokSearchSourcesCard sources={[createMockSource()]} />);

      const titleElement = screen.getByText('Test Article Title');
      expect(titleElement).toHaveClass('truncate');
    });

    it('should truncate long URLs', () => {
      render(
        <GrokSearchSourcesCard
          sources={[createMockSource({ url: 'https://example.com/article' })]}
        />
      );

      const url = screen.getByText('https://example.com/article');
      expect(url).toHaveClass('truncate');
    });

    it('should limit snippet to 2 lines', () => {
      render(
        <GrokSearchSourcesCard sources={[createMockSource({ snippet: 'Long snippet text' })]} />
      );

      const snippet = screen.getByText('Long snippet text');
      expect(snippet).toHaveClass('line-clamp-2');
    });
  });

  // ============================================
  // Mixed Source Types Tests
  // ============================================
  describe('mixed source types', () => {
    it('should render different badges for different source types', () => {
      render(
        <GrokSearchSourcesCard
          sources={[
            createMockSource({ title: 'Web Result', sourceType: 'web' }),
            createMockSource({ title: 'Tweet', sourceType: 'x_post' }),
            createMockSource({ title: 'News Article', sourceType: 'news' }),
          ]}
        />
      );

      expect(screen.getByText('Web')).toBeInTheDocument();
      expect(screen.getByText('X Post')).toBeInTheDocument();
      expect(screen.getByText('News')).toBeInTheDocument();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle source with minimal data', () => {
      render(
        <GrokSearchSourcesCard
          sources={[
            {
              url: 'https://example.com',
              title: '',
              snippet: '',
              sourceType: 'web',
            },
          ]}
        />
      );

      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('should handle invalid date gracefully', () => {
      render(
        <GrokSearchSourcesCard
          sources={[createMockSource({ publishedAt: 'invalid-date' })]}
        />
      );

      // Should not crash, date should not be displayed
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    });

    it('should handle special characters in URLs', () => {
      render(
        <GrokSearchSourcesCard
          sources={[createMockSource({ url: 'https://example.com/path?q=test&foo=bar' })]}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com/path?q=test&foo=bar');
    });

    it('should handle very long snippets', () => {
      const longSnippet = 'A'.repeat(500);
      render(
        <GrokSearchSourcesCard sources={[createMockSource({ snippet: longSnippet })]} />
      );

      const snippet = screen.getByText(longSnippet);
      expect(snippet).toHaveClass('line-clamp-2');
    });
  });
});
