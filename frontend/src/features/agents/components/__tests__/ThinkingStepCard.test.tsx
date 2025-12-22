/**
 * ThinkingStepCard Component Tests
 * Unit tests for the ThinkingStepCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThinkingStepCard } from '../ThinkingStepCard';
import type { ThinkingStep } from '../../../../types/agent';

// Mock the utils
vi.mock('../../../../utils/note-reference-utils', () => ({
  splitTextWithNoteReferences: vi.fn((content: string) => [
    { type: 'text', content },
  ]),
}));

// Mock InlineNoteReference
vi.mock('../../../chat/components/InlineNoteReference', () => ({
  InlineNoteReference: ({ noteId, noteTitle }: { noteId: string; noteTitle?: string }) => (
    <span data-testid="note-reference" data-note-id={noteId}>
      {noteTitle || noteId}
    </span>
  ),
}));

// Helper to create a mock thinking step
function createMockThinkingStep(overrides: Partial<ThinkingStep> = {}): ThinkingStep {
  return {
    content: 'This is a test thinking step content.',
    timestamp: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  };
}

describe('ThinkingStepCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render "Thinking Process" title', () => {
      render(<ThinkingStepCard step={createMockThinkingStep()} />);
      expect(screen.getByText('Thinking Process')).toBeInTheDocument();
    });

    it('should render timestamp', () => {
      const step = createMockThinkingStep({
        timestamp: new Date('2024-01-15T14:30:00Z'),
      });
      render(<ThinkingStepCard step={step} />);
      // Check that the time is displayed (format depends on locale)
      const button = screen.getByRole('button');
      expect(button.textContent).toContain(':');
    });

    it('should render timeline icon', () => {
      const { container } = render(<ThinkingStepCard step={createMockThinkingStep()} />);
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });

    it('should have proper styling classes', () => {
      const { container } = render(<ThinkingStepCard step={createMockThinkingStep()} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('relative', 'pl-12', 'py-2');
    });
  });

  // ============================================
  // Expand/Collapse Tests
  // ============================================
  describe('expand and collapse', () => {
    it('should be collapsed by default when not streaming', () => {
      render(<ThinkingStepCard step={createMockThinkingStep()} />);
      expect(screen.queryByText('This is a test thinking step content.')).not.toBeInTheDocument();
    });

    it('should expand when clicked', () => {
      render(<ThinkingStepCard step={createMockThinkingStep()} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('This is a test thinking step content.')).toBeInTheDocument();
    });

    it('should collapse when clicked again', () => {
      render(<ThinkingStepCard step={createMockThinkingStep()} />);

      const button = screen.getByRole('button');
      fireEvent.click(button); // Expand
      expect(screen.getByText('This is a test thinking step content.')).toBeInTheDocument();

      fireEvent.click(button); // Collapse
      expect(screen.queryByText('This is a test thinking step content.')).not.toBeInTheDocument();
    });

    it('should show chevron icon that rotates when expanded', () => {
      render(<ThinkingStepCard step={createMockThinkingStep()} />);

      // Find the chevron icon (last svg in button)
      const button = screen.getByRole('button');
      const chevron = button.querySelector('svg:last-of-type');

      expect(chevron).not.toHaveClass('rotate-180');

      fireEvent.click(button);
      expect(chevron).toHaveClass('rotate-180');
    });
  });

  // ============================================
  // Streaming Tests
  // ============================================
  describe('streaming behavior', () => {
    it('should auto-expand when isStreaming is true', () => {
      render(<ThinkingStepCard step={createMockThinkingStep()} isStreaming={true} />);
      expect(screen.getByText('This is a test thinking step content.')).toBeInTheDocument();
    });

    it('should show streaming pulse indicator when streaming', () => {
      const { container } = render(
        <ThinkingStepCard step={createMockThinkingStep()} isStreaming={true} />
      );

      const pulseIndicator = container.querySelector('.animate-pulse.w-1\\.5.h-1\\.5');
      expect(pulseIndicator).toBeInTheDocument();
    });

    it('should show cursor animation when streaming and expanded', () => {
      const { container } = render(
        <ThinkingStepCard step={createMockThinkingStep()} isStreaming={true} />
      );

      // The cursor is a taller element with animate-pulse
      const cursor = container.querySelector('.w-1\\.5.h-3.animate-pulse');
      expect(cursor).toBeInTheDocument();
    });

    it('should not show streaming indicator when not streaming', () => {
      render(<ThinkingStepCard step={createMockThinkingStep()} isStreaming={false} />);

      // Expand to see content
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should not have the cursor indicator
      const contentArea = screen.getByText('This is a test thinking step content.').closest('div');
      const cursor = contentArea?.querySelector('.w-1\\.5.h-3.animate-pulse');
      expect(cursor).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Content Rendering Tests
  // ============================================
  describe('content rendering', () => {
    it('should trim content before displaying', () => {
      const step = createMockThinkingStep({
        content: '   Content with whitespace   ',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      expect(screen.getByText('Content with whitespace')).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      const step = createMockThinkingStep({ content: '' });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      // Should still render the card structure
      expect(screen.getByText('Thinking Process')).toBeInTheDocument();
    });

    it('should handle multiline content', () => {
      const step = createMockThinkingStep({
        content: 'Line 1\nLine 2\nLine 3',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('should render markdown bold text', () => {
      const step = createMockThinkingStep({
        content: 'This is **bold** text',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      const boldElement = screen.getByText('bold');
      expect(boldElement.tagName.toLowerCase()).toBe('strong');
    });

    it('should render markdown italic text', () => {
      const step = createMockThinkingStep({
        content: 'This is *italic* text',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      const italicElement = screen.getByText('italic');
      expect(italicElement.tagName.toLowerCase()).toBe('em');
    });

    it('should render markdown lists', () => {
      const step = createMockThinkingStep({
        content: '- Item 1\n- Item 2\n- Item 3',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should render ordered lists', () => {
      const step = createMockThinkingStep({
        content: '1. First\n2. Second\n3. Third',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      expect(screen.getByText('First')).toBeInTheDocument();
    });

    it('should render inline code', () => {
      const step = createMockThinkingStep({
        content: 'Use the `console.log` function',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      const codeElement = screen.getByText('console.log');
      expect(codeElement.tagName.toLowerCase()).toBe('code');
    });

    it('should render code blocks', () => {
      const step = createMockThinkingStep({
        content: '```javascript\nconst x = 1;\n```',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      expect(screen.getByText(/const x = 1/)).toBeInTheDocument();
    });

    it('should render blockquotes', () => {
      const step = createMockThinkingStep({
        content: '> This is a quote',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      const quote = screen.getByText('This is a quote');
      expect(quote.closest('blockquote')).toBeInTheDocument();
    });

    it('should render links with target="_blank"', () => {
      const step = createMockThinkingStep({
        content: 'Visit [Google](https://google.com)',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      const link = screen.getByRole('link', { name: 'Google' });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // ============================================
  // Note References Tests
  // ============================================
  describe('note references', () => {
    it('should handle content with note references', async () => {
      const { splitTextWithNoteReferences } = await import('../../../../utils/note-reference-utils');

      // Mock to return note reference
      vi.mocked(splitTextWithNoteReferences).mockReturnValue([
        { type: 'text', content: 'Check ' },
        { type: 'note-reference', noteId: 'note-123', noteTitle: 'My Note', content: '' },
        { type: 'text', content: ' for details' },
      ]);

      const step = createMockThinkingStep({
        content: 'Check [[note-123]] for details',
      });
      render(<ThinkingStepCard step={step} isStreaming={true} />);

      expect(screen.getByTestId('note-reference')).toBeInTheDocument();
      expect(screen.getByTestId('note-reference')).toHaveAttribute('data-note-id', 'note-123');
    });
  });

  // ============================================
  // Memoization Tests
  // ============================================
  describe('memoization', () => {
    it('should be memoized component', () => {
      // ThinkingStepCard is wrapped with memo, verify the component renders
      const step = createMockThinkingStep();
      const { rerender } = render(<ThinkingStepCard step={step} />);

      // Re-render with same props should work
      rerender(<ThinkingStepCard step={step} />);
      expect(screen.getByText('Thinking Process')).toBeInTheDocument();
    });
  });

  // ============================================
  // Style Tests
  // ============================================
  describe('styling', () => {
    it('should have content area with proper styling when expanded', () => {
      const { container } = render(<ThinkingStepCard step={createMockThinkingStep()} isStreaming={true} />);

      // Find the content area (the div that wraps the content)
      const contentArea = container.querySelector('.mt-2.p-3');
      expect(contentArea).toBeInTheDocument();
      expect(contentArea).toHaveClass('rounded-lg', 'text-xs', 'font-mono');
    });

    it('should have timeline icon container', () => {
      const { container } = render(<ThinkingStepCard step={createMockThinkingStep()} />);

      const iconContainer = container.querySelector('.absolute.left-\\[7px\\]');
      expect(iconContainer).toBeInTheDocument();
      // TimelineStatusIcon has rounded-full inside
      expect(iconContainer?.querySelector('.rounded-full')).toBeInTheDocument();
    });
  });
});
