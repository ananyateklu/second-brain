/**
 * Thinking Utils Tests
 * Unit tests for the thinking tag utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  hasThinkingTags,
  stripThinkingTags,
  extractThinkingContent,
  hasReasoningTags,
  stripReasoningTags,
  extractReasoningContent,
  hasAnyThinkingTags,
  stripAllThinkingTags,
  extractAllThinkingContent,
  extractPreThinkingText,
  stripPreToolText,
  stripAllTimelineText,
} from '../thinking-utils';

describe('thinking-utils', () => {
  // ============================================
  // hasThinkingTags Tests
  // ============================================
  describe('hasThinkingTags', () => {
    it('should return true for <thinking> tag', () => {
      expect(hasThinkingTags('<thinking>some content</thinking>')).toBe(true);
    });

    it('should return true for <think> tag', () => {
      expect(hasThinkingTags('<think>some content</think>')).toBe(true);
    });

    it('should return true for uppercase tags', () => {
      expect(hasThinkingTags('<THINKING>content</THINKING>')).toBe(true);
    });

    it('should return false for no thinking tags', () => {
      expect(hasThinkingTags('Just regular content')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasThinkingTags('')).toBe(false);
    });
  });

  // ============================================
  // stripThinkingTags Tests
  // ============================================
  describe('stripThinkingTags', () => {
    it('should strip complete thinking blocks', () => {
      const content = 'Before <thinking>some reasoning</thinking> After';
      expect(stripThinkingTags(content)).toBe('Before  After');
    });

    it('should strip complete think blocks', () => {
      const content = 'Before <think>some reasoning</think> After';
      expect(stripThinkingTags(content)).toBe('Before  After');
    });

    it('should strip incomplete thinking blocks', () => {
      const content = 'Before <thinking>some incomplete reasoning';
      expect(stripThinkingTags(content)).toBe('Before');
    });

    it('should strip orphan closing tags', () => {
      const content = 'some content</thinking> rest';
      expect(stripThinkingTags(content)).toBe('rest');
    });

    it('should strip partial opening tags at end', () => {
      const content = 'Some content <th';
      expect(stripThinkingTags(content)).toBe('Some content');
    });

    it('should handle multiple thinking blocks', () => {
      const content = '<thinking>first</thinking> middle <think>second</think> end';
      expect(stripThinkingTags(content)).toBe('middle  end');
    });

    it('should return trimmed content', () => {
      const content = '  <thinking>content</thinking>  ';
      expect(stripThinkingTags(content)).toBe('');
    });
  });

  // ============================================
  // extractThinkingContent Tests
  // ============================================
  describe('extractThinkingContent', () => {
    it('should extract content from complete thinking blocks', () => {
      const content = '<thinking>reasoning here</thinking>';
      expect(extractThinkingContent(content)).toEqual(['reasoning here']);
    });

    it('should extract content from think blocks', () => {
      const content = '<think>reasoning here</think>';
      expect(extractThinkingContent(content)).toEqual(['reasoning here']);
    });

    it('should extract multiple thinking blocks', () => {
      const content = '<thinking>first</thinking> text <thinking>second</thinking>';
      expect(extractThinkingContent(content)).toEqual(['first', 'second']);
    });

    it('should not extract incomplete blocks by default', () => {
      const content = '<thinking>incomplete';
      expect(extractThinkingContent(content)).toEqual([]);
    });

    it('should extract incomplete blocks when includeIncomplete is true', () => {
      const content = '<thinking>incomplete content';
      expect(extractThinkingContent(content, true)).toEqual(['incomplete content']);
    });

    it('should return empty array for no thinking blocks', () => {
      expect(extractThinkingContent('no thinking here')).toEqual([]);
    });

    it('should handle empty thinking blocks', () => {
      const content = '<thinking></thinking>';
      expect(extractThinkingContent(content)).toEqual([]);
    });

    it('should handle nested content correctly', () => {
      const content = '<thinking>Step 1\nStep 2\nStep 3</thinking>';
      expect(extractThinkingContent(content)).toEqual(['Step 1\nStep 2\nStep 3']);
    });
  });

  // ============================================
  // hasReasoningTags Tests
  // ============================================
  describe('hasReasoningTags', () => {
    it('should return true for <reasoning> tag', () => {
      expect(hasReasoningTags('<reasoning>content</reasoning>')).toBe(true);
    });

    it('should return true for <reason> tag', () => {
      expect(hasReasoningTags('<reason>content</reason>')).toBe(true);
    });

    it('should return false for no reasoning tags', () => {
      expect(hasReasoningTags('Just regular content')).toBe(false);
    });
  });

  // ============================================
  // stripReasoningTags Tests
  // ============================================
  describe('stripReasoningTags', () => {
    it('should strip complete reasoning blocks', () => {
      const content = 'Before <reasoning>logic</reasoning> After';
      expect(stripReasoningTags(content)).toBe('Before  After');
    });

    it('should strip incomplete reasoning blocks', () => {
      const content = 'Before <reasoning>incomplete';
      expect(stripReasoningTags(content)).toBe('Before');
    });

    it('should strip orphan closing tags', () => {
      const content = 'partial</reasoning> rest';
      expect(stripReasoningTags(content)).toBe('rest');
    });
  });

  // ============================================
  // extractReasoningContent Tests
  // ============================================
  describe('extractReasoningContent', () => {
    it('should extract content from reasoning blocks', () => {
      const content = '<reasoning>logic here</reasoning>';
      expect(extractReasoningContent(content)).toEqual(['logic here']);
    });

    it('should extract incomplete blocks when requested', () => {
      const content = '<reasoning>incomplete';
      expect(extractReasoningContent(content, true)).toEqual(['incomplete']);
    });

    it('should return empty array for no reasoning blocks', () => {
      expect(extractReasoningContent('no reasoning')).toEqual([]);
    });
  });

  // ============================================
  // hasAnyThinkingTags Tests
  // ============================================
  describe('hasAnyThinkingTags', () => {
    it('should return true for thinking tags', () => {
      expect(hasAnyThinkingTags('<thinking>content</thinking>')).toBe(true);
    });

    it('should return true for reasoning tags', () => {
      expect(hasAnyThinkingTags('<reasoning>content</reasoning>')).toBe(true);
    });

    it('should return true for mixed tags', () => {
      expect(hasAnyThinkingTags('<thinking>a</thinking> and <reasoning>b</reasoning>')).toBe(true);
    });

    it('should return false for no tags', () => {
      expect(hasAnyThinkingTags('plain text')).toBe(false);
    });
  });

  // ============================================
  // stripAllThinkingTags Tests
  // ============================================
  describe('stripAllThinkingTags', () => {
    it('should strip both thinking and reasoning tags', () => {
      const content = '<thinking>a</thinking> middle <reasoning>b</reasoning> end';
      expect(stripAllThinkingTags(content)).toBe('middle  end');
    });

    it('should handle content with only thinking tags', () => {
      const content = '<thinking>content</thinking>';
      expect(stripAllThinkingTags(content)).toBe('');
    });

    it('should handle content with only reasoning tags', () => {
      const content = '<reasoning>content</reasoning>';
      expect(stripAllThinkingTags(content)).toBe('');
    });
  });

  // ============================================
  // extractAllThinkingContent Tests
  // ============================================
  describe('extractAllThinkingContent', () => {
    it('should extract from both thinking and reasoning tags', () => {
      const content = '<thinking>thought</thinking> <reasoning>reason</reasoning>';
      expect(extractAllThinkingContent(content)).toEqual(['thought', 'reason']);
    });

    it('should handle only thinking tags', () => {
      const content = '<thinking>thought</thinking>';
      expect(extractAllThinkingContent(content)).toEqual(['thought']);
    });

    it('should handle only reasoning tags', () => {
      const content = '<reasoning>reason</reasoning>';
      expect(extractAllThinkingContent(content)).toEqual(['reason']);
    });
  });

  // ============================================
  // extractPreThinkingText Tests
  // ============================================
  describe('extractPreThinkingText', () => {
    it('should extract text before thinking tag', () => {
      const content = 'Pre-thinking text <thinking>content</thinking>';
      expect(extractPreThinkingText(content)).toBe('Pre-thinking text');
    });

    it('should return empty string if no pre-thinking text', () => {
      const content = '<thinking>content</thinking>';
      expect(extractPreThinkingText(content)).toBe('');
    });

    it('should return empty string if no thinking tag', () => {
      expect(extractPreThinkingText('just text')).toBe('');
    });
  });

  // ============================================
  // stripPreToolText Tests
  // ============================================
  describe('stripPreToolText', () => {
    it('should strip pre-tool text from content', () => {
      const content = 'Let me search for that. Here are the results.';
      const preToolTexts = ['Let me search for that.'];
      expect(stripPreToolText(content, preToolTexts)).toBe('Here are the results.');
    });

    it('should handle empty preToolTexts array', () => {
      const content = 'Some content';
      expect(stripPreToolText(content, [])).toBe('Some content');
    });

    it('should handle multiple pre-tool texts', () => {
      const content = 'First. Second. Third.';
      const preToolTexts = ['First.', 'Second.'];
      expect(stripPreToolText(content, preToolTexts)).toBe('Third.');
    });

    it('should clean up multiple newlines', () => {
      const content = 'Text\n\n\n\nMore text';
      expect(stripPreToolText(content, [])).toBe('Text\n\n\n\nMore text');
    });
  });

  // ============================================
  // stripAllTimelineText Tests
  // ============================================
  describe('stripAllTimelineText', () => {
    it('should strip thinking and pre-tool text', () => {
      const content = 'Pre <thinking>thought</thinking> Tool text. Result.';
      const preToolTexts = ['Tool text.'];
      expect(stripAllTimelineText(content, preToolTexts, true)).toBe('Result.');
    });

    it('should handle content without thinking', () => {
      const content = 'Tool text. Result.';
      const preToolTexts = ['Tool text.'];
      expect(stripAllTimelineText(content, preToolTexts, false)).toBe('Result.');
    });

    it('should handle empty pre-tool texts', () => {
      const content = '<thinking>thought</thinking> Result.';
      expect(stripAllTimelineText(content, [], true)).toBe('Result.');
    });

    it('should clean up multiple newlines', () => {
      const content = 'Result\n\n\n\nMore';
      expect(stripAllTimelineText(content, [], false)).toBe('Result\n\nMore');
    });
  });
});
