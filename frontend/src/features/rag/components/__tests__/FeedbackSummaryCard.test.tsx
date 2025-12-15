/**
 * FeedbackSummaryCard Component Tests
 * Unit tests for the FeedbackSummaryCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedbackSummaryCard } from '../FeedbackSummaryCard';

interface FeedbackStats {
  totalQueries: number;
  queriesWithFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
}

// Helper to create mock stats
function createMockStats(overrides: Partial<FeedbackStats> = {}): FeedbackStats {
  return {
    totalQueries: 100,
    queriesWithFeedback: 50,
    positiveFeedback: 40,
    negativeFeedback: 10,
    ...overrides,
  };
}

describe('FeedbackSummaryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render "Feedback Summary" title', () => {
      render(<FeedbackSummaryCard stats={createMockStats()} />);
      expect(screen.getByText('Feedback Summary')).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(<FeedbackSummaryCard stats={createMockStats()} />);
      expect(screen.getByText('User satisfaction breakdown')).toBeInTheDocument();
    });

    it('should render positive feedback section', () => {
      render(<FeedbackSummaryCard stats={createMockStats()} />);
      expect(screen.getByText('Positive Feedback')).toBeInTheDocument();
    });

    it('should render negative feedback section', () => {
      render(<FeedbackSummaryCard stats={createMockStats()} />);
      expect(screen.getByText('Negative Feedback')).toBeInTheDocument();
    });

    it('should render awaiting feedback section', () => {
      render(<FeedbackSummaryCard stats={createMockStats()} />);
      expect(screen.getByText('Awaiting Feedback')).toBeInTheDocument();
    });
  });

  // ============================================
  // Values Display Tests
  // ============================================
  describe('values display', () => {
    it('should display positive feedback count', () => {
      render(<FeedbackSummaryCard stats={createMockStats({ positiveFeedback: 42 })} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should display negative feedback count', () => {
      render(<FeedbackSummaryCard stats={createMockStats({ negativeFeedback: 8 })} />);
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should display awaiting feedback count', () => {
      render(<FeedbackSummaryCard stats={createMockStats({
        totalQueries: 100,
        queriesWithFeedback: 30,
      })} />);
      expect(screen.getByText('70')).toBeInTheDocument();
    });

    it('should calculate awaiting feedback correctly', () => {
      render(<FeedbackSummaryCard stats={createMockStats({
        totalQueries: 250,
        queriesWithFeedback: 100,
      })} />);
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  // ============================================
  // Progress Bar Tests
  // ============================================
  describe('progress bars', () => {
    it('should render progress bars for each feedback type', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats()} />);
      const progressBars = container.querySelectorAll('.h-2.rounded-full.overflow-hidden');
      expect(progressBars.length).toBe(3);
    });

    it('should calculate positive bar width correctly', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats({
        queriesWithFeedback: 100,
        positiveFeedback: 75,
      })} />);

      const progressBars = container.querySelectorAll('.h-full.rounded-full.transition-all');
      const positiveBar = progressBars[0];
      expect(positiveBar).toHaveStyle({ width: '75%' });
    });

    it('should calculate negative bar width correctly', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats({
        queriesWithFeedback: 100,
        negativeFeedback: 25,
      })} />);

      const progressBars = container.querySelectorAll('.h-full.rounded-full.transition-all');
      const negativeBar = progressBars[1];
      expect(negativeBar).toHaveStyle({ width: '25%' });
    });

    it('should show 0% width when no feedback', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats({
        queriesWithFeedback: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
      })} />);

      const progressBars = container.querySelectorAll('.h-full.rounded-full.transition-all');
      expect(progressBars[0]).toHaveStyle({ width: '0%' });
      expect(progressBars[1]).toHaveStyle({ width: '0%' });
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have card styling with rounded corners', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats()} />);
      const card = container.firstChild;
      expect(card).toHaveClass('rounded-2xl');
    });

    it('should have hover effect', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats()} />);
      const card = container.firstChild;
      expect(card).toHaveClass('hover:-translate-y-0.5');
    });

    it('should have backdrop blur', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats()} />);
      const card = container.firstChild;
      expect(card).toHaveClass('backdrop-blur-md');
    });

    it('should have ambient glow element', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats()} />);
      const glow = container.querySelector('.opacity-15.blur-3xl');
      expect(glow).toBeInTheDocument();
    });

    it('should use positive color for positive feedback', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats()} />);
      const positiveValue = screen.getByText('Positive Feedback')
        .closest('div')
        ?.querySelector('.font-semibold');
      expect(positiveValue).toHaveStyle({ color: 'var(--color-brand-400)' });
    });

    it('should use error color for negative feedback', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats()} />);
      const negativeValue = screen.getByText('Negative Feedback')
        .closest('div')
        ?.querySelector('.font-semibold');
      expect(negativeValue).toHaveStyle({ color: 'var(--color-error)' });
    });
  });

  // ============================================
  // Footer Tests
  // ============================================
  describe('footer', () => {
    it('should render footer message', () => {
      render(<FeedbackSummaryCard stats={createMockStats()} />);
      expect(screen.getByText(/Collecting more feedback/)).toBeInTheDocument();
    });

    it('should have border-top on footer', () => {
      const { container } = render(<FeedbackSummaryCard stats={createMockStats()} />);
      const footer = container.querySelector('.mt-3.pt-2.border-t');
      expect(footer).toBeInTheDocument();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle zero total queries', () => {
      // This will cause division by zero for awaiting feedback percentage
      // The component should handle it gracefully
      const { container } = render(<FeedbackSummaryCard stats={createMockStats({
        totalQueries: 0,
        queriesWithFeedback: 0,
      })} />);

      // Should render without crashing
      expect(screen.getByText('Feedback Summary')).toBeInTheDocument();
    });

    it('should handle all positive feedback', () => {
      render(<FeedbackSummaryCard stats={createMockStats({
        queriesWithFeedback: 50,
        positiveFeedback: 50,
        negativeFeedback: 0,
      })} />);

      // Multiple 50s may appear, check at least one exists
      const fifties = screen.getAllByText('50');
      expect(fifties.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle all negative feedback', () => {
      render(<FeedbackSummaryCard stats={createMockStats({
        queriesWithFeedback: 50,
        positiveFeedback: 0,
        negativeFeedback: 50,
      })} />);

      // Multiple values may appear
      const fifties = screen.getAllByText('50');
      expect(fifties.length).toBeGreaterThanOrEqual(1);
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(1);
    });
  });
});
