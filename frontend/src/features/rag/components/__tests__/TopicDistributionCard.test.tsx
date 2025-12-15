/**
 * TopicDistributionCard Component Tests
 * Unit tests for the TopicDistributionCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { TopicDistributionCard } from '../TopicDistributionCard';
import type { TopicAnalyticsResponse, TopicStats } from '../../../../types/rag';

// Mock the service
vi.mock('../../../../services/rag.service', () => ({
  ragService: {
    clusterQueries: vi.fn().mockResolvedValue({ message: 'Clustering complete' }),
  },
}));

// Helper to create mock topic
function createMockTopic(overrides: Partial<TopicStats> = {}): TopicStats {
  return {
    clusterId: 1,
    label: 'Development',
    queryCount: 25,
    positiveFeedback: 20,
    negativeFeedback: 5,
    positiveFeedbackRate: 0.8,
    avgCosineScore: 0.75,
    avgRerankScore: 0.82,
    sampleQueries: ['How to debug?', 'What is TypeScript?'],
    ...overrides,
  };
}

// Helper to create mock topic data
function createMockTopicData(overrides: Partial<TopicAnalyticsResponse> = {}): TopicAnalyticsResponse {
  return {
    topics: [createMockTopic()],
    totalClustered: 100,
    totalUnclustered: 20,
    lastClusteredAt: '2024-01-15T12:00:00Z',
    ...overrides,
  };
}

// Create a wrapper component with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('TopicDistributionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render "Topic Distribution" title', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData()} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Topic Distribution')).toBeInTheDocument();
    });

    it('should render cluster count selector', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData()} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render "Run Clustering" button', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData()} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Run Clustering')).toBeInTheDocument();
    });

    it('should have topic count options in selector', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData()} isLoading={false} />,
        { wrapper: createWrapper() }
      );

      const select = screen.getByRole('combobox');
      expect(select).toContainElement(screen.getByText('3 topics'));
      expect(select).toContainElement(screen.getByText('5 topics'));
      expect(select).toContainElement(screen.getByText('7 topics'));
      expect(select).toContainElement(screen.getByText('10 topics'));
    });
  });

  // ============================================
  // Loading State Tests
  // ============================================
  describe('loading state', () => {
    it('should show spinner when loading', () => {
      const { container } = render(
        <TopicDistributionCard topicData={undefined} isLoading={true} />,
        { wrapper: createWrapper() }
      );
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ============================================
  // Empty State Tests
  // ============================================
  describe('empty state', () => {
    it('should show "No topics yet" when no topics', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({ topics: [] })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('No topics yet')).toBeInTheDocument();
    });

    it('should show help text in empty state', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({ topics: [] })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Run clustering to group your queries into topics')).toBeInTheDocument();
    });

    it('should show empty state when topicData is undefined', () => {
      render(
        <TopicDistributionCard topicData={undefined} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('No topics yet')).toBeInTheDocument();
    });
  });

  // ============================================
  // Topics Display Tests
  // ============================================
  describe('topics display', () => {
    it('should display topic label', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({
          topics: [createMockTopic({ label: 'My Topic' })]
        })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      // Topic label may appear multiple times (in card and insights)
      const topicLabels = screen.getAllByText('My Topic');
      expect(topicLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should display query count for topic', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({
          topics: [createMockTopic({ queryCount: 42 })]
        })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('42 queries')).toBeInTheDocument();
    });

    it('should display feedback rate for topic', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({
          topics: [createMockTopic({
            positiveFeedback: 8,
            negativeFeedback: 2,
            positiveFeedbackRate: 0.8
          })]
        })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('80% positive')).toBeInTheDocument();
    });

    it('should display sample query', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({
          topics: [createMockTopic({
            sampleQueries: ['Sample question here']
          })]
        })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('"Sample question here"')).toBeInTheDocument();
    });

    it('should display multiple topics', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({
          topics: [
            createMockTopic({ clusterId: 1, label: 'Topic A' }),
            createMockTopic({ clusterId: 2, label: 'Topic B' }),
            createMockTopic({ clusterId: 3, label: 'Topic C' }),
          ]
        })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      // Topics may appear multiple times (in list and insights)
      const topicAs = screen.getAllByText('Topic A');
      const topicBs = screen.getAllByText('Topic B');
      expect(topicAs.length).toBeGreaterThanOrEqual(1);
      expect(topicBs.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Topic C')).toBeInTheDocument();
    });
  });

  // ============================================
  // Summary Stats Tests
  // ============================================
  describe('summary stats', () => {
    it('should display total clustered count', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({ totalClustered: 150 })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Clustered')).toBeInTheDocument();
    });

    it('should display unclustered count', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({ totalUnclustered: 30 })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('Unclustered')).toBeInTheDocument();
    });
  });

  // ============================================
  // Insights Section Tests
  // ============================================
  describe('insights', () => {
    it('should show insights section', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData()} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Insights')).toBeInTheDocument();
    });

    it('should show most queried topic insight', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({
          topics: [createMockTopic({ label: 'Popular Topic', queryCount: 50 })]
        })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText(/Most queried:/)).toBeInTheDocument();
      // Topic label may appear multiple times
      const topicLabels = screen.getAllByText(/Popular Topic/);
      expect(topicLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should show low satisfaction warning for underperforming topic', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({
          topics: [createMockTopic({
            label: 'Problem Topic',
            positiveFeedback: 2,
            negativeFeedback: 8,
            positiveFeedbackRate: 0.2
          })]
        })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      // The warning text is split across elements
      expect(screen.getByText(/has low satisfaction/)).toBeInTheDocument();
    });
  });

  // ============================================
  // Clustering Action Tests
  // ============================================
  describe('clustering action', () => {
    it('should change cluster count on select change', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData()} isLoading={false} />,
        { wrapper: createWrapper() }
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '7' } });

      expect(select).toHaveValue('7');
    });

    it('should show "Clustering..." when mutation is pending', async () => {
      const { ragService } = await import('../../../../services/rag.service');
      vi.mocked(ragService.clusterQueries).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ message: 'done' }), 1000))
      );

      render(
        <TopicDistributionCard topicData={createMockTopicData()} isLoading={false} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByText('Run Clustering'));

      await waitFor(() => {
        expect(screen.getByText('Clustering...')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have card styling', () => {
      const { container } = render(
        <TopicDistributionCard topicData={createMockTopicData()} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      const card = container.firstChild;
      expect(card).toHaveClass('rounded-2xl', 'backdrop-blur-md');
    });

    it('should have hover effect', () => {
      const { container } = render(
        <TopicDistributionCard topicData={createMockTopicData()} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      const card = container.firstChild;
      expect(card).toHaveClass('hover:-translate-y-0.5');
    });

    it('should render progress bars for topics', () => {
      const { container } = render(
        <TopicDistributionCard topicData={createMockTopicData({
          topics: [createMockTopic(), createMockTopic({ clusterId: 2 })]
        })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      const bars = container.querySelectorAll('.h-2.rounded-full.overflow-hidden');
      expect(bars.length).toBe(2);
    });

    it('should render topic color indicators', () => {
      const { container } = render(
        <TopicDistributionCard topicData={createMockTopicData()} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      const colorDots = container.querySelectorAll('.w-2\\.5.h-2\\.5.rounded-full');
      expect(colorDots.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle topic with no feedback', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({
          topics: [createMockTopic({
            positiveFeedback: 0,
            negativeFeedback: 0,
          })]
        })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      // Should not show feedback rate badge
      expect(screen.queryByText(/positive$/)).not.toBeInTheDocument();
    });

    it('should handle topic with no sample queries', () => {
      render(
        <TopicDistributionCard topicData={createMockTopicData({
          topics: [createMockTopic({ sampleQueries: [] })]
        })} isLoading={false} />,
        { wrapper: createWrapper() }
      );
      // Should render without crashing - topic label may appear multiple times
      const labels = screen.getAllByText('Development');
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });
  });
});
