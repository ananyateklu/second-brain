/**
 * Markdown Worker
 * Offloads markdown parsing to a separate thread for better UI performance.
 */

import { marked, type Tokens } from 'marked';

// Configure marked for performance
marked.setOptions({
  gfm: true,
  breaks: true,
});

export interface MarkdownWorkerMessage {
  type: 'parse';
  id: string;
  markdown: string;
}

export interface MarkdownWorkerResponse {
  type: 'parsed';
  id: string;
  html: string;
  error?: string;
}

self.onmessage = async (event: MessageEvent<MarkdownWorkerMessage>) => {
  const { type, id, markdown } = event.data;

  if (type === 'parse') {
    try {
      const html = await marked.parse(markdown);
      const response: MarkdownWorkerResponse = {
        type: 'parsed',
        id,
        html,
      };
      self.postMessage(response);
    } catch (error) {
      const response: MarkdownWorkerResponse = {
        type: 'parsed',
        id,
        html: markdown, // Fallback to raw text
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      self.postMessage(response);
    }
  }
};

// Export types for use in the main thread
export type { Tokens };
