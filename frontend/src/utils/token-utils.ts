/**
 * Utilities for token estimation and counting.
 */

/**
 * Estimate token count from text.
 * Uses the approximation that 1 token ≈ 3.5 characters.
 * 
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.5);
}

