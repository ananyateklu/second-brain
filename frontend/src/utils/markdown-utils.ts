/**
 * Markdown Utilities
 * Provides HTML-to-Markdown and Markdown-to-HTML conversion
 * for consistent note content storage in Markdown format.
 */

import TurndownService from 'turndown';

// Create a singleton instance of TurndownService with custom rules
let turndownService: TurndownService | null = null;

/**
 * Get or create the TurndownService instance with custom rules
 * for TipTap-specific HTML elements.
 */
function getTurndownService(): TurndownService {
  if (turndownService) {
    return turndownService;
  }

  turndownService = new TurndownService({
    headingStyle: 'atx', // Use # for headings
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
  });

  // Custom rule for list items to use single space after marker (not 3 spaces)
  // Also handles TipTap's tendency to wrap list content in <p> tags
  turndownService.addRule('listItem', {
    filter: 'li',
    replacement: (content, node, options) => {
      // Skip task list items - they have their own rule
      const el = node as Element;
      if (el.getAttribute('data-type') === 'taskItem') {
        // Let the taskListItem rule handle this
        return content;
      }

      // Clean up content - TipTap often wraps list item content in <p> tags
      // which causes extra newlines. We need to collapse these.
      content = content
        .replace(/^\n+/, '') // Remove leading newlines
        .replace(/\n+$/, '') // Remove trailing newlines
        .replace(/\n{2,}/g, '\n'); // Collapse multiple newlines to single

      // For nested content, indent with 2 spaces
      content = content.replace(/\n/gm, '\n  ');

      const parent = node.parentNode as Element;
      const isOrdered = parent?.nodeName === 'OL';
      let prefix = options.bulletListMarker + ' ';

      if (isOrdered) {
        const start = parent.getAttribute('start');
        const index = Array.prototype.indexOf.call(parent.children, node);
        const number = (start ? Number(start) + index : index + 1);
        prefix = number + '. ';
      }

      return prefix + content + '\n';
    },
  });

  // Custom rule for unordered lists to prevent extra spacing
  turndownService.addRule('unorderedList', {
    filter: 'ul',
    replacement: (content, node) => {
      const el = node as Element;
      // Skip task lists - they have their own rule
      if (el.getAttribute('data-type') === 'taskList') {
        return '\n' + content + '\n';
      }
      // Remove extra blank lines between list items
      content = content.replace(/\n{3,}/g, '\n');
      return '\n' + content + '\n';
    },
  });

  // Custom rule for ordered lists to prevent extra spacing
  turndownService.addRule('orderedList', {
    filter: 'ol',
    replacement: (content) => {
      // Remove extra blank lines between list items
      content = content.replace(/\n{3,}/g, '\n');
      return '\n' + content + '\n';
    },
  });

  // Custom rule for TipTap mention nodes (tags)
  // Converts <span class="mention" data-id="tagname">...</span> to #tagname
  turndownService.addRule('mention', {
    filter: (node) => {
      if (node.nodeName !== 'SPAN') return false;
      const el = node as Element;
      return el.classList.contains('mention');
    },
    replacement: (_content, node) => {
      const el = node as Element;
      const tagId = el.getAttribute('data-id');
      if (tagId) {
        return `#${tagId}`;
      }
      // Fallback: try to extract from text content
      const text = el.textContent || '';
      if (text.startsWith('#')) {
        return text;
      }
      return `#${text}`;
    },
  });

  // Custom rule for task list items
  // TipTap uses data-type="taskItem" and data-checked attributes
  turndownService.addRule('taskListItem', {
    filter: (node) => {
      if (node.nodeName !== 'LI') return false;
      const el = node as Element;
      return el.getAttribute('data-type') === 'taskItem';
    },
    replacement: (content, node) => {
      const el = node as Element;
      const isChecked = el.getAttribute('data-checked') === 'true';
      const checkbox = isChecked ? '[x]' : '[ ]';
      // Clean up content - remove leading/trailing whitespace and newlines
      const cleanContent = content.trim().replace(/^\n+|\n+$/g, '');
      return `- ${checkbox} ${cleanContent}\n`;
    },
  });

  // Custom rule for task lists (ul with data-type="taskList")
  turndownService.addRule('taskList', {
    filter: (node) => {
      if (node.nodeName !== 'UL') return false;
      const el = node as Element;
      return el.getAttribute('data-type') === 'taskList';
    },
    replacement: (content) => {
      // Content already has the task items formatted
      return `\n${content}\n`;
    },
  });

  // Custom rule for highlighted text
  turndownService.addRule('highlight', {
    filter: 'mark',
    replacement: (content) => {
      // Use == for highlights (common in extended markdown)
      return `==${content}==`;
    },
  });

  // Custom rule for underline (not standard markdown, use HTML)
  turndownService.addRule('underline', {
    filter: 'u',
    replacement: (content) => {
      // Underline isn't standard markdown - use <u> tags
      return `<u>${content}</u>`;
    },
  });

  // Custom rule for strikethrough
  turndownService.addRule('strikethrough', {
    filter: (node) => {
      return node.nodeName === 'DEL' || node.nodeName === 'S' || node.nodeName === 'STRIKE';
    },
    replacement: (content) => {
      return `~~${content}~~`;
    },
  });

  // Keep tables as HTML (Turndown's default table handling can be inconsistent)
  turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);

  return turndownService;
}

