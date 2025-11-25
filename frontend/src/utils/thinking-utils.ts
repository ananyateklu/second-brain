/**
 * Utilities for handling thinking tags in AI responses.
 * These are used to extract and strip reasoning content from messages.
 */

/**
 * Strip thinking tags from message content.
 * Handles both complete blocks (with closing tag) and incomplete blocks (without closing tag).
 */
export function stripThinkingTags(content: string): string {
  // First remove complete thinking blocks
  let stripped = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  // Then remove incomplete thinking blocks (opening tag without closing tag)
  stripped = stripped.replace(/<thinking>[\s\S]*$/gi, '');
  return stripped.trim();
}

/**
 * Extract thinking content from message.
 * Handles both complete blocks (with closing tag) and incomplete blocks (without closing tag).
 * 
 * @param content - The message content to extract thinking from
 * @param includeIncomplete - Whether to include incomplete thinking blocks (e.g., during streaming)
 * @returns Array of thinking step contents
 */
export function extractThinkingContent(content: string, includeIncomplete: boolean = false): string[] {
  const thinkingSteps: string[] = [];
  const thinkingTagRegex = /<thinking>/gi;
  const closingTagRegex = /<\/thinking>/gi;

  let match;
  thinkingTagRegex.lastIndex = 0;

  while ((match = thinkingTagRegex.exec(content)) !== null) {
    const startIndex = match.index + match[0].length;

    // Find the closing tag after this opening tag
    closingTagRegex.lastIndex = startIndex;
    const closingMatch = closingTagRegex.exec(content);

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

