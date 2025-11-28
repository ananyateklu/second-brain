import { create } from 'zustand';
import { aiApi, OllamaPullProgress, OllamaPullRequest } from '../features/ai/api/ai-api';

export interface ModelDownload {
  modelName: string;
  ollamaBaseUrl?: string | null;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled';
  progress?: OllamaPullProgress;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  abortController?: AbortController;
}

interface OllamaDownloadState {
  downloads: Record<string, ModelDownload>;
  
  // Actions
  startDownload: (request: OllamaPullRequest) => void;
  cancelDownload: (modelName: string) => void;
  clearDownload: (modelName: string) => void;
  clearCompletedDownloads: () => void;
}

// Helper to format bytes
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Helper to format download speed
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

// Helper to format time remaining
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
}

export const useOllamaDownloadStore = create<OllamaDownloadState>((set, get) => ({
  downloads: {},

  startDownload: (request: OllamaPullRequest) => {
    const key = request.modelName;
    
    // Check if already downloading
    const existing = get().downloads[key];
    if (existing && existing.status === 'downloading') {
      console.warn('Model already downloading:', { modelName: request.modelName });
      return;
    }

    // Create the download entry
    const download: ModelDownload = {
      modelName: request.modelName,
      ollamaBaseUrl: request.ollamaBaseUrl,
      status: 'pending',
      startedAt: new Date(),
    };

    set((state) => ({
      downloads: {
        ...state.downloads,
        [key]: download,
      },
    }));

    // Start the pull operation
    const abortController = aiApi.pullModel(request, {
      onProgress: (progress: OllamaPullProgress) => {
        set((state) => ({
          downloads: {
            ...state.downloads,
            [key]: {
              ...state.downloads[key],
              status: 'downloading',
              progress,
            },
          },
        }));
      },
      onComplete: () => {
        set((state) => ({
          downloads: {
            ...state.downloads,
            [key]: {
              ...state.downloads[key],
              status: 'completed',
              completedAt: new Date(),
            },
          },
        }));
      },
      onError: (error: string) => {
        set((state) => ({
          downloads: {
            ...state.downloads,
            [key]: {
              ...state.downloads[key],
              status: 'error',
              errorMessage: error,
              completedAt: new Date(),
            },
          },
        }));
      },
    });

    // Store the abort controller
    set((state) => ({
      downloads: {
        ...state.downloads,
        [key]: {
          ...state.downloads[key],
          abortController,
        },
      },
    }));
  },

  cancelDownload: (modelName: string) => {
    const download = get().downloads[modelName];
    if (download?.abortController) {
      download.abortController.abort();
    }
    
    set((state) => ({
      downloads: {
        ...state.downloads,
        [modelName]: {
          ...state.downloads[modelName],
          status: 'cancelled',
          errorMessage: 'Download cancelled by user',
          completedAt: new Date(),
        },
      },
    }));
  },

  clearDownload: (modelName: string) => {
    set((state) => {
      const newDownloads = { ...state.downloads };
      delete newDownloads[modelName];
      return { downloads: newDownloads };
    });
  },

  clearCompletedDownloads: () => {
    set((state) => {
      const newDownloads: Record<string, ModelDownload> = {};
      for (const [key, download] of Object.entries(state.downloads)) {
        if (download.status === 'downloading' || download.status === 'pending') {
          newDownloads[key] = download;
        }
      }
      return { downloads: newDownloads };
    });
  },
}));


