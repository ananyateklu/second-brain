/**
 * PieChartTooltip Component Tests
 * Unit tests for the PieChartTooltip component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PieChartTooltip } from '../PieChartTooltip';

// Mock dashboard utils
vi.mock('../../utils/dashboard-utils', () => ({
  formatTokenCount: (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  },
}));

describe('PieChartTooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should return null when not active', () => {
      const { container } = render(
        <PieChartTooltip active={false} payload={[{ name: 'Model', value: 10 }]} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should return null when payload is empty', () => {
      const { container } = render(
        <PieChartTooltip active={true} payload={[]} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should return null when payload is undefined', () => {
      const { container } = render(
        <PieChartTooltip active={true} payload={undefined} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render tooltip when active with payload', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'GPT-4', value: 100 }]}
        />
      );
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
    });
  });

  // ============================================
  // Model Name Display Tests
  // ============================================
  describe('model name display', () => {
    it('should display model name from payload', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Claude-3', value: 50 }]}
        />
      );
      expect(screen.getByText('Claude-3')).toBeInTheDocument();
    });

    it('should use label as fallback when name is missing', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ value: 50 }]}
          label="Fallback Label"
        />
      );
      expect(screen.getByText('Fallback Label')).toBeInTheDocument();
    });

    it('should display empty string when no name or label', () => {
      const { container } = render(
        <PieChartTooltip
          active={true}
          payload={[{ value: 50 }]}
        />
      );
      // Model name should be empty but tooltip should still render
      expect(container.firstChild).not.toBeNull();
    });
  });

  // ============================================
  // Conversations Display Tests
  // ============================================
  describe('conversations display', () => {
    it('should display conversations count', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model', value: 150 }]}
        />
      );
      expect(screen.getByText('Conversations:')).toBeInTheDocument();
      expect(screen.getByText(/150/)).toBeInTheDocument();
    });

    it('should display conversations percentage when totalConversations provided', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model', value: 25 }]}
          totalConversations={100}
        />
      );
      expect(screen.getByText(/25\.0%/)).toBeInTheDocument();
    });

    it('should display 0% when totalConversations is 0', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model', value: 25 }]}
          totalConversations={0}
        />
      );
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should format large conversation counts with locale string', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model', value: 1500 }]}
        />
      );
      expect(screen.getByText(/1,500/)).toBeInTheDocument();
    });
  });

  // ============================================
  // Token Usage Tests
  // ============================================
  describe('token usage', () => {
    it('should display tokens when model has token data', () => {
      const modelDataMap = new Map([
        ['GPT-4', { conversations: 100, tokens: 50000 }]
      ]);

      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'GPT-4', value: 100 }]}
          modelDataMap={modelDataMap}
          totalTokens={100000}
        />
      );
      expect(screen.getByText('Tokens:')).toBeInTheDocument();
      expect(screen.getByText(/50\.0K/)).toBeInTheDocument();
    });

    it('should not display tokens section when tokens is 0', () => {
      const modelDataMap = new Map([
        ['GPT-4', { conversations: 100, tokens: 0 }]
      ]);

      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'GPT-4', value: 100 }]}
          modelDataMap={modelDataMap}
        />
      );
      expect(screen.queryByText('Tokens:')).not.toBeInTheDocument();
    });

    it('should display token percentage when totalTokens provided', () => {
      const modelDataMap = new Map([
        ['Model', { conversations: 50, tokens: 25000 }]
      ]);

      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model', value: 50 }]}
          modelDataMap={modelDataMap}
          totalTokens={100000}
        />
      );
      expect(screen.getByText(/25\.0%/)).toBeInTheDocument();
    });

    it('should use value as tokens when isTokenUsage is true and no modelDataMap', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model', value: 10000 }]}
          isTokenUsage={true}
          totalTokens={50000}
        />
      );
      // When isTokenUsage is true, value is interpreted as tokens
      expect(screen.getByText(/10\.0K/)).toBeInTheDocument();
    });
  });

  // ============================================
  // Model Data Map Tests
  // ============================================
  describe('modelDataMap integration', () => {
    it('should use modelDataMap for conversation and token data', () => {
      const modelDataMap = new Map([
        ['Claude', { conversations: 200, tokens: 75000 }]
      ]);

      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Claude', value: 100 }]}
          modelDataMap={modelDataMap}
          totalConversations={1000}
          totalTokens={500000}
        />
      );

      // Should use modelDataMap values, not payload value
      expect(screen.getByText(/200/)).toBeInTheDocument();
      expect(screen.getByText(/75\.0K/)).toBeInTheDocument();
    });

    it('should fall back to payload value when model not in map', () => {
      const modelDataMap = new Map([
        ['OtherModel', { conversations: 50, tokens: 1000 }]
      ]);

      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Unknown', value: 30 }]}
          modelDataMap={modelDataMap}
        />
      );

      expect(screen.getByText(/30/)).toBeInTheDocument();
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have tooltip container styling', () => {
      const { container } = render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model', value: 10 }]}
        />
      );

      const tooltip = container.firstChild as HTMLElement;
      expect(tooltip).toHaveStyle({ borderRadius: '8px' });
      expect(tooltip).toHaveStyle({ padding: '10px 14px' });
      expect(tooltip).toHaveStyle({ minWidth: '180px' });
    });

    it('should use CSS variables for colors', () => {
      const { container } = render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model', value: 10 }]}
        />
      );

      const tooltip = container.firstChild as HTMLElement;
      expect(tooltip).toHaveStyle({ backgroundColor: 'var(--surface-elevated)' });
      expect(tooltip).toHaveStyle({ border: '1px solid var(--border)' });
    });

    it('should have bold model name', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Bold Model', value: 10 }]}
        />
      );

      const modelName = screen.getByText('Bold Model');
      expect(modelName).toHaveStyle({ fontWeight: '600' });
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle undefined value in payload', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model' }]}
        />
      );
      // Should default to 0
      expect(screen.getByText(/\(0%\)/)).toBeInTheDocument();
    });

    it('should handle very large token counts', () => {
      const modelDataMap = new Map([
        ['Model', { conversations: 1000, tokens: 5000000 }]
      ]);

      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model', value: 1000 }]}
          modelDataMap={modelDataMap}
          totalTokens={10000000}
        />
      );

      expect(screen.getByText(/5\.0M/)).toBeInTheDocument();
    });

    it('should handle single digit percentages', () => {
      render(
        <PieChartTooltip
          active={true}
          payload={[{ name: 'Model', value: 5 }]}
          totalConversations={1000}
        />
      );

      expect(screen.getByText(/0\.5%/)).toBeInTheDocument();
    });
  });
});
