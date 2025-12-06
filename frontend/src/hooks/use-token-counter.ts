/**
 * useTokenCounter Hook
 * Provides a hook for counting tokens in a web worker.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import type {
  TokenCountMessage,
  TokenCountResponse,
  BatchTokenCountMessage,
  BatchTokenCountResponse,
} from '../workers/token-counter.worker';

interface UseTokenCounterOptions {
  /** Model name for more accurate token estimation */
  model?: string;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
}

interface TokenCount {
  tokens: number;
  characters: number;
  words: number;
}

interface UseTokenCounterReturn {
  /** Count tokens in a single text */
  count: (text: string) => void;
  /** Count tokens in multiple texts */
  countBatch: (texts: string[]) => void;
  /** The token count result */
  result: TokenCount | null;
  /** Batch count results */
  batchResult: { counts: number[]; total: number } | null;
  /** Whether counting is in progress */
  isCounting: boolean;
}

/**
 * Hook for counting tokens in a web worker to avoid blocking the main thread.
 */
export function useTokenCounter(options: UseTokenCounterOptions = {}): UseTokenCounterReturn {
  const { model, debounceMs = 100 } = options;

  const workerRef = useRef<Worker | null>(null);
  const pendingIdRef = useRef<string | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [result, setResult] = useState<TokenCount | null>(null);
  const [batchResult, setBatchResult] = useState<{ counts: number[]; total: number } | null>(null);
  const [isCounting, setIsCounting] = useState(false);

  // Initialize worker on mount
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/token-counter.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (
      event: MessageEvent<TokenCountResponse | BatchTokenCountResponse>
    ) => {
      const { type, id } = event.data;

      if (id !== pendingIdRef.current) return;

      if (type === 'counted') {
        const { tokens, characters, words } = event.data;
        setResult({ tokens, characters, words });
        setIsCounting(false);
      } else if (type === 'batchCounted') {
        const { counts, total } = event.data;
        setBatchResult({ counts, total });
        setIsCounting(false);
      }
    };

    workerRef.current.onerror = (err) => {
      console.error('Token counter worker error:', err);
      setIsCounting(false);
    };

    return () => {
      workerRef.current?.terminate();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const count = useCallback(
    (text: string) => {
      // Clear any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      const sendMessage = () => {
        if (!workerRef.current) {
          // Fallback to simple estimation on main thread
          const tokens = Math.ceil(text.length / 4);
          const words = text.split(/\s+/).filter(Boolean).length;
          setResult({ tokens, characters: text.length, words });
          return;
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        pendingIdRef.current = id;
        setIsCounting(true);

        const message: TokenCountMessage = {
          type: 'count',
          id,
          text,
          model,
        };

        workerRef.current.postMessage(message);
      };

      if (debounceMs > 0) {
        debounceTimeoutRef.current = setTimeout(sendMessage, debounceMs);
      } else {
        sendMessage();
      }
    },
    [model, debounceMs]
  );

  const countBatch = useCallback(
    (texts: string[]) => {
      // Clear any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      const sendMessage = () => {
        if (!workerRef.current) {
          // Fallback to simple estimation on main thread
          const counts = texts.map((text) => Math.ceil(text.length / 4));
          setBatchResult({ counts, total: counts.reduce((sum, c) => sum + c, 0) });
          return;
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        pendingIdRef.current = id;
        setIsCounting(true);

        const message: BatchTokenCountMessage = {
          type: 'countBatch',
          id,
          texts,
          model,
        };

        workerRef.current.postMessage(message);
      };

      if (debounceMs > 0) {
        debounceTimeoutRef.current = setTimeout(sendMessage, debounceMs);
      } else {
        sendMessage();
      }
    },
    [model, debounceMs]
  );

  return { count, countBatch, result, batchResult, isCounting };
}

/**
 * Simple synchronous token estimation for cases where worker overhead isn't needed.
 * This runs on the main thread but is fast enough for small texts.
 */
export function estimateTokensSync(text: string, model?: string): number {
  if (!text) return 0;

  const isCodeModel = model?.includes('code') || model?.includes('codex');
  const isClaude = model?.includes('claude');

  let charsPerToken = 4;

  if (isCodeModel) {
    charsPerToken = 3;
  }

  // Detect code-heavy text
  const codeCharacters = (text.match(/[{}()[\]<>:;=+\-*/%&|^~!?@#$\\]/g) || []).length;
  const codeRatio = codeCharacters / text.length;
  if (codeRatio > 0.1) {
    charsPerToken = 3;
  }

  // Detect CJK characters
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length;
  const cjkRatio = cjkChars / text.length;
  if (cjkRatio > 0.3) {
    charsPerToken = 1.5;
  }

  let tokens = Math.ceil(text.length / charsPerToken);
  const words = text.split(/\s+/).filter(Boolean).length;

  if (isClaude) {
    tokens = Math.ceil(tokens * 0.95);
  }

  tokens += Math.ceil(words * 0.1);

  return Math.max(1, tokens);
}
