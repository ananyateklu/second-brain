/**
 * NotesChart Component Tests
 * Unit tests for the NotesChart component with Recharts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotesChart } from '../NotesChart';

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
    { date: '2024-01-01', count: 5 },
    { date: '2024-01-02', count: 8 },
    { date: '2024-01-03', count: 3 },
    { date: '2024-01-04', count: 12 },
    { date: '2024-01-05', count: 7 },
  ];
}

describe('NotesChart', () => {
  const defaultProps = {
    chartData: createMockChartData(),
    selectedTimeRange: 30,
    onTimeRangeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render chart title', () => {
      render(<NotesChart {...defaultProps} />);
      expect(screen.getByText('Notes Created Over Time')).toBeInTheDocument();
    });

    it('should render the LineChart component', () => {
      render(<NotesChart {...defaultProps} />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render all chart components', () => {
      render(<NotesChart {...defaultProps} />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should render the count data line', () => {
      render(<NotesChart {...defaultProps} />);
      expect(screen.getByTestId('line-count')).toBeInTheDocument();
    });

    it('should render chart icon', () => {
      const { container } = render(<NotesChart {...defaultProps} />);
      const icon = container.querySelector('svg.h-5.w-5');
      expect(icon).toBeInTheDocument();
    });

    it('should use primary color for line stroke', () => {
      render(<NotesChart {...defaultProps} />);

      const line = screen.getByTestId('line-count');
      expect(line).toHaveAttribute('data-stroke', 'var(--color-primary)');
    });
  });

  // ============================================
  // Time Range Filter Tests
  // ============================================
  describe('time range filters', () => {
    it('should render all time range buttons', () => {
      render(<NotesChart {...defaultProps} />);

      expect(screen.getByText('7D')).toBeInTheDocument();
      expect(screen.getByText('30D')).toBeInTheDocument();
      expect(screen.getByText('90D')).toBeInTheDocument();
      expect(screen.getByText('6M')).toBeInTheDocument();
      expect(screen.getByText('1Y')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('should highlight selected time range button', () => {
      render(<NotesChart {...defaultProps} selectedTimeRange={30} />);

      const button30D = screen.getByText('30D');
      // Selected buttons use CSS classes for styling
      expect(button30D.className).toContain('bg-[var(--color-brand-600)]');
    });

    it('should not highlight unselected buttons', () => {
      render(<NotesChart {...defaultProps} selectedTimeRange={30} />);

      const button7D = screen.getByText('7D');
      // Unselected buttons use CSS classes for styling
      expect(button7D.className).toContain('bg-[var(--surface-elevated)]');
    });

    it('should call onTimeRangeChange when button clicked', () => {
      const onTimeRangeChange = vi.fn();
      render(
        <NotesChart {...defaultProps} onTimeRangeChange={onTimeRangeChange} />
      );

      fireEvent.click(screen.getByText('7D'));
      expect(onTimeRangeChange).toHaveBeenCalledWith(7);
    });

    it('should call onTimeRangeChange with correct days for each button', () => {
      const onTimeRangeChange = vi.fn();
      render(
        <NotesChart {...defaultProps} onTimeRangeChange={onTimeRangeChange} />
      );

      fireEvent.click(screen.getByText('90D'));
      expect(onTimeRangeChange).toHaveBeenCalledWith(90);

      fireEvent.click(screen.getByText('6M'));
      expect(onTimeRangeChange).toHaveBeenCalledWith(180);

      fireEvent.click(screen.getByText('1Y'));
      expect(onTimeRangeChange).toHaveBeenCalledWith(365);

      fireEvent.click(screen.getByText('All'));
      expect(onTimeRangeChange).toHaveBeenCalledWith(0);
    });
  });

  // ============================================
  // Responsive Container Tests
  // ============================================
  describe('responsive container', () => {
    it('should set chart height to 192px', () => {
      render(<NotesChart {...defaultProps} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('data-height', '192');
    });
  });

  // ============================================
  // Animation Props Tests
  // ============================================
  describe('animation props', () => {
    it('should accept animationDelay prop', () => {
      const { container } = render(
        <NotesChart {...defaultProps} animationDelay={100} />
      );

      expect(container.firstChild).not.toBeNull();
    });

    it('should accept isAnimationReady prop', () => {
      const { container } = render(
        <NotesChart {...defaultProps} isAnimationReady={false} />
      );

      const chartContainer = container.querySelector('.rounded-3xl');
      expect(chartContainer).toHaveStyle({ opacity: '0' });
    });

    it('should set opacity to 1 when animation is ready', () => {
      const { container } = render(
        <NotesChart {...defaultProps} isAnimationReady={true} />
      );

      const chartContainer = container.querySelector('.rounded-3xl');
      expect(chartContainer).toHaveStyle({ opacity: '1' });
    });

    it('should default isAnimationReady to true', () => {
      const { container } = render(<NotesChart {...defaultProps} />);

      const chartContainer = container.querySelector('.rounded-3xl');
      expect(chartContainer).toHaveStyle({ opacity: '1' });
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have rounded corners on container', () => {
      const { container } = render(<NotesChart {...defaultProps} />);

      const chartContainer = container.querySelector('.rounded-3xl');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should have border styling', () => {
      const { container } = render(<NotesChart {...defaultProps} />);

      const chartContainer = container.querySelector('.border');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should have padding on container', () => {
      const { container } = render(<NotesChart {...defaultProps} />);

      const chartContainer = container.querySelector('.p-6');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should render ambient glow effect', () => {
      const { container } = render(<NotesChart {...defaultProps} />);

      const glow = container.querySelector('.blur-3xl');
      expect(glow).toBeInTheDocument();
    });

    it('should have relative overflow hidden on container', () => {
      const { container } = render(<NotesChart {...defaultProps} />);

      const chartContainer = container.querySelector('.overflow-hidden');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  // ============================================
  // XAxis Configuration Tests
  // ============================================
  describe('x-axis configuration', () => {
    it('should use date as data key for x-axis', () => {
      render(<NotesChart {...defaultProps} />);

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'date');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should render with empty chart data', () => {
      render(<NotesChart {...defaultProps} chartData={[]} />);

      // Chart should still render but with no data
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle single data point', () => {
      render(
        <NotesChart
          {...defaultProps}
          chartData={[{ date: '2024-01-01', count: 5 }]}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle all zero counts', () => {
      render(
        <NotesChart
          {...defaultProps}
          chartData={[
            { date: '2024-01-01', count: 0 },
            { date: '2024-01-02', count: 0 },
            { date: '2024-01-03', count: 0 },
          ]}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle large count values', () => {
      render(
        <NotesChart
          {...defaultProps}
          chartData={[
            { date: '2024-01-01', count: 10000 },
            { date: '2024-01-02', count: 25000 },
          ]}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle very long time range selection', () => {
      render(<NotesChart {...defaultProps} selectedTimeRange={365} />);

      const button1Y = screen.getByText('1Y');
      // Selected buttons use CSS classes for styling
      expect(button1Y.className).toContain('bg-[var(--color-brand-600)]');
    });

    it('should handle "All" time range (0 days)', () => {
      render(<NotesChart {...defaultProps} selectedTimeRange={0} />);

      const buttonAll = screen.getByText('All');
      // Selected buttons use CSS classes for styling
      expect(buttonAll.className).toContain('bg-[var(--color-brand-600)]');
    });
  });

  // ============================================
  // Button Interaction Tests
  // ============================================
  describe('button interactions', () => {
    it('should have hover classes on unselected buttons', () => {
      render(<NotesChart {...defaultProps} selectedTimeRange={30} />);

      const button7D = screen.getByText('7D');

      // Unselected buttons have hover classes defined in CSS
      expect(button7D.className).toContain('hover:bg-[var(--surface-hover)]');
    });

    it('should not have hover background classes on selected button', () => {
      render(<NotesChart {...defaultProps} selectedTimeRange={30} />);

      const button30D = screen.getByText('30D');

      // Selected button has brand color background and no hover:bg class for changing background
      expect(button30D.className).toContain('bg-[var(--color-brand-600)]');
      expect(button30D.className).not.toContain('hover:bg-[var(--surface-hover)]');
    });
  });
});
