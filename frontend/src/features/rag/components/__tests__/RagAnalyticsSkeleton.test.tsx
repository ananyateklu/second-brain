/**
 * RagAnalyticsSkeleton Component Tests
 * Unit tests for the RagAnalyticsSkeleton component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RagAnalyticsSkeleton } from '../RagAnalyticsSkeleton';

// Mock the Shimmer component
vi.mock('../../../../components/ui/Shimmer', () => ({
  ShimmerBlock: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <div data-testid="shimmer-block" className={className} style={style} />
  ),
  ShimmerStyles: () => <style data-testid="shimmer-styles" />,
}));

describe('RagAnalyticsSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render shimmer styles', () => {
      render(<RagAnalyticsSkeleton />);
      expect(screen.getByTestId('shimmer-styles')).toBeInTheDocument();
    });

    it('should render multiple shimmer blocks', () => {
      render(<RagAnalyticsSkeleton />);
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      expect(shimmerBlocks.length).toBeGreaterThan(0);
    });

    it('should render 4 stat card skeletons', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      // Grid with 4 columns for stats
      const statsGrid = container.querySelector('.lg\\:grid-cols-4');
      expect(statsGrid).toBeInTheDocument();
    });

    it('should render correlation card skeleton', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      // Should have 2 cards in the bottom grid (correlation + feedback)
      const bottomGrid = container.querySelector('.lg\\:grid-cols-2');
      expect(bottomGrid).toBeInTheDocument();
      expect(bottomGrid?.children.length).toBe(2);
    });

    it('should render feedback card skeleton', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      // Should have 2 cards in the bottom grid
      const bottomGrid = container.querySelector('.lg\\:grid-cols-2');
      expect(bottomGrid).toBeInTheDocument();
    });
  });

  // ============================================
  // Layout Tests
  // ============================================
  describe('layout', () => {
    it('should have full height flex container', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'flex-col', 'h-full');
    });

    it('should have overflow-auto on main content', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      const scrollContainer = container.querySelector('.overflow-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should have 2-column grid for cards section', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      const twoColGrid = container.querySelector('.lg\\:grid-cols-2');
      expect(twoColGrid).toBeInTheDocument();
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have rounded borders on skeleton cards', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      const roundedCards = container.querySelectorAll('.rounded-2xl');
      expect(roundedCards.length).toBeGreaterThanOrEqual(2);
    });

    it('should have proper gaps between elements', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      const gappedContainers = container.querySelectorAll('.gap-3');
      expect(gappedContainers.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // Skeleton Stat Cards Tests
  // ============================================
  describe('skeleton stat cards', () => {
    it('should render header row with icon placeholder', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have icon placeholders (h-5 w-5 for stat card icons)
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const iconPlaceholders = shimmerBlocks.filter(block =>
        block.className.includes('h-5') && block.className.includes('w-5')
      );
      expect(iconPlaceholders.length).toBeGreaterThan(0);
    });

    it('should render stat value placeholder', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have h-6 placeholders for main stat values
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const valuePlaceholders = shimmerBlocks.filter(block =>
        block.className.includes('h-6')
      );
      expect(valuePlaceholders.length).toBeGreaterThan(0);
    });

    it('should render title placeholders', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have h-3 placeholders for titles
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const titlePlaceholders = shimmerBlocks.filter(block =>
        block.className.includes('h-3')
      );
      expect(titlePlaceholders.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Correlation Card Skeleton Tests
  // ============================================
  describe('correlation card skeleton', () => {
    it('should have header with icon placeholder', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have small icon placeholder wrapped in p-2.5 container
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const smallIcons = shimmerBlocks.filter(block =>
        block.className.includes('h-5') && block.className.includes('w-5')
      );
      expect(smallIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('should have correlation bar placeholders', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have rounded-full placeholders for correlation bars
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const barPlaceholders = shimmerBlocks.filter(block =>
        block.className.includes('rounded-full') && block.className.includes('w-full')
      );
      expect(barPlaceholders.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // Feedback Card Skeleton Tests
  // ============================================
  describe('feedback card skeleton', () => {
    it('should have progress bar placeholders', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have rounded-full placeholders for progress bars
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const progressBars = shimmerBlocks.filter(block =>
        block.className.includes('rounded-full') && block.className.includes('h-2')
      );
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should have subtitle placeholder', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have h-3 w-32 subtitle placeholder
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const subtitles = shimmerBlocks.filter(block =>
        block.className.includes('h-3') && block.className.includes('w-32')
      );
      expect(subtitles.length).toBeGreaterThanOrEqual(1);
    });
  });
});
