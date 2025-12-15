/**
 * CodeExecutionCard Component Tests
 * Unit tests for the CodeExecutionCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeExecutionCard } from '../CodeExecutionCard';
import type { CodeExecutionResult } from '../../../../types/chat';

// Helper to create mock code execution result
function createMockResult(overrides: Partial<CodeExecutionResult> = {}): CodeExecutionResult {
  return {
    code: 'print("Hello, World!")',
    language: 'python',
    output: 'Hello, World!',
    success: true,
    ...overrides,
  };
}

describe('CodeExecutionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render "Code Execution" title', () => {
      render(<CodeExecutionCard result={createMockResult()} />);
      expect(screen.getByText('Code Execution')).toBeInTheDocument();
    });

    it('should render language label', () => {
      render(<CodeExecutionCard result={createMockResult({ language: 'python' })} />);
      expect(screen.getByText('python')).toBeInTheDocument();
    });

    it('should render "Success" badge when execution succeeded', () => {
      render(<CodeExecutionCard result={createMockResult({ success: true })} />);
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should render "Failed" badge when execution failed', () => {
      render(<CodeExecutionCard result={createMockResult({ success: false })} />);
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('should render timeline icon', () => {
      const { container } = render(<CodeExecutionCard result={createMockResult()} />);
      const iconContainer = container.querySelector('.absolute.left-2\\.5');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it('should use success color for icon when successful', () => {
      const { container } = render(<CodeExecutionCard result={createMockResult({ success: true })} />);
      const svg = container.querySelector('.absolute svg');
      expect(svg).toHaveStyle({ color: 'var(--color-success)' });
    });

    it('should use error color for icon when failed', () => {
      const { container } = render(<CodeExecutionCard result={createMockResult({ success: false })} />);
      const svg = container.querySelector('.absolute svg');
      expect(svg).toHaveStyle({ color: 'var(--color-error)' });
    });
  });

  // ============================================
  // Expand/Collapse Tests
  // ============================================
  describe('expand and collapse', () => {
    it('should be expanded by default', () => {
      render(<CodeExecutionCard result={createMockResult()} />);
      // Should show tabs
      expect(screen.getByRole('button', { name: 'Code' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Output' })).toBeInTheDocument();
    });

    it('should collapse when header is clicked', () => {
      render(<CodeExecutionCard result={createMockResult()} />);

      // Find and click the header button (first button)
      const headerButton = screen.getAllByRole('button')[0];
      fireEvent.click(headerButton);

      // Tabs should be hidden
      expect(screen.queryByRole('button', { name: 'Code' })).not.toBeInTheDocument();
    });

    it('should expand when clicked again', () => {
      render(<CodeExecutionCard result={createMockResult()} />);

      const headerButton = screen.getAllByRole('button')[0];
      fireEvent.click(headerButton); // Collapse
      fireEvent.click(headerButton); // Expand

      expect(screen.getByRole('button', { name: 'Code' })).toBeInTheDocument();
    });

    it('should show chevron rotation when expanded', () => {
      const { container } = render(<CodeExecutionCard result={createMockResult()} />);

      const headerButton = screen.getAllByRole('button')[0];
      const chevron = headerButton.querySelector('svg:last-of-type');

      expect(chevron).toHaveClass('rotate-180');

      fireEvent.click(headerButton);
      expect(chevron).not.toHaveClass('rotate-180');
    });
  });

  // ============================================
  // Tab Switching Tests
  // ============================================
  describe('tab switching', () => {
    it('should show Code tab content by default', () => {
      render(<CodeExecutionCard result={createMockResult({ code: 'const x = 1;' })} />);
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('should switch to Output tab when clicked', () => {
      render(
        <CodeExecutionCard result={createMockResult({ code: 'print(42)', output: '42' })} />
      );

      const outputTab = screen.getByRole('button', { name: 'Output' });
      fireEvent.click(outputTab);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should switch back to Code tab when clicked', () => {
      render(
        <CodeExecutionCard result={createMockResult({ code: 'my_code()', output: 'result' })} />
      );

      // Switch to output
      fireEvent.click(screen.getByRole('button', { name: 'Output' }));
      expect(screen.getByText('result')).toBeInTheDocument();

      // Switch back to code
      fireEvent.click(screen.getByRole('button', { name: 'Code' }));
      expect(screen.getByText('my_code()')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      render(<CodeExecutionCard result={createMockResult()} />);

      const codeTab = screen.getByRole('button', { name: 'Code' });
      const outputTab = screen.getByRole('button', { name: 'Output' });

      // Code tab should be active initially
      expect(codeTab).toHaveStyle({ backgroundColor: 'var(--color-primary-alpha)' });
      expect(outputTab).toHaveStyle({ backgroundColor: 'var(--surface-elevated)' });

      // Click output tab
      fireEvent.click(outputTab);
      expect(outputTab).toHaveStyle({ backgroundColor: 'var(--color-primary-alpha)' });
      expect(codeTab).toHaveStyle({ backgroundColor: 'var(--surface-elevated)' });
    });
  });

  // ============================================
  // Code Display Tests
  // ============================================
  describe('code display', () => {
    it('should display code in pre element', () => {
      render(<CodeExecutionCard result={createMockResult({ code: 'x = 5' })} />);
      const preElement = screen.getByText('x = 5').closest('pre');
      expect(preElement).toBeInTheDocument();
    });

    it('should show "No code available" when code is empty', () => {
      render(<CodeExecutionCard result={createMockResult({ code: '' })} />);
      expect(screen.getByText('No code available')).toBeInTheDocument();
    });

    it('should preserve whitespace in code', () => {
      const { container } = render(
        <CodeExecutionCard result={createMockResult({ code: 'def foo():\n    pass' })} />
      );
      const pre = container.querySelector('pre');
      expect(pre).toHaveClass('whitespace-pre-wrap');
    });
  });

  // ============================================
  // Output Display Tests
  // ============================================
  describe('output display', () => {
    it('should display output when successful', () => {
      render(
        <CodeExecutionCard result={createMockResult({ output: 'Output text', success: true })} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Output' }));
      expect(screen.getByText('Output text')).toBeInTheDocument();
    });

    it('should show "No output" when output is empty', () => {
      render(
        <CodeExecutionCard result={createMockResult({ output: '', success: true })} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Output' }));
      expect(screen.getByText('No output')).toBeInTheDocument();
    });

    it('should show error message when execution failed', () => {
      render(
        <CodeExecutionCard
          result={createMockResult({
            success: false,
            errorMessage: 'NameError: name "x" is not defined',
          })}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Output' }));
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('NameError: name "x" is not defined')).toBeInTheDocument();
    });

    it('should show output as error when no errorMessage but failed', () => {
      render(
        <CodeExecutionCard
          result={createMockResult({
            success: false,
            output: 'Error occurred',
            errorMessage: undefined,
          })}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Output' }));
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    it('should show "Execution failed" when no error info available', () => {
      render(
        <CodeExecutionCard
          result={createMockResult({
            success: false,
            output: '',
            errorMessage: undefined,
          })}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Output' }));
      expect(screen.getByText('Execution failed')).toBeInTheDocument();
    });
  });

  // ============================================
  // Streaming Tests
  // ============================================
  describe('streaming behavior', () => {
    it('should show streaming indicator in header when streaming', () => {
      const { container } = render(
        <CodeExecutionCard result={createMockResult()} isStreaming={true} />
      );

      const headerButton = screen.getAllByRole('button')[0];
      const pulseIndicator = headerButton.querySelector('.animate-pulse.w-1\\.5.h-1\\.5');
      expect(pulseIndicator).toBeInTheDocument();
    });

    it('should show cursor in content area when streaming', () => {
      const { container } = render(
        <CodeExecutionCard result={createMockResult()} isStreaming={true} />
      );

      const cursor = container.querySelector('.w-1\\.5.h-3.animate-pulse');
      expect(cursor).toBeInTheDocument();
    });

    it('should not show streaming indicators when not streaming', () => {
      const { container } = render(
        <CodeExecutionCard result={createMockResult()} isStreaming={false} />
      );

      const headerButton = screen.getAllByRole('button')[0];
      const pulseInHeader = headerButton.querySelector('.animate-pulse.w-1\\.5.h-1\\.5');
      expect(pulseInHeader).not.toBeInTheDocument();

      const cursor = container.querySelector('.w-1\\.5.h-3.animate-pulse');
      expect(cursor).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have proper wrapper classes', () => {
      const { container } = render(<CodeExecutionCard result={createMockResult()} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('relative', 'pl-12', 'py-2');
    });

    it('should have monospace font for code', () => {
      const { container } = render(<CodeExecutionCard result={createMockResult()} />);
      const codeArea = container.querySelector('.font-mono');
      expect(codeArea).toBeInTheDocument();
    });

    it('should have success badge styling', () => {
      render(<CodeExecutionCard result={createMockResult({ success: true })} />);
      const badge = screen.getByText('Success');
      expect(badge).toHaveStyle({ backgroundColor: 'var(--color-success-alpha)' });
    });

    it('should have error badge styling', () => {
      render(<CodeExecutionCard result={createMockResult({ success: false })} />);
      const badge = screen.getByText('Failed');
      expect(badge).toHaveStyle({ backgroundColor: 'var(--color-error-alpha)' });
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle very long code', () => {
      const longCode = 'x = 1\n'.repeat(100);
      render(<CodeExecutionCard result={createMockResult({ code: longCode })} />);

      const codeArea = screen.getByText(/x = 1/).closest('div');
      expect(codeArea).toHaveClass('overflow-x-auto');
    });

    it('should handle special characters in code', () => {
      render(
        <CodeExecutionCard result={createMockResult({ code: '<script>alert("xss")</script>' })} />
      );
      expect(screen.getByText(/<script>alert\("xss"\)<\/script>/)).toBeInTheDocument();
    });

    it('should handle unicode in output', () => {
      render(
        <CodeExecutionCard result={createMockResult({ output: '你好世界 🌍' })} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Output' }));
      expect(screen.getByText('你好世界 🌍')).toBeInTheDocument();
    });
  });
});
