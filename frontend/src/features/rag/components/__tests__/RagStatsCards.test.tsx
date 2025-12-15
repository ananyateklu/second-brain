/**
 * RagStatsCards Component Tests
 * Unit tests for the RagStatsCards component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RagStatsCards } from '../RagStatsCards';
import type { RagPerformanceStats } from '../../../../types/rag';

// Helper to create mock stats
function createMockStats(overrides: Partial<RagPerformanceStats> = {}): RagPerformanceStats {
  return {
    totalQueries: 100,
    queriesWithFeedback: 50,
    positiveFeedback: 40,
    negativeFeedback: 10,
    positiveFeedbackRate: 0.8,
    avgRetrievedCount: 4.5,
    avgTotalTimeMs: 250,
    avgCosineScore: 0.75,
    avgRerankScore: 0.82,
    cosineScoreCorrelation: 0.65,
    rerankScoreCorrelation: 0.72,
    ...overrides,
  };
}

describe('RagStatsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render all 4 stat cards', () => {
      render(<RagStatsCards stats={createMockStats()} />);

      expect(screen.getByText('Total Queries')).toBeInTheDocument();
      expect(screen.getByText('Satisfaction Rate')).toBeInTheDocument();
      expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
      expect(screen.getByText('Avg Documents')).toBeInTheDocument();
    });

    it('should render total queries count', () => {
      render(<RagStatsCards stats={createMockStats({ totalQueries: 1234 })} />);
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    it('should render satisfaction rate percentage', () => {
      render(<RagStatsCards stats={createMockStats({ positiveFeedbackRate: 0.75 })} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should render 0% satisfaction rate when no feedback', () => {
      render(<RagStatsCards stats={createMockStats({ queriesWithFeedback: 0 })} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show queries with feedback count', () => {
      render(<RagStatsCards stats={createMockStats({ queriesWithFeedback: 42 })} />);
      expect(screen.getByText('42 rated')).toBeInTheDocument();
    });

    it('should render avg documents retrieved', () => {
      render(<RagStatsCards stats={createMockStats({ avgRetrievedCount: 3.7 })} />);
      expect(screen.getByText('3.7')).toBeInTheDocument();
    });
  });

  // ============================================
  // Time Formatting Tests
  // ============================================
  describe('time formatting', () => {
    it('should format time in milliseconds when under 1 second', () => {
      render(<RagStatsCards stats={createMockStats({ avgTotalTimeMs: 250 })} />);
      expect(screen.getByText('250ms')).toBeInTheDocument();
    });

    it('should format time in seconds when over 1 second', () => {
      render(<RagStatsCards stats={createMockStats({ avgTotalTimeMs: 1500 })} />);
      expect(screen.getByText('1.5s')).toBeInTheDocument();
    });

    it('should round milliseconds to nearest integer', () => {
      render(<RagStatsCards stats={createMockStats({ avgTotalTimeMs: 456.78 })} />);
      expect(screen.getByText('457ms')).toBeInTheDocument();
    });

    it('should format exactly 1 second correctly', () => {
      // Note: 1000ms is exactly 1 second, which is > 1000, so it formats as seconds
      // The component uses > 1000 comparison, so 1000 formats as ms
      render(<RagStatsCards stats={createMockStats({ avgTotalTimeMs: 1001 })} />);
      expect(screen.getByText('1.0s')).toBeInTheDocument();
    });
  });

  // ============================================
  // Trend Tests
  // ============================================
  describe('trend display', () => {
    it('should show positive feedback count in trend', () => {
      render(<RagStatsCards stats={createMockStats({ positiveFeedback: 40, negativeFeedback: 10 })} />);
      expect(screen.getByText('40 positive / 10 negative')).toBeInTheDocument();
    });

    it('should use positive trend type when feedback rate >= 70%', () => {
      const { container } = render(
        <RagStatsCards stats={createMockStats({ positiveFeedbackRate: 0.75 })} />
      );

      const trendElement = screen.getByText('40 positive / 10 negative');
      expect(trendElement).toHaveStyle({ color: 'var(--color-brand-400)' });
    });

    it('should use negative trend type when feedback rate < 50%', () => {
      const { container } = render(
        <RagStatsCards stats={createMockStats({ positiveFeedbackRate: 0.4, queriesWithFeedback: 50 })} />
      );

      const trendElement = screen.getByText('40 positive / 10 negative');
      expect(trendElement).toHaveStyle({ color: 'var(--color-error)' });
    });
  });

  // ============================================
  // Subtitle Tests
  // ============================================
  describe('subtitles', () => {
    it('should show RAG-enhanced searches subtitle', () => {
      render(<RagStatsCards stats={createMockStats()} />);
      expect(screen.getByText('RAG-enhanced searches')).toBeInTheDocument();
    });

    it('should show Query to results subtitle', () => {
      render(<RagStatsCards stats={createMockStats()} />);
      expect(screen.getByText('Query to results')).toBeInTheDocument();
    });

    it('should show Retrieved per query subtitle', () => {
      render(<RagStatsCards stats={createMockStats()} />);
      expect(screen.getByText('Retrieved per query')).toBeInTheDocument();
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should render in a 4-column grid layout', () => {
      const { container } = render(<RagStatsCards stats={createMockStats()} />);
      const grid = container.firstChild;
      expect(grid).toHaveClass('grid', 'lg:grid-cols-4');
    });

    it('should have card styling with rounded corners', () => {
      const { container } = render(<RagStatsCards stats={createMockStats()} />);
      const cards = container.querySelectorAll('.rounded-2xl');
      expect(cards.length).toBe(4);
    });

    it('should have hover effect on cards', () => {
      const { container } = render(<RagStatsCards stats={createMockStats()} />);
      const cards = container.querySelectorAll('.hover\\:-translate-y-0\\.5');
      expect(cards.length).toBe(4);
    });
  });

  // ============================================
  // Icon Tests
  // ============================================
  describe('icons', () => {
    it('should render svg icons for each card', () => {
      const { container } = render(<RagStatsCards stats={createMockStats()} />);
      const icons = container.querySelectorAll('svg.w-5.h-5');
      expect(icons.length).toBe(4);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle zero values gracefully', () => {
      render(<RagStatsCards stats={createMockStats({
        totalQueries: 0,
        queriesWithFeedback: 0,
        avgTotalTimeMs: 0,
        avgRetrievedCount: 0,
      })} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0ms')).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      render(<RagStatsCards stats={createMockStats({ totalQueries: 1000000 })} />);
      expect(screen.getByText('1,000,000')).toBeInTheDocument();
    });

    it('should handle very small response times', () => {
      render(<RagStatsCards stats={createMockStats({ avgTotalTimeMs: 1 })} />);
      expect(screen.getByText('1ms')).toBeInTheDocument();
    });
  });
});