/**
 * Convert HTML content to Markdown.
 * Handles TipTap-specific elements like mentions, task lists, etc.
 *
 * @param html - The HTML content to convert
 * @returns The Markdown representation
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '' || html === '<p></p>') {
    return '';
  }

  const service = getTurndownService();

  try {
    let markdown = service.turndown(html);

    // Post-processing cleanup
    // Remove excessive blank lines (more than 2 consecutive newlines → single blank line)
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    // Normalize heading spacing: heading followed by multiple newlines → heading + single blank line
    // This ensures agent-created notes and UI-edited notes have consistent heading spacing
    markdown = markdown.replace(/(^#{1,6}\s+.+)\n{2,}/gm, '$1\n\n');

    // Fix list item spacing - remove blank lines between consecutive list items
    // Match: list item followed by blank line(s) followed by another list item
    // Replace with: list item followed by single newline followed by list item
    markdown = markdown.replace(/(^|\n)(- .+)\n\n+(- )/gm, '$1$2\n$3');
    markdown = markdown.replace(/(^|\n)(\d+\. .+)\n\n+(\d+\. )/gm, '$1$2\n$3');

    // Apply multiple times to handle consecutive items (the regex only matches pairs)
    for (let i = 0; i < 5; i++) {
      markdown = markdown.replace(/(- .+)\n\n+(- )/g, '$1\n$2');
      markdown = markdown.replace(/(\d+\. .+)\n\n+(\d+\. )/g, '$1\n$2');
    }

    // Trim trailing whitespace from each line
    markdown = markdown
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');

    // Trim leading/trailing whitespace from the entire content
    markdown = markdown.trim();

    return markdown;
  } catch (error) {
    console.error('Error converting HTML to Markdown:', error);
    // Fallback: return the HTML as-is (better than losing content)
    return html;
  }
}

/**
 * Check if a string appears to be HTML content.
 *
 * @param content - The content to check
 * @returns True if the content appears to be HTML
 */
export function isHtmlContent(content: string): boolean {
  if (!content || content.trim() === '') {
    return false;
  }

  const trimmed = content.trim();

  // Check if content starts with HTML tags
  if (/^<[a-z][\s\S]*>/i.test(trimmed)) {
    return true;
  }

  // Check for common HTML elements
  if (
    /<(p|div|span|h[1-6]|ul|ol|li|br|table|pre|code|blockquote|strong|em|a|img)[^>]*>/i.test(
      trimmed
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Ensure content is in Markdown format.
 * If content is HTML, converts it to Markdown.
 * If content is already Markdown, returns it as-is.
 *
 * @param content - The content to normalize
 * @returns The content in Markdown format
 */
export function ensureMarkdown(content: string): string {
  if (!content || content.trim() === '') {
    return '';
  }

  if (isHtmlContent(content)) {
    return htmlToMarkdown(content);
  }

  return content;
}

/**
 * Extract tags from Markdown content.
 * Finds all #tag patterns in the content.
 *
 * @param markdown - The Markdown content
 * @returns Array of tag names (without the # prefix)
 */
export function extractTagsFromMarkdown(markdown: string): string[] {
  if (!markdown) {
    return [];
  }

  const tagPattern = /#([a-zA-Z0-9_-]+)/g;
  const tags: string[] = [];
  let match;

  while ((match = tagPattern.exec(markdown)) !== null) {
    const tag = match[1];
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}
