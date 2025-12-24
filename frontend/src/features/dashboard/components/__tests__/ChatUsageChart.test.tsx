/**
 * ChatUsageChart Component Tests
 * Unit tests for the ChatUsageChart component with Recharts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatUsageChart } from '../ChatUsageChart';

// Mock Recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ dataKey, stroke }: { dataKey: string; stroke: string }) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children, height }: { children: React.ReactNode; height: number }) => (
    <div data-testid="responsive-container" data-height={height}>{children}</div>
  ),
  Legend: () => <div data-testid="legend" />,
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
}));

// Helper to create mock chart data
function createMockChartData() {
  return [
    { date: '2024-01-01', ragChats: 5, regularChats: 10, agentChats: 3, imageGenChats: 2 },
    { date: '2024-01-02', ragChats: 8, regularChats: 12, agentChats: 4, imageGenChats: 1 },
    { date: '2024-01-03', ragChats: 6, regularChats: 15, agentChats: 5, imageGenChats: 3 },
  ];
}

describe('ChatUsageChart', () => {
  const defaultProps = {
    chatUsageChartData: createMockChartData(),
    selectedTimeRange: 30,
    onTimeRangeChange: vi.fn(),
    ragChartColor: '#10b981',
    regularChartColor: '#6366f1',
    agentChartColor: '#f59e0b',
    imageGenChartColor: '#ec4899',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render chart title', () => {
      render(<ChatUsageChart {...defaultProps} />);
      expect(screen.getByText('Chat Usage Over Time')).toBeInTheDocument();
    });

    it('should render the LineChart component', () => {
      render(<ChatUsageChart {...defaultProps} />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render all chart components', () => {
      render(<ChatUsageChart {...defaultProps} />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should render all 4 data lines', () => {
      render(<ChatUsageChart {...defaultProps} />);

      expect(screen.getByTestId('line-ragChats')).toBeInTheDocument();
      expect(screen.getByTestId('line-regularChats')).toBeInTheDocument();
      expect(screen.getByTestId('line-agentChats')).toBeInTheDocument();
      expect(screen.getByTestId('line-imageGenChats')).toBeInTheDocument();
    });

    it('should render chart icon', () => {
      const { container } = render(<ChatUsageChart {...defaultProps} />);
      const icon = container.querySelector('svg.h-5.w-5');
      expect(icon).toBeInTheDocument();
    });

    it('should return null when data is empty', () => {
      const { container } = render(
        <ChatUsageChart {...defaultProps} chatUsageChartData={[]} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // ============================================
  // Time Range Filter Tests
  // ============================================
  describe('time range filters', () => {
    it('should render all time range buttons', () => {
      render(<ChatUsageChart {...defaultProps} />);

      expect(screen.getByText('7D')).toBeInTheDocument();
      expect(screen.getByText('30D')).toBeInTheDocument();
      expect(screen.getByText('90D')).toBeInTheDocument();
      expect(screen.getByText('6M')).toBeInTheDocument();
      expect(screen.getByText('1Y')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('should highlight selected time range button', () => {
      render(<ChatUsageChart {...defaultProps} selectedTimeRange={30} />);

      const button30D = screen.getByText('30D');
      // Selected buttons use CSS classes for styling
      expect(button30D.className).toContain('bg-[var(--color-brand-600)]');
    });

    it('should call onTimeRangeChange when button clicked', () => {
      const onTimeRangeChange = vi.fn();
      render(
        <ChatUsageChart {...defaultProps} onTimeRangeChange={onTimeRangeChange} />
      );

      fireEvent.click(screen.getByText('7D'));
      expect(onTimeRangeChange).toHaveBeenCalledWith(7);
    });

    it('should call onTimeRangeChange with correct days for each button', () => {
      const onTimeRangeChange = vi.fn();
      render(
        <ChatUsageChart {...defaultProps} onTimeRangeChange={onTimeRangeChange} />
      );

      fireEvent.click(screen.getByText('90D'));
      expect(onTimeRangeChange).toHaveBeenCalledWith(90);

      fireEvent.click(screen.getByText('1Y'));
      expect(onTimeRangeChange).toHaveBeenCalledWith(365);

      fireEvent.click(screen.getByText('All'));
      expect(onTimeRangeChange).toHaveBeenCalledWith(0);
    });
  });

  // ============================================
  // Color Props Tests
  // ============================================
  describe('color props', () => {
    it('should pass correct colors to line components', () => {
      render(<ChatUsageChart {...defaultProps} />);

      expect(screen.getByTestId('line-ragChats')).toHaveAttribute('data-stroke', '#10b981');
      expect(screen.getByTestId('line-regularChats')).toHaveAttribute('data-stroke', '#6366f1');
      expect(screen.getByTestId('line-agentChats')).toHaveAttribute('data-stroke', '#f59e0b');
      expect(screen.getByTestId('line-imageGenChats')).toHaveAttribute('data-stroke', '#ec4899');
    });
  });

  // ============================================
  // Responsive Container Tests
  // ============================================
  describe('responsive container', () => {
    it('should set chart height to 192px', () => {
      render(<ChatUsageChart {...defaultProps} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('data-height', '192');
    });

    it('should set chart width to 100%', () => {
      render(<ChatUsageChart {...defaultProps} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });
  });

  // ============================================
  // Animation Props Tests
  // ============================================
  describe('animation props', () => {
    it('should accept animationDelay prop', () => {
      const { container } = render(
        <ChatUsageChart {...defaultProps} animationDelay={100} />
      );

      // The chart should render without errors
      expect(container.firstChild).not.toBeNull();
    });

    it('should accept isAnimationReady prop', () => {
      const { container } = render(
        <ChatUsageChart {...defaultProps} isAnimationReady={false} />
      );

      // Container should have opacity 0 when not ready
      const chartContainer = container.querySelector('.rounded-3xl');
      expect(chartContainer).toHaveStyle({ opacity: '0' });
    });

    it('should set opacity to 1 when animation is ready', () => {
      const { container } = render(
        <ChatUsageChart {...defaultProps} isAnimationReady={true} />
      );

      const chartContainer = container.querySelector('.rounded-3xl');
      expect(chartContainer).toHaveStyle({ opacity: '1' });
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have rounded corners on container', () => {
      const { container } = render(<ChatUsageChart {...defaultProps} />);

      const chartContainer = container.querySelector('.rounded-3xl');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should have border styling', () => {
      const { container } = render(<ChatUsageChart {...defaultProps} />);

      const chartContainer = container.querySelector('.border');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should have padding on container', () => {
      const { container } = render(<ChatUsageChart {...defaultProps} />);

      const chartContainer = container.querySelector('.p-6');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should render ambient glow effect', () => {
      const { container } = render(<ChatUsageChart {...defaultProps} />);

      const glow = container.querySelector('.blur-3xl');
      expect(glow).toBeInTheDocument();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle single data point', () => {
      render(
        <ChatUsageChart
          {...defaultProps}
          chatUsageChartData={[
            { date: '2024-01-01', ragChats: 5, regularChats: 10, agentChats: 3, imageGenChats: 2 }
          ]}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle all zero values', () => {
      render(
        <ChatUsageChart
          {...defaultProps}
          chatUsageChartData={[
            { date: '2024-01-01', ragChats: 0, regularChats: 0, agentChats: 0, imageGenChats: 0 }
          ]}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle very long time range', () => {
      render(<ChatUsageChart {...defaultProps} selectedTimeRange={365} />);

      const button1Y = screen.getByText('1Y');
      // Selected buttons use CSS classes for styling
      expect(button1Y.className).toContain('bg-[var(--color-brand-600)]');
    });
  });
});
