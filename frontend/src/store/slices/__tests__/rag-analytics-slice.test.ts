/**
 * RAG Analytics Slice Tests
 * Unit tests for the RAG Analytics page state slice
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createRagAnalyticsSlice } from '../rag-analytics-slice';

describe('rag-analytics-slice', () => {
  let mockSet: ReturnType<typeof createMockSet>;
  let slice: ReturnType<typeof createRagAnalyticsSlice>;

  // Create a mock set function that captures the state updates
  function createMockSet() {
    const calls: Array<Record<string, unknown>> = [];
    const fn = (update: Record<string, unknown>) => {
      calls.push(update);
    };
    fn.calls = calls;
    return fn;
  }

  beforeEach(() => {
    mockSet = createMockSet();
    // Create slice with mock set, get, and store
    slice = createRagAnalyticsSlice(
      mockSet as unknown as Parameters<typeof createRagAnalyticsSlice>[0],
      () => ({}) as ReturnType<Parameters<typeof createRagAnalyticsSlice>[1]>,
      {} as Parameters<typeof createRagAnalyticsSlice>[2]
    );
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have performance as default active tab', () => {
      expect(slice.activeTab).toBe('performance');
    });

    it('should have 30 as default selected time range', () => {
      expect(slice.selectedTimeRange).toBe(30);
    });
  });

  // ============================================
  // setActiveTab Tests
  // ============================================
  describe('setActiveTab', () => {
    it('should update active tab to performance', () => {
      slice.setActiveTab('performance');
      expect(mockSet.calls[0]).toEqual({ activeTab: 'performance' });
    });

    it('should update active tab to topics', () => {
      slice.setActiveTab('topics');
      expect(mockSet.calls[0]).toEqual({ activeTab: 'topics' });
    });

    it('should update active tab to logs', () => {
      slice.setActiveTab('logs');
      expect(mockSet.calls[0]).toEqual({ activeTab: 'logs' });
    });
  });

  // ============================================
  // setSelectedTimeRange Tests
  // ============================================
  describe('setSelectedTimeRange', () => {
    it('should update time range to 7 days', () => {
      slice.setSelectedTimeRange(7);
      expect(mockSet.calls[0]).toEqual({ selectedTimeRange: 7 });
    });

    it('should update time range to 30 days', () => {
      slice.setSelectedTimeRange(30);
      expect(mockSet.calls[0]).toEqual({ selectedTimeRange: 30 });
    });

    it('should update time range to 90 days', () => {
      slice.setSelectedTimeRange(90);
      expect(mockSet.calls[0]).toEqual({ selectedTimeRange: 90 });
    });

    it('should update time range to null (all time)', () => {
      slice.setSelectedTimeRange(null);
      expect(mockSet.calls[0]).toEqual({ selectedTimeRange: null });
    });
  });
});
