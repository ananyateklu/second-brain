/**
 * useMarkdownWorker Hook
 * Provides a hook for parsing markdown in a web worker.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import type { MarkdownWorkerMessage, MarkdownWorkerResponse } from '../workers/markdown.worker';

interface UseMarkdownWorkerOptions {
  /** Debounce delay in milliseconds */
  debounceMs?: number;
}

interface UseMarkdownWorkerReturn {
  /** Parse markdown to HTML */
  parse: (markdown: string) => void;
  /** The parsed HTML output */
  html: string;
  /** Whether parsing is in progress */
  isParsing: boolean;
  /** Any error that occurred during parsing */
  error: string | null;
}

/**
 * Hook for parsing markdown in a web worker to avoid blocking the main thread.
 */
export function useMarkdownWorker(options: UseMarkdownWorkerOptions = {}): UseMarkdownWorkerReturn {
  const { debounceMs = 0 } = options;

  const workerRef = useRef<Worker | null>(null);
  const pendingIdRef = useRef<string | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [html, setHtml] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize worker on mount
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/markdown.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<MarkdownWorkerResponse>) => {
      const { type, id, html, error } = event.data;

      if (type === 'parsed' && id === pendingIdRef.current) {
        setHtml(html);
        setIsParsing(false);
        if (error) {
          setError(error);
        } else {
          setError(null);
        }
      }
    };

    workerRef.current.onerror = (err) => {
      console.error('Markdown worker error:', err);
      setError('Worker error occurred');
      setIsParsing(false);
    };

    return () => {
      workerRef.current?.terminate();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const parse = useCallback(
    (markdown: string) => {
      // Clear any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      const sendMessage = () => {
        if (!workerRef.current) {
          // Fallback to main thread if worker not available
          setHtml(markdown);
          return;
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        pendingIdRef.current = id;
        setIsParsing(true);

        const message: MarkdownWorkerMessage = {
          type: 'parse',
          id,
          markdown,
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

  return { parse, html, isParsing, error };
}
