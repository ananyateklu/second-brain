/**
 * AnalyticsTabBar Component Tests
 * Unit tests for the AnalyticsTabBar component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsTabBar, type TabType } from '../AnalyticsTabBar';

describe('AnalyticsTabBar', () => {
  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render all tab options', () => {
      render(<AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />);

      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Topics')).toBeInTheDocument();
      expect(screen.getByText('Query Logs')).toBeInTheDocument();
    });

    it('should render 3 tab buttons', () => {
      render(<AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('should render icons for each tab', () => {
      const { container } = render(
        <AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />
      );

      const icons = container.querySelectorAll('svg.w-4.h-4');
      expect(icons.length).toBe(3);
    });
  });

  // ============================================
  // Active Tab Tests
  // ============================================
  describe('active tab', () => {
    it('should highlight Performance tab when active', () => {
      render(<AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />);

      const performanceTab = screen.getByText('Performance').closest('button');
      expect(performanceTab).toHaveStyle({ backgroundColor: 'var(--surface-card)' });
    });

    it('should highlight Topics tab when active', () => {
      render(<AnalyticsTabBar activeTab="topics" onTabChange={mockOnTabChange} />);

      const topicsTab = screen.getByText('Topics').closest('button');
      expect(topicsTab).toHaveStyle({ backgroundColor: 'var(--surface-card)' });
    });

    it('should highlight Query Logs tab when active', () => {
      render(<AnalyticsTabBar activeTab="logs" onTabChange={mockOnTabChange} />);

      const logsTab = screen.getByText('Query Logs').closest('button');
      expect(logsTab).toHaveStyle({ backgroundColor: 'var(--surface-card)' });
    });

    it('should show active indicator line under active tab', () => {
      const { container } = render(
        <AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />
      );

      const performanceTab = screen.getByText('Performance').closest('button');
      const indicator = performanceTab?.querySelector('.absolute.bottom-0');
      expect(indicator).toBeInTheDocument();
    });

    it('should not show indicator under inactive tabs', () => {
      const { container } = render(
        <AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />
      );

      const topicsTab = screen.getByText('Topics').closest('button');
      const indicator = topicsTab?.querySelector('.absolute.bottom-0');
      expect(indicator).not.toBeInTheDocument();
    });

    it('should use primary color for active tab text', () => {
      render(<AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />);

      const performanceTab = screen.getByText('Performance').closest('button');
      expect(performanceTab).toHaveStyle({ color: 'var(--text-primary)' });
    });

    it('should use tertiary color for inactive tab text', () => {
      render(<AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />);

      const topicsTab = screen.getByText('Topics').closest('button');
      expect(topicsTab).toHaveStyle({ color: 'var(--text-tertiary)' });
    });
  });

  // ============================================
  // Click Handler Tests
  // ============================================
  describe('click handling', () => {
    it('should call onTabChange with "performance" when Performance clicked', () => {
      render(<AnalyticsTabBar activeTab="topics" onTabChange={mockOnTabChange} />);

      fireEvent.click(screen.getByText('Performance'));
      expect(mockOnTabChange).toHaveBeenCalledWith('performance');
    });

    it('should call onTabChange with "topics" when Topics clicked', () => {
      render(<AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />);

      fireEvent.click(screen.getByText('Topics'));
      expect(mockOnTabChange).toHaveBeenCalledWith('topics');
    });

    it('should call onTabChange with "logs" when Query Logs clicked', () => {
      render(<AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />);

      fireEvent.click(screen.getByText('Query Logs'));
      expect(mockOnTabChange).toHaveBeenCalledWith('logs');
    });

    it('should call onTabChange when clicking already active tab', () => {
      render(<AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />);

      fireEvent.click(screen.getByText('Performance'));
      expect(mockOnTabChange).toHaveBeenCalledWith('performance');
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have glassmorphism container styling', () => {
      const { container } = render(
        <AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('backdrop-blur-md', 'rounded-xl');
    });

    it('should have transition effects on tabs', () => {
      const { container } = render(
        <AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />
      );

      const buttons = container.querySelectorAll('.transition-all');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('should have proper spacing between tabs', () => {
      const { container } = render(
        <AnalyticsTabBar activeTab="performance" onTabChange={mockOnTabChange} />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'p-1');
    });
  });
});
