/**
 * QueryLogsSection Component Tests
 * Unit tests for the QueryLogsSection component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryLogsSection } from '../QueryLogsSection';
import type { RagQueryLog } from '../../../../types/rag';

// Mock QueryLogsTable
vi.mock('../QueryLogsTable', () => ({
  QueryLogsTable: ({
    logs,
    totalCount,
    page,
    pageSize,
    totalPages,
    onPageChange: _onPageChange,
    isLoading,
    feedbackOnly,
    setFeedbackOnly: _setFeedbackOnly,
  }: {
    logs: RagQueryLog[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    isLoading: boolean;
    feedbackOnly: boolean;
    setFeedbackOnly: (value: boolean) => void;
  }) => (
    <div data-testid="query-logs-table">
      <span data-testid="logs-count">{logs.length} logs</span>
      <span data-testid="total-count">{totalCount} total</span>
      <span data-testid="page">{page}</span>
      <span data-testid="page-size">{pageSize}</span>
      <span data-testid="total-pages">{totalPages}</span>
      <span data-testid="is-loading">{isLoading ? 'loading' : 'not loading'}</span>
      <span data-testid="feedback-only">{feedbackOnly ? 'true' : 'false'}</span>
    </div>
  ),
}));

// Helper to create mock log
function createMockLog(overrides: Partial<RagQueryLog> = {}): RagQueryLog {
  return {
    id: 'log-1',
    query: 'Test query',
    createdAt: '2024-01-15T12:00:00Z',
    totalTimeMs: 250,
    queryEmbeddingTimeMs: 50,
    vectorSearchTimeMs: 100,
    rerankTimeMs: 100,
    initialCount: 10,
    finalCount: 5,
    topCosineScore: 0.85,
    topRerankScore: 0.90,
    hybridSearchEnabled: true,
    hyDEEnabled: false,
    multiQueryEnabled: false,
    rerankingEnabled: true,
    userFeedback: null,
    feedbackCategory: null,
    feedbackComment: null,
    topicLabel: null,
    ...overrides,
  };
}

describe('QueryLogsSection', () => {
  const mockSetFeedbackOnly = vi.fn();
  const mockSetPage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render QueryLogsTable component', () => {
      render(
        <QueryLogsSection
          logsResponse={{ logs: [createMockLog()], totalCount: 1, totalPages: 1 }}
          logsLoading={false}
          page={1}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('query-logs-table')).toBeInTheDocument();
    });

    it('should pass logs to QueryLogsTable', () => {
      render(
        <QueryLogsSection
          logsResponse={{ logs: [createMockLog(), createMockLog()], totalCount: 2, totalPages: 1 }}
          logsLoading={false}
          page={1}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('logs-count')).toHaveTextContent('2 logs');
    });

    it('should pass empty array when logsResponse is undefined', () => {
      render(
        <QueryLogsSection
          logsResponse={undefined}
          logsLoading={false}
          page={1}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('logs-count')).toHaveTextContent('0 logs');
    });
  });

  // ============================================
  // Props Passing Tests
  // ============================================
  describe('props passing', () => {
    it('should pass totalCount from logsResponse', () => {
      render(
        <QueryLogsSection
          logsResponse={{ logs: [], totalCount: 100, totalPages: 10 }}
          logsLoading={false}
          page={1}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('total-count')).toHaveTextContent('100 total');
    });

    it('should pass 0 totalCount when logsResponse is undefined', () => {
      render(
        <QueryLogsSection
          logsResponse={undefined}
          logsLoading={false}
          page={1}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('total-count')).toHaveTextContent('0 total');
    });

    it('should pass page prop', () => {
      render(
        <QueryLogsSection
          logsResponse={{ logs: [], totalCount: 0, totalPages: 1 }}
          logsLoading={false}
          page={5}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('page')).toHaveTextContent('5');
    });

    it('should pass pageSize prop', () => {
      render(
        <QueryLogsSection
          logsResponse={{ logs: [], totalCount: 0, totalPages: 1 }}
          logsLoading={false}
          page={1}
          pageSize={25}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('page-size')).toHaveTextContent('25');
    });

    it('should pass totalPages from logsResponse', () => {
      render(
        <QueryLogsSection
          logsResponse={{ logs: [], totalCount: 0, totalPages: 15 }}
          logsLoading={false}
          page={1}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('total-pages')).toHaveTextContent('15');
    });

    it('should pass 1 totalPages when logsResponse is undefined', () => {
      render(
        <QueryLogsSection
          logsResponse={undefined}
          logsLoading={false}
          page={1}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('total-pages')).toHaveTextContent('1');
    });

    it('should pass loading state', () => {
      render(
        <QueryLogsSection
          logsResponse={{ logs: [], totalCount: 0, totalPages: 1 }}
          logsLoading={true}
          page={1}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('is-loading')).toHaveTextContent('loading');
    });

    it('should pass feedbackOnly prop', () => {
      render(
        <QueryLogsSection
          logsResponse={{ logs: [], totalCount: 0, totalPages: 1 }}
          logsLoading={false}
          page={1}
          pageSize={10}
          feedbackOnly={true}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      expect(screen.getByTestId('feedback-only')).toHaveTextContent('true');
    });
  });

  // ============================================
  // Layout Tests
  // ============================================
  describe('layout', () => {
    it('should have flex column layout', () => {
      const { container } = render(
        <QueryLogsSection
          logsResponse={{ logs: [], totalCount: 0, totalPages: 1 }}
          logsLoading={false}
          page={1}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'flex-col');
    });

    it('should have min-h-0 for proper scrolling', () => {
      const { container } = render(
        <QueryLogsSection
          logsResponse={{ logs: [], totalCount: 0, totalPages: 1 }}
          logsLoading={false}
          page={1}
          pageSize={10}
          feedbackOnly={false}
          setFeedbackOnly={mockSetFeedbackOnly}
          setPage={mockSetPage}
        />
      );
      const innerWrapper = container.querySelector('.min-h-0');
      expect(innerWrapper).toBeInTheDocument();
    });
  });
});
