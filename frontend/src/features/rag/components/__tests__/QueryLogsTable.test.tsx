/**
 * QueryLogsTable Component Tests
 * Unit tests for the QueryLogsTable component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryLogsTable } from '../QueryLogsTable';
import type { RagQueryLog } from '../../../../types/rag';

// Helper to create mock log
function createMockLog(overrides: Partial<RagQueryLog> = {}): RagQueryLog {
  return {
    id: 'log-1',
    query: 'Test query for searching notes',
    conversationId: null,
    createdAt: '2024-01-15T14:30:00Z',
    totalTimeMs: 250,
    queryEmbeddingTimeMs: 50,
    vectorSearchTimeMs: 100,
    rerankTimeMs: 100,
    retrievedCount: 10,
    finalCount: 5,
    topCosineScore: 0.85,
    avgCosineScore: 0.75,
    topRerankScore: 0.90,
    avgRerankScore: 0.80,
    hybridSearchEnabled: true,
    hyDEEnabled: false,
    multiQueryEnabled: false,
    rerankingEnabled: true,
    userFeedback: null,
    feedbackCategory: null,
    feedbackComment: null,
    topicCluster: null,
    topicLabel: null,
    ...overrides,
  };
}

describe('QueryLogsTable', () => {
  const mockOnPageChange = vi.fn();
  const mockSetFeedbackOnly = vi.fn();

  const defaultProps = {
    logs: [] as RagQueryLog[],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    onPageChange: mockOnPageChange,
    isLoading: false,
    feedbackOnly: false,
    setFeedbackOnly: mockSetFeedbackOnly,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render "Query Logs" title', () => {
      render(<QueryLogsTable {...defaultProps} />);
      expect(screen.getByText('Query Logs')).toBeInTheDocument();
    });

    it('should render total queries count', () => {
      render(<QueryLogsTable {...defaultProps} totalCount={42} />);
      expect(screen.getByText('42 total queries')).toBeInTheDocument();
    });

    it('should render table headers', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog()]} />);
      expect(screen.getByText('Query')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Results')).toBeInTheDocument();
      expect(screen.getByText('Top Score')).toBeInTheDocument();
      expect(screen.getByText('Feedback')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('should render feedback filter checkbox', () => {
      render(<QueryLogsTable {...defaultProps} />);
      expect(screen.getByText('Show only queries with feedback')).toBeInTheDocument();
    });
  });

  // ============================================
  // Empty State Tests
  // ============================================
  describe('empty state', () => {
    it('should show empty state message when no logs', () => {
      render(<QueryLogsTable {...defaultProps} logs={[]} />);
      expect(screen.getByText('No query logs found')).toBeInTheDocument();
    });

    it('should show help text in empty state', () => {
      render(<QueryLogsTable {...defaultProps} logs={[]} />);
      expect(screen.getByText('Queries will appear here once RAG is used')).toBeInTheDocument();
    });
  });

  // ============================================
  // Loading State Tests
  // ============================================
  describe('loading state', () => {
    it('should show loading message when loading', () => {
      render(<QueryLogsTable {...defaultProps} isLoading={true} />);
      expect(screen.getByText('Loading query logs...')).toBeInTheDocument();
    });

    it('should show spinner when loading', () => {
      const { container } = render(<QueryLogsTable {...defaultProps} isLoading={true} />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ============================================
  // Log Display Tests
  // ============================================
  describe('log display', () => {
    it('should display query text', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({ query: 'Find my notes' })]} />);
      expect(screen.getByText('Find my notes')).toBeInTheDocument();
    });

    it('should truncate long queries', () => {
      const longQuery = 'A'.repeat(100);
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({ query: longQuery })]} />);
      expect(screen.getByText('A'.repeat(60) + '...')).toBeInTheDocument();
    });

    it('should display time in milliseconds', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({ totalTimeMs: 250 })]} />);
      expect(screen.getByText('250ms')).toBeInTheDocument();
    });

    it('should display time in seconds for >1s', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({ totalTimeMs: 1500 })]} />);
      expect(screen.getByText('1.5s')).toBeInTheDocument();
    });

    it('should display results count', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({ finalCount: 7 })]} />);
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('should display top cosine score', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({ topCosineScore: 0.85 })]} />);
      expect(screen.getByText('0.850')).toBeInTheDocument();
    });

    it('should display topic label when present', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({ topicLabel: 'Development' })]} />);
      expect(screen.getByText('Development')).toBeInTheDocument();
    });
  });

  // ============================================
  // Feedback Badge Tests
  // ============================================
  describe('feedback badge', () => {
    it('should show "No feedback" when no feedback', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({ userFeedback: null })]} />);
      expect(screen.getByText('No feedback')).toBeInTheDocument();
    });

    it('should show "Helpful" for positive feedback', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({ userFeedback: 'thumbs_up' })]} />);
      expect(screen.getByText(/Helpful/)).toBeInTheDocument();
    });

    it('should show "Not helpful" for negative feedback', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({ userFeedback: 'thumbs_down' })]} />);
      expect(screen.getByText(/Not helpful/)).toBeInTheDocument();
    });
  });

  // ============================================
  // Expand/Collapse Tests
  // ============================================
  describe('expand/collapse', () => {
    it('should expand row when clicked', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog()]} />);

      const row = screen.getByText('Test query for searching notes').closest('tr');
      expect(row).not.toBeNull();
      fireEvent.click(row as HTMLElement);

      expect(screen.getByText('Full Query')).toBeInTheDocument();
    });

    it('should collapse row when clicked again', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog()]} />);

      const row = screen.getByText('Test query for searching notes').closest('tr');
      expect(row).not.toBeNull();
      fireEvent.click(row as HTMLElement);
      fireEvent.click(row as HTMLElement);

      expect(screen.queryByText('Full Query')).not.toBeInTheDocument();
    });

    it('should show timing breakdown in expanded view', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog()]} />);

      const row = screen.getByText('Test query for searching notes').closest('tr');
      expect(row).not.toBeNull();
      fireEvent.click(row as HTMLElement);

      expect(screen.getByText('Timing Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Embedding:')).toBeInTheDocument();
      expect(screen.getByText('Search:')).toBeInTheDocument();
      expect(screen.getByText('Rerank:')).toBeInTheDocument();
    });

    it('should show features enabled in expanded view', () => {
      render(<QueryLogsTable {...defaultProps} logs={[createMockLog({
        hybridSearchEnabled: true,
        rerankingEnabled: true,
      })]} />);

      const row = screen.getByText('Test query for searching notes').closest('tr');
      expect(row).not.toBeNull();
      fireEvent.click(row as HTMLElement);

      expect(screen.getByText('Features Enabled')).toBeInTheDocument();
      expect(screen.getByText('Hybrid')).toBeInTheDocument();
      expect(screen.getByText('Reranking')).toBeInTheDocument();
    });
  });

  // ============================================
  // Feedback Filter Tests
  // ============================================
  describe('feedback filter', () => {
    it('should call setFeedbackOnly when checkbox clicked', () => {
      render(<QueryLogsTable {...defaultProps} feedbackOnly={false} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockSetFeedbackOnly).toHaveBeenCalledWith(true);
    });

    it('should reset to page 1 when filter changes', () => {
      render(<QueryLogsTable {...defaultProps} feedbackOnly={false} page={5} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });
  });

  // ============================================
  // Pagination Tests
  // ============================================
  describe('pagination', () => {
    it('should not show pagination when only 1 page', () => {
      render(<QueryLogsTable {...defaultProps} totalPages={1} />);
      expect(screen.queryByText('← Previous')).not.toBeInTheDocument();
    });

    it('should show pagination when multiple pages', () => {
      render(<QueryLogsTable {...defaultProps} totalPages={5} totalCount={50} logs={[createMockLog()]} />);
      expect(screen.getByText('← Previous')).toBeInTheDocument();
      expect(screen.getByText('Next →')).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      render(<QueryLogsTable {...defaultProps} page={1} totalPages={5} totalCount={50} logs={[createMockLog()]} />);
      const prevButton = screen.getByText('← Previous');
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      render(<QueryLogsTable {...defaultProps} page={5} totalPages={5} totalCount={50} logs={[createMockLog()]} />);
      const nextButton = screen.getByText('Next →');
      expect(nextButton).toBeDisabled();
    });

    it('should call onPageChange when previous clicked', () => {
      render(<QueryLogsTable {...defaultProps} page={3} totalPages={5} totalCount={50} logs={[createMockLog()]} />);
      fireEvent.click(screen.getByText('← Previous'));
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange when next clicked', () => {
      render(<QueryLogsTable {...defaultProps} page={3} totalPages={5} totalCount={50} logs={[createMockLog()]} />);
      fireEvent.click(screen.getByText('Next →'));
      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it('should show page numbers', () => {
      render(<QueryLogsTable {...defaultProps} page={1} totalPages={5} totalCount={50} logs={[createMockLog()]} />);
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    });

    it('should highlight current page', () => {
      render(<QueryLogsTable {...defaultProps} page={2} totalPages={5} totalCount={50} logs={[createMockLog()]} />);
      const page2Button = screen.getByRole('button', { name: '2' });
      expect(page2Button).toHaveStyle({ backgroundColor: 'var(--color-brand-500)' });
    });

    it('should show "Showing X to Y of Z" text', () => {
      render(<QueryLogsTable {...defaultProps} page={2} pageSize={10} totalCount={25} totalPages={3} logs={[createMockLog()]} />);
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
      expect(screen.getByText('11')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have glassmorphism styling', () => {
      const { container } = render(<QueryLogsTable {...defaultProps} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('backdrop-blur-md', 'rounded-2xl');
    });

    it('should have ambient glow element', () => {
      const { container } = render(<QueryLogsTable {...defaultProps} />);
      const glow = container.querySelector('.opacity-10.blur-3xl');
      expect(glow).toBeInTheDocument();
    });
  });
});
