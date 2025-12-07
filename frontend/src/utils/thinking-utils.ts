/**
 * Utilities for handling thinking tags in AI responses.
 * These are used to extract and strip reasoning content from messages.
 * Supports both <thinking> and <think> tag variants.
 * Also supports Grok-specific <reasoning> tags from Think Mode.
 */

// Regex patterns to match various thinking tag variants
const THINKING_OPEN_REGEX = /<think(?:ing)?>/gi;
const THINKING_CLOSE_REGEX = /<\/think(?:ing)?>/gi;

// Grok-specific reasoning patterns
const REASONING_OPEN_REGEX = /<reason(?:ing)?>/gi;
const REASONING_CLOSE_REGEX = /<\/reason(?:ing)?>/gi;

/**
 * Check if content contains thinking tags (either <thinking> or <think>)
 */
export function hasThinkingTags(content: string): boolean {
  return /<think(?:ing)?>/i.test(content);
}

/**
 * Strip thinking tags from message content.
 * Handles both complete blocks (with closing tag) and incomplete blocks (without closing tag).
 * Supports both <thinking> and <think> tag variants.
 */
export function stripThinkingTags(content: string): string {
  // First remove complete thinking blocks (both <thinking> and <think> variants)
  let stripped = content.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
  // Then remove incomplete thinking blocks (opening tag without closing tag)
  stripped = stripped.replace(/<think(?:ing)?>[\s\S]*$/gi, '');
  return stripped.trim();
}

/**
 * Extract thinking content from message.
 * Handles both complete blocks (with closing tag) and incomplete blocks (without closing tag).
 * Supports both <thinking> and <think> tag variants.
 * 
 * @param content - The message content to extract thinking from
 * @param includeIncomplete - Whether to include incomplete thinking blocks (e.g., during streaming)
 * @returns Array of thinking step contents
 */
export function extractThinkingContent(content: string, includeIncomplete = false): string[] {
  const thinkingSteps: string[] = [];

  // Create fresh regex instances for each extraction
  const openRegex = new RegExp(THINKING_OPEN_REGEX.source, 'gi');
  const closeRegex = new RegExp(THINKING_CLOSE_REGEX.source, 'gi');

  let match;

  while ((match = openRegex.exec(content)) !== null) {
    const startIndex = match.index + match[0].length;

    // Find the closing tag after this opening tag
    closeRegex.lastIndex = startIndex;
    const closingMatch = closeRegex.exec(content);

    if (closingMatch) {
      // Complete thinking block
      const thinkingContent = content.substring(startIndex, closingMatch.index).trim();
      if (thinkingContent) {
        thinkingSteps.push(thinkingContent);
      }
    } else if (includeIncomplete) {
      // Incomplete thinking block (only include if explicitly requested, e.g., during streaming)
      const thinkingContent = content.substring(startIndex).trim();
      if (thinkingContent) {
        thinkingSteps.push(thinkingContent);
      }
      // Only process the first incomplete block
      break;
    }
  }

  return thinkingSteps;
}

/**
 * Check if content contains Grok reasoning tags (<reasoning>)
 */
export function hasReasoningTags(content: string): boolean {
  return /<reason(?:ing)?>/i.test(content);
}

/**
 * Strip Grok reasoning tags from message content.
 * Similar to stripThinkingTags but for Grok-specific reasoning format.
 */
export function stripReasoningTags(content: string): string {
  // First remove complete reasoning blocks
  let stripped = content.replace(/<reason(?:ing)?>[\s\S]*?<\/reason(?:ing)?>/gi, '');
  // Then remove incomplete reasoning blocks
  stripped = stripped.replace(/<reason(?:ing)?>[\s\S]*$/gi, '');
  return stripped.trim();
}

/**
 * Extract Grok reasoning content from message.
 * 
 * @param content - The message content to extract reasoning from
 * @param includeIncomplete - Whether to include incomplete reasoning blocks
 * @returns Array of reasoning step contents
 */
export function extractReasoningContent(content: string, includeIncomplete = false): string[] {
  const reasoningSteps: string[] = [];

  // Create fresh regex instances for each extraction
  const openRegex = new RegExp(REASONING_OPEN_REGEX.source, 'gi');
  const closeRegex = new RegExp(REASONING_CLOSE_REGEX.source, 'gi');

  let match;

  while ((match = openRegex.exec(content)) !== null) {
    const startIndex = match.index + match[0].length;

    // Find the closing tag after this opening tag
    closeRegex.lastIndex = startIndex;
    const closingMatch = closeRegex.exec(content);

    if (closingMatch) {
      // Complete reasoning block
      const reasoningContent = content.substring(startIndex, closingMatch.index).trim();
      if (reasoningContent) {
        reasoningSteps.push(reasoningContent);
      }
    } else if (includeIncomplete) {
      // Incomplete reasoning block
      const reasoningContent = content.substring(startIndex).trim();
      if (reasoningContent) {
        reasoningSteps.push(reasoningContent);
      }
      break;
    }
  }

  return reasoningSteps;
}

/**
 * Check if content contains any thinking-related tags (thinking, think, reasoning)
 */
export function hasAnyThinkingTags(content: string): boolean {
  return hasThinkingTags(content) || hasReasoningTags(content);
}

/**
 * Strip all thinking-related tags from content (thinking, think, reasoning)
 */
export function stripAllThinkingTags(content: string): string {
  let stripped = stripThinkingTags(content);
  stripped = stripReasoningTags(stripped);
  return stripped.trim();
}

/**
 * Extract all thinking content from message (both thinking and reasoning tags)
 * 
 * @param content - The message content to extract from
 * @param includeIncomplete - Whether to include incomplete blocks
 * @returns Combined array of all thinking/reasoning step contents
 */
export function extractAllThinkingContent(content: string, includeIncomplete = false): string[] {
  const thinkingSteps = extractThinkingContent(content, includeIncomplete);
  const reasoningSteps = extractReasoningContent(content, includeIncomplete);
  return [...thinkingSteps, ...reasoningSteps];
}
