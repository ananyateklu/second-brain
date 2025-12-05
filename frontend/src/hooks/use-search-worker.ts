/**
 * useSearchWorker Hook
 * Provides a hook for searching items in a web worker.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import type {
  SearchableItem,
  SearchOptions,
  SearchResult,
  SearchWorkerMessage,
  SearchWorkerResponse,
} from '../workers/search.worker';

interface UseSearchWorkerOptions {
  /** Debounce delay in milliseconds */
  debounceMs?: number;
}

interface UseSearchWorkerReturn {
  /** Search items with given options */
  search: (items: SearchableItem[], options: SearchOptions) => void;
  /** The search results */
  results: SearchResult[];
  /** Total number of matches */
  totalMatches: number;
  /** Whether search is in progress */
  isSearching: boolean;
  /** Time taken for the search in milliseconds */
  duration: number;
}

/**
 * Hook for searching items in a web worker to avoid blocking the main thread.
 */
export function useSearchWorker(options: UseSearchWorkerOptions = {}): UseSearchWorkerReturn {
  const { debounceMs = 150 } = options;

  const workerRef = useRef<Worker | null>(null);
  const pendingIdRef = useRef<string | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [duration, setDuration] = useState(0);

  // Initialize worker on mount
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/search.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<SearchWorkerResponse>) => {
      const { type, id, results, totalMatches, duration } = event.data;

      if (type === 'results' && id === pendingIdRef.current) {
        setResults(results);
        setTotalMatches(totalMatches);
        setDuration(duration);
        setIsSearching(false);
      }
    };

    workerRef.current.onerror = (err) => {
      console.error('Search worker error:', err);
      setIsSearching(false);
    };

    return () => {
      workerRef.current?.terminate();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const search = useCallback(
    (items: SearchableItem[], searchOptions: SearchOptions) => {
      // Clear any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      const sendMessage = () => {
        if (!workerRef.current) {
          // Fallback: simple filter on main thread
          const filtered = items.filter((item) => {
            if (!searchOptions.includeArchived && item.isArchived) return false;
            if (searchOptions.query) {
              const q = searchOptions.query.toLowerCase();
              if (searchOptions.searchMode === 'title') {
                return item.title.toLowerCase().includes(q);
              }
              if (searchOptions.searchMode === 'content') {
                return item.content.toLowerCase().includes(q);
              }
              return (
                item.title.toLowerCase().includes(q) ||
                item.content.toLowerCase().includes(q)
              );
            }
            return true;
          });
          setResults(filtered.map((item) => ({ item, score: 0, matches: [] })));
          setTotalMatches(filtered.length);
          return;
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        pendingIdRef.current = id;
        setIsSearching(true);

        const message: SearchWorkerMessage = {
          type: 'search',
          id,
          items,
          options: searchOptions,
        };

        workerRef.current.postMessage(message);
      };

      if (debounceMs > 0) {
        debounceTimeoutRef.current = setTimeout(sendMessage, debounceMs);
      } else {
        sendMessage();
      }
    },
    [debounceMs]
  );

  return { search, results, totalMatches, isSearching, duration };
}

// Re-export types for convenience
export type { SearchableItem, SearchOptions, SearchResult };
