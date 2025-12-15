/**
 * PerformanceSection Component Tests
 * Unit tests for the PerformanceSection component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PerformanceSection } from '../PerformanceSection';
import type { RagPerformanceStats } from '../../../../types/rag';

// Mock child components
vi.mock('../RagStatsCards', () => ({
  RagStatsCards: ({ stats }: { stats: RagPerformanceStats }) => (
    <div data-testid="rag-stats-cards">RagStatsCards: {stats.totalQueries} queries</div>
  ),
}));

vi.mock('../ScoreCorrelationCard', () => ({
  ScoreCorrelationCard: ({ stats: _stats }: { stats: RagPerformanceStats }) => (
    <div data-testid="score-correlation-card">ScoreCorrelationCard</div>
  ),
}));

vi.mock('../FeedbackSummaryCard', () => ({
  FeedbackSummaryCard: ({ stats: _stats }: { stats: RagPerformanceStats }) => (
    <div data-testid="feedback-summary-card">FeedbackSummaryCard</div>
  ),
}));

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
    periodStart: '2024-01-01T00:00:00Z',
    periodEnd: '2024-01-31T23:59:59Z',
    ...overrides,
  };
}

describe('PerformanceSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render RagStatsCards component', () => {
      render(<PerformanceSection stats={createMockStats()} />);
      expect(screen.getByTestId('rag-stats-cards')).toBeInTheDocument();
    });

    it('should render ScoreCorrelationCard component', () => {
      render(<PerformanceSection stats={createMockStats()} />);
      expect(screen.getByTestId('score-correlation-card')).toBeInTheDocument();
    });

    it('should render FeedbackSummaryCard component', () => {
      render(<PerformanceSection stats={createMockStats()} />);
      expect(screen.getByTestId('feedback-summary-card')).toBeInTheDocument();
    });

    it('should pass stats to RagStatsCards', () => {
      render(<PerformanceSection stats={createMockStats({ totalQueries: 200 })} />);
      expect(screen.getByText('RagStatsCards: 200 queries')).toBeInTheDocument();
    });
  });

  // ============================================
  // Layout Tests
  // ============================================
  describe('layout', () => {
    it('should have flex column layout', () => {
      const { container } = render(<PerformanceSection stats={createMockStats()} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'flex-col');
    });

    it('should have min-h-full for full height', () => {
      const { container } = render(<PerformanceSection stats={createMockStats()} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-full');
    });

    it('should have gap between sections', () => {
      const { container } = render(<PerformanceSection stats={createMockStats()} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('gap-4');
    });

    it('should have 2-column grid for correlation and feedback cards', () => {
      const { container } = render(<PerformanceSection stats={createMockStats()} />);
      const grid = container.querySelector('.lg\\:grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('should have overflow-visible for proper rendering', () => {
      const { container } = render(<PerformanceSection stats={createMockStats()} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('overflow-visible');
    });
  });
});
