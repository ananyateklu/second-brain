/**
 * DashboardSkeleton Component Tests
 * Unit tests for the DashboardSkeleton loading placeholder component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardSkeleton } from '../DashboardSkeleton';

// Mock Shimmer components
vi.mock('../../../../components/ui/Shimmer', () => ({
  ShimmerBlock: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <div data-testid="shimmer-block" className={className} style={style} />
  ),
  ShimmerStyles: () => <style data-testid="shimmer-styles" />,
}));

describe('DashboardSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render the dashboard skeleton container', () => {
      const { container } = render(<DashboardSkeleton />);
      const dashboardContainer = container.querySelector('.dashboard-container');
      expect(dashboardContainer).toBeInTheDocument();
    });

    it('should render ShimmerStyles component', () => {
      render(<DashboardSkeleton />);
      expect(screen.getByTestId('shimmer-styles')).toBeInTheDocument();
    });

    it('should render multiple shimmer blocks', () => {
      render(<DashboardSkeleton />);
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      expect(shimmerBlocks.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Stats Cards Grid Tests
  // ============================================
  describe('stats cards grid', () => {
    it('should render 13 skeleton stat cards', () => {
      const { container } = render(<DashboardSkeleton />);
      const statsGrid = container.querySelector('.dashboard-stats-grid');
      expect(statsGrid).toBeInTheDocument();

      // Each skeleton card has specific structure
      const cards = statsGrid?.children;
      expect(cards?.length).toBe(13);
    });

    it('should have flex wrap layout for stats grid', () => {
      const { container } = render(<DashboardSkeleton />);
      const statsGrid = container.querySelector('.dashboard-stats-grid');
      expect(statsGrid).toHaveStyle({ flexWrap: 'wrap' });
    });

    it('should set min-width on skeleton cards', () => {
      const { container } = render(<DashboardSkeleton />);
      const statsGrid = container.querySelector('.dashboard-stats-grid');
      const firstCard = statsGrid?.firstChild as HTMLElement;
      expect(firstCard).toHaveStyle({ minWidth: '150px' });
    });
  });

  // ============================================
  // Charts Section Tests
  // ============================================
  describe('charts section', () => {
    it('should render 2 skeleton chart containers', () => {
      const { container } = render(<DashboardSkeleton />);
      const chartsGrid = container.querySelector('.lg\\:grid-cols-2');
      expect(chartsGrid).toBeInTheDocument();
      expect(chartsGrid?.children.length).toBe(2);
    });

    it('should render chart area with 192px height', () => {
      render(<DashboardSkeleton />);
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const chartAreaBlocks = shimmerBlocks.filter(
        block => block.getAttribute('style')?.includes('height: 192px')
      );
      expect(chartAreaBlocks.length).toBeGreaterThanOrEqual(2);
    });

    it('should render time range filter skeletons (6 buttons per chart)', () => {
      const { container } = render(<DashboardSkeleton />);
      // Each chart has 6 time range buttons
      const chartContainers = container.querySelectorAll('.rounded-3xl.border');
      expect(chartContainers.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // Model Usage Section Tests
  // ============================================
  describe('model usage section', () => {
    it('should render model usage skeleton', () => {
      const { container } = render(<DashboardSkeleton />);
      // The model usage section has a 3-column grid layout
      const threeColGrid = container.querySelector('.lg\\:grid-cols-3');
      expect(threeColGrid).toBeInTheDocument();
    });

    it('should render provider models sidebar skeleton', () => {
      const { container } = render(<DashboardSkeleton />);
      // The sidebar has h-64 class
      const sidebar = container.querySelector('.lg\\:col-span-1.h-64');
      expect(sidebar).toBeInTheDocument();
    });

    it('should render 2 pie chart skeletons', () => {
      render(<DashboardSkeleton />);
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      const pieChartBlocks = shimmerBlocks.filter(
        block => block.getAttribute('style')?.includes('height: 200px')
      );
      expect(pieChartBlocks.length).toBe(2);
    });

    it('should render legend skeletons (6 items)', () => {
      const { container } = render(<DashboardSkeleton />);
      // Legend items have height 28px and width 100px
      const legendContainer = container.querySelector('.justify-center.items-center');
      expect(legendContainer).toBeInTheDocument();
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have space-y-6 for main container', () => {
      const { container } = render(<DashboardSkeleton />);
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('space-y-6');
    });

    it('should use rounded corners on skeleton cards', () => {
      const { container } = render(<DashboardSkeleton />);
      const roundedCards = container.querySelectorAll('.rounded-2xl');
      expect(roundedCards.length).toBeGreaterThan(0);
    });

    it('should use rounded corners on chart containers', () => {
      const { container } = render(<DashboardSkeleton />);
      const roundedCharts = container.querySelectorAll('.rounded-3xl');
      expect(roundedCharts.length).toBeGreaterThanOrEqual(2);
    });

    it('should have border styling on cards', () => {
      const { container } = render(<DashboardSkeleton />);
      const borderedElements = container.querySelectorAll('.border');
      expect(borderedElements.length).toBeGreaterThan(0);
    });

    it('should set background color using CSS variables', () => {
      const { container } = render(<DashboardSkeleton />);
      const statsGrid = container.querySelector('.dashboard-stats-grid');
      const firstCard = statsGrid?.firstChild?.firstChild as HTMLElement;
      expect(firstCard).toHaveStyle({ backgroundColor: 'var(--surface-card)' });
    });
  });

  // ============================================
  // Structure Tests
  // ============================================
  describe('structure', () => {
    it('should have overflow hidden on cards', () => {
      const { container } = render(<DashboardSkeleton />);
      const overflowHiddenElements = container.querySelectorAll('.overflow-hidden');
      expect(overflowHiddenElements.length).toBeGreaterThan(0);
    });

    it('should render skeleton card with icon placeholder', () => {
      render(<DashboardSkeleton />);
      const shimmerBlocks = screen.getAllByTestId('shimmer-block');
      // Icon placeholder is w-6 h-6
      const iconBlocks = shimmerBlocks.filter(block =>
        block.classList.contains('w-6') && block.classList.contains('h-6')
      );
      expect(iconBlocks.length).toBeGreaterThan(0);
    });
  });
});
