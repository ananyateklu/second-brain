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
      // Should have a 250px height element for scatter plot area
      const scatterArea = container.querySelector('[style*="height: 250px"]');
      expect(scatterArea).toBeInTheDocument();
    });

    it('should render feedback card skeleton with pie chart area', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      // Should have a 200x200 rounded element for pie chart
      const pieChart = container.querySelector('[style*="width: 200px"]');
      expect(pieChart).toBeInTheDocument();
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
      const gappedContainers = container.querySelectorAll('.gap-4');
      expect(gappedContainers.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // Skeleton Card Tests
  // ============================================
  describe('skeleton stat cards', () => {
    it('should render header row with icon placeholder', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have multiple icon placeholders (h-10 w-10 for stat card icons)
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const iconPlaceholders = shimmerBlocks.filter(block =>
        block.className.includes('h-10') && block.className.includes('w-10')
      );
      expect(iconPlaceholders.length).toBe(4);
    });

    it('should render stat value placeholder', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have h-8 placeholders for main stat values
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const valuePlaceholders = shimmerBlocks.filter(block =>
        block.className.includes('h-8')
      );
      expect(valuePlaceholders.length).toBe(4);
    });
  });

  // ============================================
  // Correlation Card Skeleton Tests
  // ============================================
  describe('correlation card skeleton', () => {
    it('should have header with icon placeholder', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have small icon placeholder
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const smallIcons = shimmerBlocks.filter(block =>
        block.className.includes('h-5') && block.className.includes('w-5')
      );
      expect(smallIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('should have legend placeholders', () => {
      render(<RagAnalyticsSkeleton />);
      // Should have small circle placeholders for legend
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const legendCircles = shimmerBlocks.filter(block =>
        block.className.includes('h-3') && block.className.includes('w-3') && block.className.includes('rounded-full')
      );
      expect(legendCircles.length).toBe(3);
    });
  });

  // ============================================
  // Feedback Card Skeleton Tests
  // ============================================
  describe('feedback card skeleton', () => {
    it('should have pie chart circular placeholder', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      const pieChart = container.querySelector('.rounded-full[style*="200px"]');
      expect(pieChart).toBeInTheDocument();
    });

    it('should have 2 stats summary boxes', () => {
      const { container } = render(<RagAnalyticsSkeleton />);
      const statsGrid = container.querySelector('.grid-cols-2');
      expect(statsGrid).toBeInTheDocument();
    });
  });
});
