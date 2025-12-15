/**
 * GroundingSourcesCard Component Tests
 * Unit tests for the GroundingSourcesCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroundingSourcesCard } from '../GroundingSourcesCard';
import type { GroundingSource } from '../../../../types/chat';

// Helper to create mock grounding source
function createMockSource(overrides: Partial<GroundingSource> = {}): GroundingSource {
  return {
    uri: 'https://example.com/article',
    title: 'Test Article Title',
    snippet: 'This is a snippet of the article content.',
    ...overrides,
  };
}

describe('GroundingSourcesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should return null when sources array is empty', () => {
      const { container } = render(<GroundingSourcesCard sources={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render "Google Search Sources" title', () => {
      render(<GroundingSourcesCard sources={[createMockSource()]} />);
      expect(screen.getByText('Google Search Sources')).toBeInTheDocument();
    });

    it('should render source count badge', () => {
      render(
        <GroundingSourcesCard
          sources={[createMockSource(), createMockSource(), createMockSource()]}
        />
      );
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render timeline icon', () => {
      const { container } = render(<GroundingSourcesCard sources={[createMockSource()]} />);
      const iconContainer = container.querySelector('.absolute.left-2\\.5');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it('should render search icon in timeline', () => {
      const { container } = render(<GroundingSourcesCard sources={[createMockSource()]} />);
      // Check for the search icon (magnifying glass)
      const svg = container.querySelector('.absolute svg');
      expect(svg).toHaveStyle({ color: 'var(--color-accent-blue)' });
    });
  });

  // ============================================
  // Expand/Collapse Tests
  // ============================================
  describe('expand and collapse', () => {
    it('should be expanded by default', () => {
      render(<GroundingSourcesCard sources={[createMockSource({ title: 'Test Article' })]} />);
      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });

    it('should collapse when header is clicked', () => {
      render(<GroundingSourcesCard sources={[createMockSource({ title: 'Test Article' })]} />);

      const headerButton = screen.getByRole('button');
      fireEvent.click(headerButton);

      expect(screen.queryByText('Test Article')).not.toBeInTheDocument();
    });

    it('should expand when clicked again', () => {
      render(<GroundingSourcesCard sources={[createMockSource({ title: 'Test Article' })]} />);

      const headerButton = screen.getByRole('button');
      fireEvent.click(headerButton); // Collapse
      fireEvent.click(headerButton); // Expand

      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });

    it('should show chevron rotation when expanded', () => {
      render(<GroundingSourcesCard sources={[createMockSource()]} />);

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
      render(<GroundingSourcesCard sources={[createMockSource({ title: 'Article Title' })]} />);
      expect(screen.getByText('Article Title')).toBeInTheDocument();
    });

    it('should render source URL', () => {
      render(
        <GroundingSourcesCard sources={[createMockSource({ uri: 'https://example.com/page' })]} />
      );
      expect(screen.getByText('https://example.com/page')).toBeInTheDocument();
    });

    it('should use hostname as title when title is not provided', () => {
      render(
        <GroundingSourcesCard
          sources={[createMockSource({ title: '', uri: 'https://example.com/article' })]}
        />
      );
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('should render snippet when provided', () => {
      render(
        <GroundingSourcesCard sources={[createMockSource({ snippet: 'This is a snippet' })]} />
      );
      expect(screen.getByText('This is a snippet')).toBeInTheDocument();
    });

    it('should not render snippet section when snippet is not provided', () => {
      render(
        <GroundingSourcesCard sources={[createMockSource({ snippet: undefined })]} />
      );
      // Only title and URL should be present
      expect(screen.queryByText(/snippet/i)).not.toBeInTheDocument();
    });

    it('should render multiple sources', () => {
      render(
        <GroundingSourcesCard
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
  // Link Tests
  // ============================================
  describe('link behavior', () => {
    it('should render source as a link', () => {
      render(
        <GroundingSourcesCard sources={[createMockSource({ uri: 'https://example.com' })]} />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should open link in new tab', () => {
      render(<GroundingSourcesCard sources={[createMockSource()]} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should have noopener noreferrer for security', () => {
      render(<GroundingSourcesCard sources={[createMockSource()]} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render external link icon', () => {
      render(<GroundingSourcesCard sources={[createMockSource()]} />);

      // External link icon should be present
      const link = screen.getByRole('link');
      const svgs = link.querySelectorAll('svg');
      // There are multiple SVGs - link icon, favicon placeholder, and external icon
      expect(svgs.length).toBeGreaterThan(1);
    });
  });

  // ============================================
  // Streaming Tests
  // ============================================
  describe('streaming behavior', () => {
    it('should show streaming indicator when streaming', () => {
      render(
        <GroundingSourcesCard sources={[createMockSource()]} isStreaming={true} />
      );

      const headerButton = screen.getByRole('button');
      const pulseIndicator = headerButton.querySelector('.animate-pulse.w-1\\.5.h-1\\.5');
      expect(pulseIndicator).toBeInTheDocument();
    });

    it('should not show streaming indicator when not streaming', () => {
      render(
        <GroundingSourcesCard sources={[createMockSource()]} isStreaming={false} />
      );

      const headerButton = screen.getByRole('button');
      const pulseIndicator = headerButton.querySelector('.animate-pulse.w-1\\.5.h-1\\.5');
      expect(pulseIndicator).not.toBeInTheDocument();
    });

    it('should use accent-blue color for streaming indicator', () => {
      const { container } = render(
        <GroundingSourcesCard sources={[createMockSource()]} isStreaming={true} />
      );

      const pulseIndicator = container.querySelector('.animate-pulse.w-1\\.5.h-1\\.5');
      expect(pulseIndicator).toHaveStyle({ backgroundColor: 'var(--color-accent-blue)' });
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have proper wrapper classes', () => {
      const { container } = render(<GroundingSourcesCard sources={[createMockSource()]} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('relative', 'pl-12', 'py-2');
    });

    it('should have hover effect on source card', () => {
      render(<GroundingSourcesCard sources={[createMockSource()]} />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('hover:scale-[1.01]');
    });

    it('should have proper card styling', () => {
      render(<GroundingSourcesCard sources={[createMockSource()]} />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('rounded-lg', 'p-3');
    });

    it('should have badge styling', () => {
      render(<GroundingSourcesCard sources={[createMockSource()]} />);

      const badge = screen.getByText('1');
      expect(badge).toHaveClass('px-1.5', 'py-0.5', 'text-xs', 'rounded-full');
    });

    it('should truncate long titles', () => {
      render(<GroundingSourcesCard sources={[createMockSource()]} />);

      const title = screen.getByText('Test Article Title');
      expect(title).toHaveClass('truncate');
    });

    it('should truncate long URLs', () => {
      render(
        <GroundingSourcesCard sources={[createMockSource({ uri: 'https://example.com/article' })]} />
      );

      const url = screen.getByText('https://example.com/article');
      expect(url).toHaveClass('truncate');
    });

    it('should limit snippet to 2 lines', () => {
      render(
        <GroundingSourcesCard sources={[createMockSource({ snippet: 'Long snippet text' })]} />
      );

      const snippet = screen.getByText('Long snippet text');
      expect(snippet).toHaveClass('line-clamp-2');
    });
  });

  // ============================================
  // Favicon Placeholder Tests
  // ============================================
  describe('favicon placeholder', () => {
    it('should render favicon placeholder for each source', () => {
      const { container } = render(<GroundingSourcesCard sources={[createMockSource()]} />);

      // There should be a favicon placeholder with link icon
      const faviconPlaceholder = container.querySelector('.w-4.h-4.rounded');
      expect(faviconPlaceholder).toBeInTheDocument();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle source with minimal data', () => {
      render(
        <GroundingSourcesCard
          sources={[{ uri: 'https://example.com', title: '', snippet: undefined }]}
        />
      );

      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('should handle very long snippets', () => {
      const longSnippet = 'A'.repeat(500);
      render(
        <GroundingSourcesCard sources={[createMockSource({ snippet: longSnippet })]} />
      );

      const snippet = screen.getByText(longSnippet);
      expect(snippet).toHaveClass('line-clamp-2');
    });

    it('should handle special characters in URLs', () => {
      render(
        <GroundingSourcesCard
          sources={[createMockSource({ uri: 'https://example.com/path?q=test&foo=bar' })]}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com/path?q=test&foo=bar');
    });
  });
});
