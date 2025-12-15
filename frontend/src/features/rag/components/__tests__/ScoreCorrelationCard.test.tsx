/**
 * ScoreCorrelationCard Component Tests
 * Unit tests for the ScoreCorrelationCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreCorrelationCard } from '../ScoreCorrelationCard';
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
    periodStart: '2024-01-01T00:00:00Z',
    periodEnd: '2024-01-31T23:59:59Z',
    ...overrides,
  };
}

describe('ScoreCorrelationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render "Score Correlation Analysis" title', () => {
      render(<ScoreCorrelationCard stats={createMockStats()} />);
      expect(screen.getByText('Score Correlation Analysis')).toBeInTheDocument();
    });

    it('should render cosine similarity section', () => {
      render(<ScoreCorrelationCard stats={createMockStats()} />);
      expect(screen.getByText('Cosine Similarity')).toBeInTheDocument();
    });

    it('should render rerank score section', () => {
      render(<ScoreCorrelationCard stats={createMockStats()} />);
      expect(screen.getByText('Rerank Score')).toBeInTheDocument();
    });

    it('should render interpretation footer', () => {
      render(<ScoreCorrelationCard stats={createMockStats()} />);
      expect(screen.getByText(/Interpretation:/)).toBeInTheDocument();
    });
  });

  // ============================================
  // Correlation Value Tests
  // ============================================
  describe('correlation values', () => {
    it('should display cosine correlation value', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: 0.65 })} />);
      expect(screen.getByText('0.650')).toBeInTheDocument();
    });

    it('should display rerank correlation value', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ rerankScoreCorrelation: 0.72 })} />);
      expect(screen.getByText('0.720')).toBeInTheDocument();
    });

    it('should show "N/A" when correlation is null', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: null })} />);
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should display average cosine score', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ avgCosineScore: 0.75 })} />);
      expect(screen.getByText('Avg: 0.75')).toBeInTheDocument();
    });

    it('should display average rerank score', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ avgRerankScore: 0.82 })} />);
      expect(screen.getByText('Avg: 0.82')).toBeInTheDocument();
    });
  });

  // ============================================
  // Correlation Label Tests
  // ============================================
  describe('correlation labels', () => {
    it('should show "Weak" for correlation < 0.2', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: 0.15 })} />);
      expect(screen.getByText(/Weak.*correlation/)).toBeInTheDocument();
    });

    it('should show "Moderate" for correlation between 0.2 and 0.5', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: 0.35 })} />);
      expect(screen.getByText(/Moderate positive correlation/)).toBeInTheDocument();
    });

    it('should show "Strong" for correlation >= 0.5', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: 0.65 })} />);
      // May be multiple elements, check at least one exists
      const strongLabels = screen.getAllByText(/Strong positive correlation/);
      expect(strongLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should show "negative" for negative correlations', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: -0.6 })} />);
      expect(screen.getByText(/negative correlation/)).toBeInTheDocument();
    });

    it('should show "Insufficient data" when correlation is null', () => {
      render(<ScoreCorrelationCard stats={createMockStats({
        cosineScoreCorrelation: null,
        rerankScoreCorrelation: null
      })} />);
      const insufficientDataLabels = screen.getAllByText(/Insufficient data/);
      expect(insufficientDataLabels.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // Warning Message Tests
  // ============================================
  describe('warning message', () => {
    it('should show warning when less than 10 feedbacks', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ queriesWithFeedback: 5 })} />);
      expect(screen.getByText('Need more feedback data')).toBeInTheDocument();
    });

    it('should not show warning when 10+ feedbacks', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ queriesWithFeedback: 15 })} />);
      expect(screen.queryByText('Need more feedback data')).not.toBeInTheDocument();
    });

    it('should show instructions for collecting feedback', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ queriesWithFeedback: 5 })} />);
      expect(screen.getByText(/Collect at least 10 feedback/)).toBeInTheDocument();
    });
  });

  // ============================================
  // Progress Bar Tests
  // ============================================
  describe('progress bars', () => {
    it('should render progress bars', () => {
      const { container } = render(<ScoreCorrelationCard stats={createMockStats()} />);
      const bars = container.querySelectorAll('.h-2\\.5.rounded-full.overflow-hidden');
      expect(bars.length).toBe(2);
    });

    it('should set bar width based on correlation', () => {
      const { container } = render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: 0.5 })} />);
      const bars = container.querySelectorAll('.h-full.rounded-full.transition-all');
      const firstBar = bars[0];
      expect(firstBar).toHaveStyle({ width: '50%' });
    });

    it('should use minimum width of 2%', () => {
      const { container } = render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: 0.01 })} />);
      const bars = container.querySelectorAll('.h-full.rounded-full.transition-all');
      const firstBar = bars[0];
      expect(firstBar).toHaveStyle({ width: '2%' });
    });

    it('should reduce opacity for null correlation', () => {
      const { container } = render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: null })} />);
      const bars = container.querySelectorAll('.h-full.rounded-full.transition-all');
      const firstBar = bars[0];
      expect(firstBar).toHaveStyle({ opacity: '0.3' });
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have card styling', () => {
      const { container } = render(<ScoreCorrelationCard stats={createMockStats()} />);
      const card = container.firstChild;
      expect(card).toHaveClass('rounded-2xl', 'backdrop-blur-md');
    });

    it('should have hover effect', () => {
      const { container } = render(<ScoreCorrelationCard stats={createMockStats()} />);
      const card = container.firstChild;
      expect(card).toHaveClass('hover:-translate-y-0.5');
    });

    it('should have ambient glow', () => {
      const { container } = render(<ScoreCorrelationCard stats={createMockStats()} />);
      const glow = container.querySelector('.opacity-15.blur-3xl');
      expect(glow).toBeInTheDocument();
    });

    it('should render icon', () => {
      const { container } = render(<ScoreCorrelationCard stats={createMockStats()} />);
      const icon = container.querySelector('svg.w-5.h-5');
      expect(icon).toBeInTheDocument();
    });
  });

  // ============================================
  // Description Tests
  // ============================================
  describe('descriptions', () => {
    it('should show cosine description', () => {
      render(<ScoreCorrelationCard stats={createMockStats()} />);
      expect(screen.getByText('Correlation between semantic similarity and positive feedback')).toBeInTheDocument();
    });

    it('should show rerank description', () => {
      render(<ScoreCorrelationCard stats={createMockStats()} />);
      expect(screen.getByText('Correlation between reranking relevance and positive feedback')).toBeInTheDocument();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle zero average scores', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ avgCosineScore: 0, avgRerankScore: 0 })} />);
      // Both cards show "Avg: 0.00", check at least one exists
      const avgLabels = screen.getAllByText('Avg: 0.00');
      expect(avgLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle perfect correlation', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: 1.0 })} />);
      expect(screen.getByText('1.000')).toBeInTheDocument();
    });

    it('should handle negative correlation', () => {
      render(<ScoreCorrelationCard stats={createMockStats({ cosineScoreCorrelation: -0.5 })} />);
      expect(screen.getByText('-0.500')).toBeInTheDocument();
    });
  });
});
