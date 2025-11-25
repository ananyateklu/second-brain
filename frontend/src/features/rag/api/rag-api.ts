import { apiClient } from '../../../lib/api-client';
import { DEFAULT_USER_ID } from '../../../lib/constants';
import { IndexingJobResponse, IndexStatsResponse } from '../types';

export const ragApi = {
  startIndexing: async (userId: string = DEFAULT_USER_ID, embeddingProvider?: string, vectorStoreProvider?: string): Promise<IndexingJobResponse> => {
    const params = new URLSearchParams({ userId });
    if (embeddingProvider) {
      params.append('embeddingProvider', embeddingProvider);
    }
    if (vectorStoreProvider) {
      params.append('vectorStoreProvider', vectorStoreProvider);
    }
    return apiClient.post<IndexingJobResponse>(`/indexing/start?${params}`);
  },

  getIndexingStatus: async (jobId: string): Promise<IndexingJobResponse> => {
    return apiClient.get<IndexingJobResponse>(`/indexing/status/${jobId}`);
  },

  getIndexStats: async (userId: string = DEFAULT_USER_ID): Promise<IndexStatsResponse> => {
    const params = new URLSearchParams({ userId });
    return apiClient.get<IndexStatsResponse>(`/indexing/stats?${params}`);
  },

  reindexNote: async (noteId: string): Promise<void> => {
    return apiClient.post<void>(`/indexing/reindex/${noteId}`);
  },

  deleteIndexedNotes: async (vectorStoreProvider: string): Promise<void> => {
    const params = new URLSearchParams({ vectorStoreProvider });
    return apiClient.delete<void>(`/indexing/notes?${params}`);
  },
};
