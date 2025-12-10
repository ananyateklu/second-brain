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
 * Also handles orphan closing tags and partial thinking content that may appear during streaming.
 * Supports both <thinking> and <think> tag variants.
 */
export function stripThinkingTags(content: string): string {
  // First remove complete thinking blocks (both <thinking> and <think> variants)
  let stripped = content.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
  // Then remove incomplete thinking blocks (opening tag without closing tag)
  stripped = stripped.replace(/<think(?:ing)?>[\s\S]*$/gi, '');
  // Remove content that ends with closing tag but has no opening tag (tail of thinking block)
  // This handles cases where uncaptured text only contains the end of a thinking block
  stripped = stripped.replace(/^[\s\S]*?<\/think(?:ing)?>/gi, '');
  // Remove any remaining orphan closing tags
  stripped = stripped.replace(/<\/think(?:ing)?>/gi, '');
  // Remove partial opening tags at the end (forming during streaming)
  stripped = stripped.replace(/<(?:t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?)?)?)?)?)?$/gi, '');
  // Remove partial closing tags at the end (forming during streaming)
  stripped = stripped.replace(/<\/(?:t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?)?)?)?)?)?$/gi, '');
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
 * Also handles orphan closing tags and partial reasoning content that may appear during streaming.
 */
export function stripReasoningTags(content: string): string {
  // First remove complete reasoning blocks
  let stripped = content.replace(/<reason(?:ing)?>[\s\S]*?<\/reason(?:ing)?>/gi, '');
  // Then remove incomplete reasoning blocks
  stripped = stripped.replace(/<reason(?:ing)?>[\s\S]*$/gi, '');
  // Remove content that ends with closing tag but has no opening tag (tail of reasoning block)
  stripped = stripped.replace(/^[\s\S]*?<\/reason(?:ing)?>/gi, '');
  // Remove any remaining orphan closing tags
  stripped = stripped.replace(/<\/reason(?:ing)?>/gi, '');
  // Remove partial opening tags at the end (forming during streaming)
  stripped = stripped.replace(/<(?:r(?:e(?:a(?:s(?:o(?:n(?:i(?:n(?:g)?)?)?)?)?)?)?)?)?$/gi, '');
  // Remove partial closing tags at the end (forming during streaming)
  stripped = stripped.replace(/<\/(?:r(?:e(?:a(?:s(?:o(?:n(?:i(?:n(?:g)?)?)?)?)?)?)?)?)?$/gi, '');
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

/**
 * Extract text that appears BEFORE the first thinking tag.
 * This is "pre-thinking text" that should be shown in the process timeline.
 *
 * @param content - The message content
 * @returns Text before the first thinking tag, or empty string if none
 */
export function extractPreThinkingText(content: string): string {
  // Match text before the first <thinking> or <think> tag
  const match = content.match(/^([\s\S]*?)(?=<think(?:ing)?>)/i);
  if (match?.[1]) {
    return match[1].trim();
  }
  return '';
}

/**
 * Extract text that appears BETWEEN thinking tags and tool calls.
 * This handles cases where there's text after thinking ends but before tools start.
 *
 * @param _content - The message content (should have thinking tags stripped already)
 * @param _preToolTexts - Pre-tool texts that are already captured
 * @returns Text between thinking end and first tool, or empty string
 */
export function extractPostThinkingText(_content: string, _preToolTexts: string[]): string {
  // This is already handled by preToolText - the first preToolText contains
  // any text between thinking and the first tool call
  // We return empty here as the logic is handled elsewhere
  return '';
}

/**
 * Strip pre-tool text from message content.
 * Pre-tool text is intermediate text that was streamed before tool calls,
 * and should be shown in the process timeline rather than the main response bubble.
 *
 * @param content - The full message content
 * @param preToolTexts - Array of pre-tool text strings to remove
 * @returns Content with pre-tool text removed
 */
export function stripPreToolText(content: string, preToolTexts: string[]): string {
  if (!preToolTexts || preToolTexts.length === 0) {
    return content;
  }

  let result = content;

  for (const preToolText of preToolTexts) {
    if (preToolText?.trim()) {
      // Remove the pre-tool text from the content
      // We need to handle it carefully - the text might appear with slight variations
      const trimmedPreTool = preToolText.trim();

      // Try exact match first
      if (result.includes(trimmedPreTool)) {
        result = result.replace(trimmedPreTool, '');
      } else {
        // Try without thinking tags (pre-tool text is stored with thinking tags stripped)
        const contentWithoutThinking = stripAllThinkingTags(result);
        if (contentWithoutThinking.includes(trimmedPreTool)) {
          // The pre-tool text is there after stripping thinking tags
          // We need to find and remove it from the original
          result = result.replace(trimmedPreTool, '');
        }
      }
    }
  }

  // Clean up any multiple newlines and trim
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Strip ALL timeline text from message content for persisted messages.
 * This includes:
 * - Thinking tags and their content
 * - Pre-tool text (text before each tool call)
 * - Pre-thinking text (text before thinking starts)
 *
 * The result is only the "final response" text that should appear in the main bubble.
 *
 * @param content - The full message content
 * @param preToolTexts - Array of pre-tool text strings to remove
 * @param hasThinking - Whether the message contains thinking tags
 * @returns Content with all timeline text removed
 */
export function stripAllTimelineText(
  content: string,
  preToolTexts: string[],
  hasThinking: boolean
): string {
  let result = content;

  // First, strip thinking tags (they're shown in the timeline)
  if (hasThinking) {
    result = stripAllThinkingTags(result);
  }

  // Strip pre-tool texts - each preToolText contains text that was shown
  // in the timeline BEFORE a tool call, so it should not appear in the main bubble
  // Note: preToolTexts may also contain thinking tags (since they were captured from
  // fullResponse which includes thinking tags), so we need to strip those too
  for (const preToolText of preToolTexts) {
    if (preToolText?.trim()) {
      // Strip thinking tags from preToolText before matching
      // This handles the case where preToolText was captured with thinking tags
      const cleanedPreToolText = stripAllThinkingTags(preToolText).trim();

      if (cleanedPreToolText && result.includes(cleanedPreToolText)) {
        result = result.split(cleanedPreToolText).join('');
      }
    }
  }

  // If there was thinking, also strip any text that appeared BEFORE thinking
  // (this text is captured in the timeline as a "text" event)
  if (hasThinking) {
    const preThinkingText = extractPreThinkingText(content);
    if (preThinkingText) {
      result = result.split(preThinkingText).join('');
    }
  }

  // Clean up any multiple newlines and trim
  return result.replace(/\n{3,}/g, '\n\n').trim();
}
