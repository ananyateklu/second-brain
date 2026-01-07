/**
 * Focus Service
 * API service for focus/productivity dashboard operations
 */

import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS } from '../lib/constants';
import type {
  FocusItem,
  TodaysPlanResponse,
  BacklogResponse,
  CompletedItemsResponse,
  CreateFocusItemRequest,
  UpdateFocusItemRequest,
  DeferFocusItemRequest,
  ReorderFocusItemsRequest,
  CreateFocusFromNoteRequest,
  FocusSuggestionsResponse,
  ProgressSummaryResponse,
  SummaryPeriod,
  PersistedFocusSuggestion,
  GenerateSuggestionsResponse,
} from '../features/focus/types';

/**
 * Focus service for managing focus items and productivity features
 */
export const focusService = {
  /**
   * Get today's plan (current focus + scheduled items)
   */
  getTodaysPlan: async (date?: string): Promise<TodaysPlanResponse> => {
    const params = date ? `?date=${date}` : '';
    return apiClient.get<TodaysPlanResponse>(
      `${API_ENDPOINTS.FOCUS.BASE}${params}`
    );
  },

  /**
   * Get backlog items (not scheduled, not completed)
   */
  getBacklog: async (priority?: number): Promise<BacklogResponse> => {
    const params = priority ? `?priority=${priority}` : '';
    return apiClient.get<BacklogResponse>(
      `${API_ENDPOINTS.FOCUS.BACKLOG}${params}`
    );
  },

  /**
   * Get a specific focus item by ID
   */
  getById: async (id: string): Promise<FocusItem> => {
    return apiClient.get<FocusItem>(
      API_ENDPOINTS.FOCUS.BY_ID(id)
    );
  },

  /**
   * Get completed items within a date range
   */
  getCompleted: async (startDate: string, endDate: string): Promise<CompletedItemsResponse> => {
    return apiClient.get<CompletedItemsResponse>(
      `${API_ENDPOINTS.FOCUS.COMPLETED}?startDate=${startDate}&endDate=${endDate}`
    );
  },

  /**
   * Create a new focus item
   */
  create: async (request: CreateFocusItemRequest): Promise<FocusItem> => {
    return apiClient.post<FocusItem>(
      API_ENDPOINTS.FOCUS.BASE,
      request
    );
  },

  /**
   * Update an existing focus item
   */
  update: async (id: string, request: UpdateFocusItemRequest): Promise<FocusItem> => {
    return apiClient.put<FocusItem>(
      API_ENDPOINTS.FOCUS.BY_ID(id),
      request
    );
  },

  /**
   * Set a focus item as the current focus
   */
  setCurrentFocus: async (id: string): Promise<FocusItem> => {
    return apiClient.post<FocusItem>(
      API_ENDPOINTS.FOCUS.SET_CURRENT(id)
    );
  },

  /**
   * Pause the current focus timer, saving elapsed time to accumulated minutes.
   * The item remains in 'in_progress' status but is no longer the current focus.
   */
  pauseFocusItem: async (id: string): Promise<FocusItem> => {
    return apiClient.post<FocusItem>(
      API_ENDPOINTS.FOCUS.PAUSE(id)
    );
  },

  /**
   * Mark a focus item as completed
   */
  complete: async (id: string, actualMinutes?: number): Promise<FocusItem> => {
    const params = actualMinutes !== undefined ? `?actualMinutes=${actualMinutes}` : '';
    return apiClient.post<FocusItem>(
      `${API_ENDPOINTS.FOCUS.COMPLETE(id)}${params}`
    );
  },

  /**
   * Defer a focus item to another date
   */
  defer: async (id: string, request: DeferFocusItemRequest): Promise<FocusItem> => {
    return apiClient.post<FocusItem>(
      API_ENDPOINTS.FOCUS.DEFER(id),
      request
    );
  },

  /**
   * Reorder focus items
   */
  reorder: async (request: ReorderFocusItemsRequest): Promise<void> => {
    await apiClient.put(API_ENDPOINTS.FOCUS.REORDER, request);
  },

  /**
   * Delete a focus item
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.FOCUS.BY_ID(id));
  },

  /**
   * Create a focus item from an existing note
   */
  createFromNote: async (noteId: string, request?: CreateFocusFromNoteRequest): Promise<FocusItem> => {
    return apiClient.post<FocusItem>(
      API_ENDPOINTS.FOCUS.FROM_NOTE(noteId),
      request ?? {}
    );
  },

  // ============================================
  // AI-Powered Features
  // ============================================

  /**
   * Get AI-generated focus suggestions based on notes and context
   */
  getAISuggestions: async (currentFocusTitle?: string): Promise<FocusSuggestionsResponse> => {
    const params = currentFocusTitle
      ? `?currentFocusTitle=${encodeURIComponent(currentFocusTitle)}`
      : '';
    return apiClient.post<FocusSuggestionsResponse>(
      `${API_ENDPOINTS.FOCUS.AI_SUGGEST}${params}`
    );
  },

  /**
   * Get AI-generated progress summary for a time period
   * Results are cached in the database to reduce AI API costs.
   * @param period - Time period: 'today', 'week', or 'month'
   * @param date - Optional date (YYYY-MM-DD format, defaults to today)
   * @param forceRefresh - Force regeneration even if cached
   */
  getProgressSummary: async (
    period: SummaryPeriod = 'today',
    date?: string,
    forceRefresh = false
  ): Promise<ProgressSummaryResponse> => {
    const params = new URLSearchParams({ period });
    if (date) params.set('date', date);
    if (forceRefresh) params.set('forceRefresh', 'true');
    return apiClient.get<ProgressSummaryResponse>(
      `${API_ENDPOINTS.FOCUS.AI_SUMMARY}?${params.toString()}`
    );
  },

  // ============================================
  // Persisted AI Suggestions
  // ============================================

  /**
   * Get persisted AI suggestions from the database
   */
  getSuggestions: async (includeAccepted = false): Promise<PersistedFocusSuggestion[]> => {
    const params = includeAccepted ? '?includeAccepted=true' : '';
    return apiClient.get<PersistedFocusSuggestion[]>(
      `${API_ENDPOINTS.FOCUS.AI_SUGGESTIONS}${params}`
    );
  },

  /**
   * Generate new AI suggestions, deduplicate against existing, and persist
   * Uses vector similarity to detect duplicates
   */
  generateSuggestions: async (currentFocusTitle?: string): Promise<GenerateSuggestionsResponse> => {
    return apiClient.post<GenerateSuggestionsResponse>(
      API_ENDPOINTS.FOCUS.AI_SUGGESTIONS_GENERATE,
      { currentFocusTitle }
    );
  },

  /**
   * Delete a persisted suggestion
   */
  deleteSuggestion: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.FOCUS.AI_SUGGESTIONS_BY_ID(id));
  },

  /**
   * Mark a suggestion as accepted (when converted to FocusItem)
   */
  acceptSuggestion: async (suggestionId: string, focusItemId: string): Promise<PersistedFocusSuggestion> => {
    return apiClient.post<PersistedFocusSuggestion>(
      API_ENDPOINTS.FOCUS.AI_SUGGESTIONS_ACCEPT(suggestionId),
      { focusItemId }
    );
  },

  // ============================================
  // Helper functions
  // ============================================

  /**
   * Get today's date as ISO string (YYYY-MM-DD)
   */
  getTodayDateString: (): string => {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Format minutes to a human-readable duration
   */
  formatDuration: (minutes: number | null | undefined): string => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  },

  /**
   * Get priority color class
   */
  getPriorityColor: (priority: number): string => {
    switch (priority) {
      case 1: return 'text-red-500';
      case 2: return 'text-amber-500';
      case 3: return 'text-green-500';
      default: return 'text-gray-500';
    }
  },
};

export default focusService;
