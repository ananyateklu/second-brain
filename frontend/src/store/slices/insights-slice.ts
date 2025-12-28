/**
 * Insights Slice
 * Manages Insights page state (main tab, RAG sub-tab, time range)
 */

import type { SliceCreator, InsightsSlice } from '../types';

export const createInsightsSlice: SliceCreator<InsightsSlice> = (set) => ({
  activeInsightsTab: 'overview',
  ragSubTab: 'performance',
  insightsTimeRange: 30,

  setActiveInsightsTab: (tab) => set({ activeInsightsTab: tab }),
  setRagSubTab: (tab) => set({ ragSubTab: tab }),
  setInsightsTimeRange: (days) => set({ insightsTimeRange: days }),
});
