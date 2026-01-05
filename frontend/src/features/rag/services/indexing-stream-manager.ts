/**
 * Global Indexing Stream Manager
 *
 * Manages SSE connections for indexing that persist across page navigation.
 * This is a singleton that lives outside of React component lifecycle.
 */

import { useBoundStore } from '../../../store/bound-store';
import { API_ENDPOINTS, getApiBaseUrl } from '../../../lib/constants';
import type { IndexingJobResponse, VectorStoreProvider } from '../../../types/rag';

// ============================================
// Types
// ============================================

export interface IndexingStartEvent {
  jobId: string;
  vectorStore: string;
  totalNotes: number;
  skippedNotes: number;
  deletedNotes: number;
  embeddingProvider: string;
  embeddingModel: string;
  startedAt: string;
}

export interface IndexingProgressEvent {
  jobId: string;
  processedCount: number;
  totalCount: number;
  embeddingsCreated: number;
  currentNoteTitle: string | null;
  progressPercent: number;
}

export interface IndexingStatsEvent {
  indexedCount: number;
  pendingCount: number;
  totalNotes: number;
  dimensions: number;
  lastIndexedAt: string | null;
  vectorStore: string;
}

export interface IndexingCompleteEvent {
  jobId: string;
  totalProcessed: number;
  embeddingsCreated: number;
  skippedNotes: number;
  deletedNotes: number;
  failedCount: number;
  duration: string;
  finalStats: IndexingStatsEvent;
}

export interface IndexingErrorEvent {
  jobId: string;
  code: string;
  message: string;
}

export interface StreamingProgress {
  processedCount: number;
  totalCount: number;
  embeddingsCreated: number;
  currentNoteTitle: string | null;
  progressPercent: number;
}

export interface StreamingStats {
  indexedCount: number;
  pendingCount: number;
  totalNotes: number;
  dimensions: number;
  lastIndexedAt: string | null;
  totalEmbeddings: number;
}

export interface StartIndexingParams {
  vectorStoreProvider: VectorStoreProvider;
  embeddingProvider: string;
  embeddingModel: string;
  dimensions?: number;
}

interface ActiveStream {
  vectorStore: VectorStoreProvider;
  abortController: AbortController;
  params: StartIndexingParams;
  jobId: string | null;
  progress: StreamingProgress | null;
  stats: StreamingStats | null;
}

type StreamListener = (
  vectorStore: VectorStoreProvider,
  progress: StreamingProgress | null,
  stats: StreamingStats | null,
  finalStats?: IndexingStatsEvent
) => void;

// ============================================
// Global Manager Class
// ============================================

class IndexingStreamManager {
  private activeStreams: Map<VectorStoreProvider, ActiveStream> = new Map();
  private listeners: Set<StreamListener> = new Set();

