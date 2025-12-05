/**
 * Token Counter Worker
 * Offloads token estimation to a separate thread.
 * Uses a simple approximation based on character count and common patterns.
 */

export interface TokenCountMessage {
  type: 'count';
  id: string;
  text: string;
  model?: string;
}

export interface TokenCountResponse {
  type: 'counted';
  id: string;
  tokens: number;
  characters: number;
  words: number;
}

export interface BatchTokenCountMessage {
  type: 'countBatch';
  id: string;
  texts: string[];
  model?: string;
}

export interface BatchTokenCountResponse {
  type: 'batchCounted';
  id: string;
  counts: number[];
  total: number;
}

/**
 * Estimate token count for a given text.
 * This is an approximation - actual token counts vary by model.
 * 
 * General rules of thumb:
 * - English: ~4 characters per token
 * - Code: ~3 characters per token (more symbols)
 * - CJK languages: ~1-2 characters per token
 */
function estimateTokens(text: string, model?: string): number {
  if (!text) return 0;

  // Different tokenization strategies based on model family
  const isCodeModel = model?.includes('code') || model?.includes('codex');
  const isClaude = model?.includes('claude');

  // Base character-to-token ratio
  let charsPerToken = 4;

  if (isCodeModel) {
    charsPerToken = 3;
  }

  // Detect if text is mostly code (has many special characters)
  const codeCharacters = (text.match(/[{}()[\]<>:;=+\-*/%&|^~!?@#$\\]/g) || []).length;
  const codeRatio = codeCharacters / text.length;
  if (codeRatio > 0.1) {
    charsPerToken = 3;
  }

  // Detect CJK characters
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length;
  const cjkRatio = cjkChars / text.length;
  if (cjkRatio > 0.3) {
    // CJK text has roughly 1.5 characters per token
    charsPerToken = 1.5;
  }

  // Calculate base token estimate
  let tokens = Math.ceil(text.length / charsPerToken);

  // Add tokens for whitespace boundaries (words)
  const words = text.split(/\s+/).filter(Boolean).length;

  // Claude models tend to use slightly fewer tokens
  if (isClaude) {
    tokens = Math.ceil(tokens * 0.95);
  }

  // Add a small buffer for special tokens
  tokens += Math.ceil(words * 0.1);

  return Math.max(1, tokens);
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

self.onmessage = (event: MessageEvent<TokenCountMessage | BatchTokenCountMessage>) => {
  const { type, id } = event.data;

  if (type === 'count') {
    const { text, model } = event.data as TokenCountMessage;
    const tokens = estimateTokens(text, model);
    const response: TokenCountResponse = {
      type: 'counted',
      id,
      tokens,
      characters: text.length,
      words: countWords(text),
    };
    self.postMessage(response);
  } else if (type === 'countBatch') {
    const { texts, model } = event.data as BatchTokenCountMessage;
    const counts = texts.map((text) => estimateTokens(text, model));
    const response: BatchTokenCountResponse = {
      type: 'batchCounted',
      id,
      counts,
      total: counts.reduce((sum, count) => sum + count, 0),
    };
    self.postMessage(response);
  }
};
