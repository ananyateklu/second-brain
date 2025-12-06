/**
 * RAG Analytics Slice
 * Manages RAG Analytics page state (active tab, time range)
 */

import type { SliceCreator } from '../types';

export const createRagAnalyticsSlice: SliceCreator<{
  activeTab: 'performance' | 'topics' | 'logs';
  selectedTimeRange: number | null;
  setActiveTab: (tab: 'performance' | 'topics' | 'logs') => void;
  setSelectedTimeRange: (days: number | null) => void;
}> = (set) => ({
  activeTab: 'performance',
  selectedTimeRange: 30,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedTimeRange: (days) => set({ selectedTimeRange: days }),
});