  /**
   * Start an indexing stream for a vector store
   */
  async startStream(params: StartIndexingParams): Promise<void> {
    // Abort any existing stream for this vector store (don't wait for backend cancel)
    void this.stopStream(params.vectorStoreProvider, false);

    const abortController = new AbortController();
    const stream: ActiveStream = {
      vectorStore: params.vectorStoreProvider,
      abortController,
      params,
      jobId: null,
      progress: null,
      stats: null,
    };

    this.activeStreams.set(params.vectorStoreProvider, stream);

    try {
      const token = useBoundStore.getState().token;
      const authHeaders: Record<string, string> = token
        ? { 'Authorization': `Bearer ${token}` }
        : {};

      const response = await fetch(`${getApiBaseUrl()}${API_ENDPOINTS.INDEXING.STREAM}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          vectorStoreProvider: params.vectorStoreProvider,
          embeddingProvider: params.embeddingProvider,
          embeddingModel: params.embeddingModel,
          dimensions: params.dimensions,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              this.handleEvent(params.vectorStoreProvider, eventType, data, params);
            } catch (e) {
              console.error('Failed to parse SSE event data:', e);
            }
            eventType = '';
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Indexing stream error:', error);
        // Update global slice with error
        const { updateJobStatus } = useBoundStore.getState();
        const syntheticJob: IndexingJobResponse = {
          id: stream.jobId || 'unknown',
          status: 'failed',
          totalNotes: 0,
          processedNotes: 0,
          skippedNotes: 0,
          deletedNotes: 0,
          totalChunks: 0,
          processedChunks: 0,
          errors: [(error as Error).message],
          embeddingProvider: params.embeddingProvider,
          embeddingModel: params.embeddingModel,
          startedAt: null,
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          progressPercentage: 0,
        };
        updateJobStatus(syntheticJob, params.vectorStoreProvider);
      }
    } finally {
      this.activeStreams.delete(params.vectorStoreProvider);
      this.notifyListeners(params.vectorStoreProvider, null, null);
    }
  }

  /**
   * Stop an active stream and optionally cancel the backend job
   * @param vectorStore The vector store to stop
   * @param cancelBackendJob Whether to also cancel the job on the backend (default: true)
   */
  async stopStream(vectorStore: VectorStoreProvider, cancelBackendJob = true): Promise<void> {
    const stream = this.activeStreams.get(vectorStore);
    if (stream) {
      // Abort the fetch request
      stream.abortController.abort();

      // Cancel the backend job if we have a jobId
      if (cancelBackendJob && stream.jobId) {
        try {
          const token = useBoundStore.getState().token;
          const authHeaders: Record<string, string> = token
            ? { 'Authorization': `Bearer ${token}` }
            : {};

          await fetch(`${getApiBaseUrl()}${API_ENDPOINTS.INDEXING.CANCEL(stream.jobId)}`, {
            method: 'POST',
            headers: authHeaders,
          });
        } catch (error) {
          console.error('Failed to cancel backend indexing job:', error);
        }
      }

      // Update global slice with cancelled status
      if (stream.jobId) {
        const { updateJobStatus } = useBoundStore.getState();
        const syntheticJob: IndexingJobResponse = {
          id: stream.jobId,
          status: 'cancelled',
          totalNotes: stream.progress?.totalCount ?? 0,
          processedNotes: stream.progress?.processedCount ?? 0,
          skippedNotes: 0,
          deletedNotes: 0,
          totalChunks: stream.progress?.embeddingsCreated ?? 0,
          processedChunks: stream.progress?.embeddingsCreated ?? 0,
          errors: [],
          embeddingProvider: stream.params.embeddingProvider,
          embeddingModel: stream.params.embeddingModel,
          startedAt: null,
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          progressPercentage: stream.progress?.progressPercent ?? 0,
        };
        updateJobStatus(syntheticJob, vectorStore);
      }

      this.activeStreams.delete(vectorStore);
      this.notifyListeners(vectorStore, null, null);
    }
  }

  /**
   * Get the job ID for an active stream
   */
  getJobId(vectorStore: VectorStoreProvider): string | null {
    return this.activeStreams.get(vectorStore)?.jobId ?? null;
  }

  /**
   * Check if a stream is active for a vector store
   */
  isStreaming(vectorStore: VectorStoreProvider): boolean {
    return this.activeStreams.has(vectorStore);
  }

  /**
   * Get current progress for a vector store
   */
  getProgress(vectorStore: VectorStoreProvider): StreamingProgress | null {
    return this.activeStreams.get(vectorStore)?.progress ?? null;
  }

  /**
   * Get current stats for a vector store
   */
  getStats(vectorStore: VectorStoreProvider): StreamingStats | null {
    return this.activeStreams.get(vectorStore)?.stats ?? null;
  }

  /**
   * Subscribe to stream updates
   */
  subscribe(listener: StreamListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(
    vectorStore: VectorStoreProvider,
    progress: StreamingProgress | null,
    stats: StreamingStats | null,
    finalStats?: IndexingStatsEvent
  ): void {
    this.listeners.forEach(listener => listener(vectorStore, progress, stats, finalStats));
  }

  private handleEvent(vectorStore: VectorStoreProvider, type: string, data: unknown, params: StartIndexingParams): void {
    const stream = this.activeStreams.get(vectorStore);
    if (!stream) return;

    const { startIndexingJob, updateJobStatus, showNotification } = useBoundStore.getState();
    const user = useBoundStore.getState().user;
    const userId = user?.userId ?? 'default-user';

    switch (type) {
      case 'start': {
        const startData = data as IndexingStartEvent;
        stream.jobId = startData.jobId;
        stream.progress = {
          processedCount: 0,
          totalCount: startData.totalNotes,
          embeddingsCreated: 0,
          currentNoteTitle: null,
          progressPercent: 0,
        };

        // Register with global slice
        const syntheticJob: IndexingJobResponse = {
          id: startData.jobId,
          status: 'running',
          totalNotes: startData.totalNotes,
          processedNotes: 0,
          skippedNotes: startData.skippedNotes,
          deletedNotes: startData.deletedNotes,
          totalChunks: 0,
          processedChunks: 0,
          errors: [],
          embeddingProvider: startData.embeddingProvider,
          embeddingModel: startData.embeddingModel,
          startedAt: startData.startedAt,
          completedAt: null,
          createdAt: startData.startedAt,
          progressPercentage: 0,
        };
        startIndexingJob(syntheticJob, vectorStore, params.embeddingProvider, userId);
        showNotification();
        this.notifyListeners(vectorStore, stream.progress, stream.stats);
        break;
      }

      case 'progress': {
        const progressData = data as IndexingProgressEvent;
        stream.progress = {
          processedCount: progressData.processedCount,
          totalCount: progressData.totalCount,
          embeddingsCreated: progressData.embeddingsCreated,
          currentNoteTitle: progressData.currentNoteTitle,
          progressPercent: progressData.progressPercent,
        };

        // Update global slice
        const syntheticJob: IndexingJobResponse = {
          id: progressData.jobId,
          status: 'running',
          totalNotes: progressData.totalCount,
          processedNotes: progressData.processedCount,
          skippedNotes: 0,
          deletedNotes: 0,
          totalChunks: progressData.embeddingsCreated,
          processedChunks: progressData.embeddingsCreated,
          errors: [],
          embeddingProvider: params.embeddingProvider,
          embeddingModel: params.embeddingModel,
          startedAt: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
          progressPercentage: progressData.progressPercent,
        };
        updateJobStatus(syntheticJob, vectorStore);
        this.notifyListeners(vectorStore, stream.progress, stream.stats);
        break;
      }

      case 'stats': {
        const statsData = data as IndexingStatsEvent;
        stream.stats = {
          indexedCount: statsData.indexedCount,
          pendingCount: statsData.pendingCount,
          totalNotes: statsData.totalNotes,
          dimensions: statsData.dimensions,
          lastIndexedAt: statsData.lastIndexedAt,
          totalEmbeddings: stream.progress?.embeddingsCreated ?? statsData.indexedCount,
        };
        this.notifyListeners(vectorStore, stream.progress, stream.stats);
        break;
      }

      case 'complete': {
        const completeData = data as IndexingCompleteEvent;
        stream.progress = null;
        stream.stats = null;

        // Update global slice
        const syntheticJob: IndexingJobResponse = {
          id: completeData.jobId,
          status: 'completed',
          totalNotes: completeData.totalProcessed,
          processedNotes: completeData.totalProcessed,
          skippedNotes: completeData.skippedNotes,
          deletedNotes: completeData.deletedNotes,
          totalChunks: completeData.embeddingsCreated,
          processedChunks: completeData.embeddingsCreated,
          errors: [],
          embeddingProvider: params.embeddingProvider,
          embeddingModel: params.embeddingModel,
          startedAt: null,
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          progressPercentage: 100,
        };
        updateJobStatus(syntheticJob, vectorStore);
        // Pass finalStats so the UI can update immediately without waiting for slow endpoint
        this.notifyListeners(vectorStore, null, null, completeData.finalStats);
        break;
      }

      case 'error': {
        const errorData = data as IndexingErrorEvent;
        stream.progress = null;
        stream.stats = null;

        // Update global slice
        const syntheticJob: IndexingJobResponse = {
          id: errorData.jobId,
          status: 'failed',
          totalNotes: 0,
          processedNotes: 0,
          skippedNotes: 0,
          deletedNotes: 0,
          totalChunks: 0,
          processedChunks: 0,
          errors: [errorData.message],
          embeddingProvider: params.embeddingProvider,
          embeddingModel: params.embeddingModel,
          startedAt: null,
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          progressPercentage: 0,
        };
        updateJobStatus(syntheticJob, vectorStore);
        this.notifyListeners(vectorStore, null, null);
        break;
      }
    }
  }
}

// Export singleton instance
export const indexingStreamManager = new IndexingStreamManager();
