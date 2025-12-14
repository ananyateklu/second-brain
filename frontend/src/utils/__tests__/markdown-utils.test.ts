/**
 * Tests for markdown-utils
 * Ensures HTML-to-Markdown conversion works correctly for TipTap content
 */

import { describe, it, expect } from 'vitest';
import {
  htmlToMarkdown,
  isHtmlContent,
  ensureMarkdown,
  extractTagsFromMarkdown,
} from '../markdown-utils';

describe('markdown-utils', () => {
  describe('htmlToMarkdown', () => {
    it('should convert basic paragraph to plain text', () => {
      const html = '<p>Hello world</p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('Hello world');
    });

    it('should convert bold text to markdown', () => {
      const html = '<p>This is <strong>bold</strong> text</p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('This is **bold** text');
    });

    it('should convert italic text to markdown', () => {
      const html = '<p>This is <em>italic</em> text</p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('This is *italic* text');
    });

    it('should convert headings to markdown', () => {
      const html = '<h1>Heading 1</h1><h2>Heading 2</h2>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('# Heading 1');
      expect(markdown).toContain('## Heading 2');
    });

    it('should convert bullet lists to markdown', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('- Item 1');
      expect(markdown).toContain('- Item 2');
    });

    it('should convert ordered lists to markdown', () => {
      const html = '<ol><li>First</li><li>Second</li></ol>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('1. First');
      expect(markdown).toContain('2. Second');
    });

    it('should handle TipTap-style lists with paragraph wrappers without extra spacing', () => {
      // TipTap wraps list item content in <p> tags
      const html = '<ul><li><p>Item 1</p></li><li><p>Item 2</p></li><li><p>Item 3</p></li></ul>';
      const markdown = htmlToMarkdown(html);
      // Should NOT have blank lines between items
      expect(markdown).toBe('- Item 1\n- Item 2\n- Item 3');
    });

    it('should handle TipTap-style ordered lists with paragraph wrappers', () => {
      const html = '<ol><li><p>First</p></li><li><p>Second</p></li><li><p>Third</p></li></ol>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('1. First\n2. Second\n3. Third');
    });

    it('should convert links to markdown', () => {
      const html = '<p>Visit <a href="https://example.com">Example</a></p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('Visit [Example](https://example.com)');
    });

    it('should convert code blocks to markdown', () => {
      const html = '<pre><code>const x = 1;</code></pre>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('```');
      expect(markdown).toContain('const x = 1;');
    });

    it('should convert inline code to markdown', () => {
      const html = '<p>Use <code>npm install</code> to install</p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('Use `npm install` to install');
    });

    it('should convert blockquotes to markdown', () => {
      const html = '<blockquote>This is a quote</blockquote>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('> This is a quote');
    });

    it('should convert horizontal rules to markdown', () => {
      const html = '<p>Above</p><hr><p>Below</p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('---');
    });

    it('should convert strikethrough to markdown', () => {
      const html = '<p>This is <del>deleted</del> text</p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('This is ~~deleted~~ text');
    });

    it('should convert TipTap mention nodes to hashtags', () => {
      const html = '<p>Check out <span class="mention" data-id="recipe">#recipe</span></p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('Check out #recipe');
    });

    it('should convert multiple mentions to hashtags', () => {
      const html = '<p><span class="mention" data-id="tag1">#tag1</span> <span class="mention" data-id="tag2">#tag2</span></p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('#tag1 #tag2');
    });

    it('should handle empty content', () => {
      expect(htmlToMarkdown('')).toBe('');
      expect(htmlToMarkdown('<p></p>')).toBe('');
      expect(htmlToMarkdown('   ')).toBe('');
    });

    it('should handle task list items', () => {
      const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="false">Todo item</li><li data-type="taskItem" data-checked="true">Done item</li></ul>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toContain('- [ ] Todo item');
      expect(markdown).toContain('- [x] Done item');
    });

    it('should preserve highlight markers', () => {
      const html = '<p>This is <mark>highlighted</mark> text</p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('This is ==highlighted== text');
    });

    it('should preserve underline as HTML', () => {
      const html = '<p>This is <u>underlined</u> text</p>';
      const markdown = htmlToMarkdown(html);
      expect(markdown).toBe('This is <u>underlined</u> text');
    });
  });

  describe('isHtmlContent', () => {
    it('should return true for HTML content', () => {
      expect(isHtmlContent('<p>Hello</p>')).toBe(true);
      expect(isHtmlContent('<div>Content</div>')).toBe(true);
      expect(isHtmlContent('<h1>Title</h1>')).toBe(true);
      expect(isHtmlContent('<ul><li>Item</li></ul>')).toBe(true);
    });

    it('should return false for markdown content', () => {
      expect(isHtmlContent('# Heading')).toBe(false);
      expect(isHtmlContent('**bold** text')).toBe(false);
      expect(isHtmlContent('- list item')).toBe(false);
      expect(isHtmlContent('Plain text')).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(isHtmlContent('')).toBe(false);
      expect(isHtmlContent('   ')).toBe(false);
    });
  });

  describe('ensureMarkdown', () => {
    it('should convert HTML to markdown', () => {
      const html = '<p><strong>Bold</strong></p>';
      expect(ensureMarkdown(html)).toBe('**Bold**');
    });

    it('should return markdown as-is', () => {
      const markdown = '# Title\n\n**Bold** text';
      expect(ensureMarkdown(markdown)).toBe(markdown);
    });

    it('should handle empty content', () => {
      expect(ensureMarkdown('')).toBe('');
      expect(ensureMarkdown('   ')).toBe('');
    });
  });

  describe('extractTagsFromMarkdown', () => {
    it('should extract hashtags from markdown', () => {
      const markdown = 'This is about #recipe and #cooking';
      const tags = extractTagsFromMarkdown(markdown);
      expect(tags).toEqual(['recipe', 'cooking']);
    });

    it('should handle tags with hyphens and underscores', () => {
      const markdown = '#web-dev #react_hooks';
      const tags = extractTagsFromMarkdown(markdown);
      expect(tags).toEqual(['web-dev', 'react_hooks']);
    });

    it('should deduplicate tags', () => {
      const markdown = '#tag1 #tag2 #tag1 #tag2';
      const tags = extractTagsFromMarkdown(markdown);
      expect(tags).toEqual(['tag1', 'tag2']);
    });

    it('should return empty array for content without tags', () => {
      const markdown = 'No tags here';
      const tags = extractTagsFromMarkdown(markdown);
      expect(tags).toEqual([]);
    });

    it('should handle empty content', () => {
      expect(extractTagsFromMarkdown('')).toEqual([]);
      expect(extractTagsFromMarkdown(null as unknown as string)).toEqual([]);
    });
  });
});
