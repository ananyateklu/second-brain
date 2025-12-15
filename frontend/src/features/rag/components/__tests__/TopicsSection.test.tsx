/**
 * TopicsSection Component Tests
 * Unit tests for the TopicsSection component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { TopicsSection } from '../TopicsSection';
import type { TopicAnalyticsResponse, TopicStats } from '../../../../types/rag';

// Mock TopicDistributionCard
vi.mock('../TopicDistributionCard', () => ({
  TopicDistributionCard: ({
    topicData,
    isLoading,
  }: {
    topicData: TopicAnalyticsResponse | undefined;
    isLoading: boolean;
  }) => (
    <div data-testid="topic-distribution-card">
      <span data-testid="is-loading">{isLoading ? 'loading' : 'not loading'}</span>
      <span data-testid="topic-count">{topicData?.topics.length ?? 0} topics</span>
    </div>
  ),
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
    sampleQueries: ['How to debug?'],
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
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('TopicsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render TopicDistributionCard', () => {
      render(
        <TopicsSection topicData={createMockTopicData()} topicsLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByTestId('topic-distribution-card')).toBeInTheDocument();
    });

    it('should pass topicData to TopicDistributionCard', () => {
      render(
        <TopicsSection topicData={createMockTopicData({
          topics: [createMockTopic(), createMockTopic({ clusterId: 2 }), createMockTopic({ clusterId: 3 })]
        })} topicsLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByTestId('topic-count')).toHaveTextContent('3 topics');
    });

    it('should pass loading state to TopicDistributionCard', () => {
      render(
        <TopicsSection topicData={undefined} topicsLoading={true} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByTestId('is-loading')).toHaveTextContent('loading');
    });

    it('should pass not loading state when not loading', () => {
      render(
        <TopicsSection topicData={createMockTopicData()} topicsLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByTestId('is-loading')).toHaveTextContent('not loading');
    });
  });

  // ============================================
  // Props Tests
  // ============================================
  describe('props', () => {
    it('should handle undefined topicData', () => {
      render(
        <TopicsSection topicData={undefined} topicsLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByTestId('topic-count')).toHaveTextContent('0 topics');
    });

    it('should handle empty topics array', () => {
      render(
        <TopicsSection topicData={createMockTopicData({ topics: [] })} topicsLoading={false} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByTestId('topic-count')).toHaveTextContent('0 topics');
    });
  });

  // ============================================
  // Layout Tests
  // ============================================
  describe('layout', () => {
    it('should have min-h-full for full height layout', () => {
      const { container } = render(
        <TopicsSection topicData={createMockTopicData()} topicsLoading={false} />,
        { wrapper: createWrapper() }
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-full');
    });

    it('should have overflow-visible for proper rendering', () => {
      const { container } = render(
        <TopicsSection topicData={createMockTopicData()} topicsLoading={false} />,
        { wrapper: createWrapper() }
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('overflow-visible');
    });
  });
});
