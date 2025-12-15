/**
 * ModelUsageSection Component Tests
 * Unit tests for the ModelUsageSection component with pie charts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelUsageSection } from '../ModelUsageSection';

// Mock Recharts
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data, dataKey }: { data: unknown[]; dataKey: string }) => (
    <div data-testid={`pie-${dataKey}`} data-count={data?.length || 0} />
  ),
  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="pie-cell" data-fill={fill} />
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

// Mock PieChartTooltip
vi.mock('../PieChartTooltip', () => ({
  PieChartTooltip: () => <div data-testid="custom-tooltip" />,
}));

// Mock dashboard utils
vi.mock('../../utils/dashboard-utils', () => ({
  TIME_RANGE_OPTIONS: [
    { days: 7, label: '7D' },
    { days: 30, label: '30D' },
    { days: 90, label: '90D' },
    { days: 180, label: '6M' },
    { days: 365, label: '1Y' },
    { days: 0, label: 'All' },
  ],
  formatTokenCount: (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  },
  getProviderFromModelName: (modelName: string) => {
    if (modelName.toLowerCase().includes('gpt')) return 'OpenAI';
    if (modelName.toLowerCase().includes('claude')) return 'Anthropic';
    if (modelName.toLowerCase().includes('gemini')) return 'Google';
    return 'Other';
  },
}));

// Helper to create mock model usage data
function createMockModelUsageData() {
  return [
    { name: 'GPT-4', originalName: 'gpt-4', value: 100, tokens: 50000 },
    { name: 'Claude-3', originalName: 'claude-3-opus', value: 80, tokens: 40000 },
    { name: 'Gemini Pro', originalName: 'gemini-pro', value: 50, tokens: 25000 },
  ];
}

function createMockFilteredData() {
  return {
    data: createMockModelUsageData(),
    allFilteredModels: createMockModelUsageData(),
    totalConversations: 230,
    totalTokens: 115000,
    modelDataMap: new Map([
      ['GPT-4', { conversations: 100, tokens: 50000 }],
      ['Claude-3', { conversations: 80, tokens: 40000 }],
      ['Gemini Pro', { conversations: 50, tokens: 25000 }],
    ]),
  };
}

describe('ModelUsageSection', () => {
  const mockGetFilteredModelUsageData = vi.fn(() => createMockFilteredData());
  const mockColors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

  const defaultProps = {
    modelUsageData: createMockModelUsageData(),
    colors: mockColors,
    getFilteredModelUsageData: mockGetFilteredModelUsageData,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFilteredModelUsageData.mockReturnValue(createMockFilteredData());
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render section title', () => {
      render(<ModelUsageSection {...defaultProps} />);
      expect(screen.getByText('Model Usage Distribution')).toBeInTheDocument();
    });

    it('should render both pie charts', () => {
      render(<ModelUsageSection {...defaultProps} />);

      // Should have "By Conversation" and "By Token Usage" charts
      expect(screen.getByText('By Conversation')).toBeInTheDocument();
      expect(screen.getByText('By Token Usage')).toBeInTheDocument();
    });

    it('should render 2 pie chart containers', () => {
      render(<ModelUsageSection {...defaultProps} />);

      const pieCharts = screen.getAllByTestId('pie-chart');
      expect(pieCharts.length).toBe(2);
    });

    it('should render section icon', () => {
      const { container } = render(<ModelUsageSection {...defaultProps} />);

      const icon = container.querySelector('svg.h-5.w-5');
      expect(icon).toBeInTheDocument();
    });

    it('should return null when modelUsageData is empty', () => {
      const { container } = render(
        <ModelUsageSection {...defaultProps} modelUsageData={[]} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // ============================================
  // Provider Sidebar Tests
  // ============================================
  describe('provider sidebar', () => {
    it('should render providers grouped by name', () => {
      render(<ModelUsageSection {...defaultProps} />);

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
    });

    it('should show model names within providers', () => {
      render(<ModelUsageSection {...defaultProps} />);

      // Model names appear in both sidebar and legend, so use getAllByText
      const gpt4Elements = screen.getAllByText('GPT-4');
      const claude3Elements = screen.getAllByText('Claude-3');
      const geminiElements = screen.getAllByText('Gemini Pro');

      expect(gpt4Elements.length).toBeGreaterThanOrEqual(1);
      expect(claude3Elements.length).toBeGreaterThanOrEqual(1);
      expect(geminiElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should show message counts next to providers', () => {
      render(<ModelUsageSection {...defaultProps} />);

      // Each model shows "X msgs"
      const msgLabels = screen.getAllByText(/\d+ msgs/);
      expect(msgLabels.length).toBeGreaterThan(0);
    });

    it('should show token counts for models with tokens', () => {
      render(<ModelUsageSection {...defaultProps} />);

      // Token counts like "50.0K tokens"
      const tokenLabels = screen.getAllByText(/\d+\.?\d*K? tokens/);
      expect(tokenLabels.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Time Range Filter Tests
  // ============================================
  describe('time range filters', () => {
    it('should render all time range buttons', () => {
      render(<ModelUsageSection {...defaultProps} />);

      expect(screen.getByText('7D')).toBeInTheDocument();
      expect(screen.getByText('30D')).toBeInTheDocument();
      expect(screen.getByText('90D')).toBeInTheDocument();
      expect(screen.getByText('6M')).toBeInTheDocument();
      expect(screen.getByText('1Y')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('should highlight default time range (30 days)', () => {
      render(<ModelUsageSection {...defaultProps} />);

      const button30D = screen.getByText('30D');
      expect(button30D).toHaveStyle({ backgroundColor: 'var(--color-brand-600)' });
    });

    it('should call getFilteredModelUsageData with selected time range', () => {
      render(<ModelUsageSection {...defaultProps} />);

      expect(mockGetFilteredModelUsageData).toHaveBeenCalledWith(30, 0.05);
    });

    it('should update time range when button clicked', () => {
      render(<ModelUsageSection {...defaultProps} />);

      fireEvent.click(screen.getByText('7D'));

      // After clicking, the function should be called with new time range
      expect(mockGetFilteredModelUsageData).toHaveBeenCalledWith(7, 0.05);
    });
  });

  // ============================================
  // Interactive Legend Tests
  // ============================================
  describe('interactive legend', () => {
    it('should render legend with model names', () => {
      render(<ModelUsageSection {...defaultProps} />);

      // Legend should show model names with message counts
      const legendButtons = screen.getAllByRole('button');
      expect(legendButtons.length).toBeGreaterThan(6); // Time range buttons + legend buttons
    });

    it('should toggle model visibility when legend clicked', () => {
      render(<ModelUsageSection {...defaultProps} />);

      // Find a legend button (not a time range button)
      const legendButtons = screen.getAllByText(/msgs\)$/);
      const firstLegendButton = legendButtons[0].closest('button');

      if (firstLegendButton) {
        fireEvent.click(firstLegendButton);

        // Button should be visually dimmed (opacity: 0.5)
        expect(firstLegendButton).toHaveStyle({ opacity: '0.5' });
      }
    });

    it('should show color dots in legend', () => {
      const { container } = render(<ModelUsageSection {...defaultProps} />);

      const colorDots = container.querySelectorAll('.w-3.h-3.rounded-full');
      expect(colorDots.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Animation Props Tests
  // ============================================
  describe('animation props', () => {
    it('should accept animationDelay prop', () => {
      const { container } = render(
        <ModelUsageSection {...defaultProps} animationDelay={200} />
      );

      expect(container.firstChild).not.toBeNull();
    });

    it('should apply opacity based on isAnimationReady', () => {
      const { container } = render(
        <ModelUsageSection {...defaultProps} isAnimationReady={false} />
      );

      const section = container.querySelector('.rounded-3xl');
      expect(section).toHaveStyle({ opacity: '0' });
    });

    it('should set opacity to 1 when animation is ready', () => {
      const { container } = render(
        <ModelUsageSection {...defaultProps} isAnimationReady={true} />
      );

      const section = container.querySelector('.rounded-3xl');
      expect(section).toHaveStyle({ opacity: '1' });
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have rounded corners on container', () => {
      const { container } = render(<ModelUsageSection {...defaultProps} />);

      const section = container.querySelector('.rounded-3xl');
      expect(section).toBeInTheDocument();
    });

    it('should have border styling', () => {
      const { container } = render(<ModelUsageSection {...defaultProps} />);

      const section = container.querySelector('.border');
      expect(section).toBeInTheDocument();
    });

    it('should render ambient glow effect', () => {
      const { container } = render(<ModelUsageSection {...defaultProps} />);

      const glow = container.querySelector('.blur-3xl');
      expect(glow).toBeInTheDocument();
    });

    it('should use 3-column grid layout', () => {
      const { container } = render(<ModelUsageSection {...defaultProps} />);

      const grid = container.querySelector('.lg\\:grid-cols-3');
      expect(grid).toBeInTheDocument();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle single model', () => {
      mockGetFilteredModelUsageData.mockReturnValue({
        data: [{ name: 'GPT-4', originalName: 'gpt-4', value: 100, tokens: 50000 }],
        allFilteredModels: [{ name: 'GPT-4', originalName: 'gpt-4', value: 100, tokens: 50000 }],
        totalConversations: 100,
        totalTokens: 50000,
        modelDataMap: new Map([['GPT-4', { conversations: 100, tokens: 50000 }]]),
      });

      render(
        <ModelUsageSection
          {...defaultProps}
          modelUsageData={[{ name: 'GPT-4', originalName: 'gpt-4', value: 100, tokens: 50000 }]}
        />
      );

      // Model name appears in both sidebar and legend
      const gpt4Elements = screen.getAllByText('GPT-4');
      expect(gpt4Elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle models with zero tokens', () => {
      mockGetFilteredModelUsageData.mockReturnValue({
        data: [{ name: 'TestModel', originalName: 'test-model', value: 10, tokens: 0 }],
        allFilteredModels: [{ name: 'TestModel', originalName: 'test-model', value: 10, tokens: 0 }],
        totalConversations: 10,
        totalTokens: 0,
        modelDataMap: new Map([['TestModel', { conversations: 10, tokens: 0 }]]),
      });

      render(
        <ModelUsageSection
          {...defaultProps}
          modelUsageData={[{ name: 'TestModel', originalName: 'test-model', value: 10, tokens: 0 }]}
        />
      );

      // Model name appears in both sidebar and legend
      const modelElements = screen.getAllByText('TestModel');
      expect(modelElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should reset hidden models when time range changes', () => {
      render(<ModelUsageSection {...defaultProps} />);

      // First hide a model
      const legendButtons = screen.getAllByText(/msgs\)$/);
      const firstLegendButton = legendButtons[0].closest('button');

      if (firstLegendButton) {
        fireEvent.click(firstLegendButton);
        expect(firstLegendButton).toHaveStyle({ opacity: '0.5' });

        // Change time range
        fireEvent.click(screen.getByText('7D'));

        // Hidden models should be reset (re-render clears the state)
        expect(firstLegendButton).toHaveStyle({ opacity: '1' });
      }
    });
  });
});
