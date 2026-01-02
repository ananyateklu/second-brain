import type { ClaudeSessionData } from '../types/claude-session';

/**
 * Parse Claude Code session.md content into structured data
 * Extracts key fields from the markdown format
 */
export function parseClaudeSession(
  content: string,
  source: 'file' | 'paste'
): ClaudeSessionData {
  let lastUpdated: string | null = null;
  let focus: string | null = null;
  let title: string | null = null;
  let description: string | null = null;
  let branch: string | null = null;

  // Parse line by line for header metadata
  const lines = content.split('\n');

  for (const line of lines) {
    // Match: > **Last Updated**: 2026-01-02 09:05
    const lastUpdatedMatch = line.match(/>\s*\*\*Last Updated\*\*:\s*(.+)/i);
    if (lastUpdatedMatch) {
      lastUpdated = lastUpdatedMatch[1].trim();
      continue;
    }

    // Match: > **Focus**: Description here
    const focusMatch = line.match(/>\s*\*\*Focus\*\*:\s*(.+)/i);
    if (focusMatch) {
      focus = focusMatch[1].trim();
      continue;
    }

    // Match: **Branch**: feature-branch
    const branchMatch = line.match(/\*\*Branch\*\*:\s*(.+)/i);
    if (branchMatch) {
      branch = branchMatch[1].trim();
      continue;
    }
  }

  // Parse session summary section for title and description
  // Pattern: ### Current Work\n\n**Title** - Description
  const currentWorkMatch = content.match(
    /###\s*Current Work\s*\n+\*\*([^*]+)\*\*\s*[-–—]\s*(.+?)(?:\n|$)/i
  );
  if (currentWorkMatch) {
    title = currentWorkMatch[1].trim();
    description = currentWorkMatch[2].trim();
  }

  // Alternative pattern: ### Current Work\n\n**Title**\nDescription on next line
  if (!title) {
    const altMatch = content.match(
      /###\s*Current Work\s*\n+\*\*([^*]+)\*\*[^\n]*\n+([^#\n][^\n]+)/i
    );
    if (altMatch) {
      title = altMatch[1].trim();
      description = altMatch[2].trim();
    }
  }

  // Fallback: use Focus as title if no explicit title found
  if (!title && focus) {
    title = focus;
  }

  // If we have a focus but no description, try to find more context
  if (title && !description) {
    // Look for the first paragraph after ## Session Summary
    const summaryMatch = content.match(
      /##\s*Session Summary\s*\n+(?:###\s*Current Work\s*\n+)?(?:\*\*[^*]+\*\*[^\n]*\n+)?([^#\n][^\n]+)/i
    );
    if (summaryMatch?.[1]) {
      const potentialDesc = summaryMatch[1].trim();
      // Only use if it's not just the title repeated
      if (potentialDesc !== title && potentialDesc.length > 10) {
        description = potentialDesc;
      }
    }
  }

  return {
    lastUpdated,
    focus,
    title,
    description,
    branch,
    rawContent: content,
    source,
    loadedAt: new Date().toISOString(),
  };
}

/**
 * Validate that content looks like a valid session.md file
 */
export function isValidSessionContent(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  // Check for expected markers
  const hasSessionHeader = content.includes('# Current Session Context');
  const hasFocusField = /\*\*Focus\*\*:/.test(content);
  const hasLastUpdated = /\*\*Last Updated\*\*:/.test(content);

  // Need at least the header or both metadata fields
  return hasSessionHeader || (hasFocusField && hasLastUpdated);
}
