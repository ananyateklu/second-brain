/**
 * SessionStatsSection Component Tests
 * Unit tests for the SessionStatsSection component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionStatsSection } from '../SessionStatsSection';

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hours ago`;
  }),
}));

// Mock StatCard
vi.mock('../StatCard', () => ({
  StatCard: ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: React.ReactNode }) => (
    <div data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <span data-testid="stat-title">{title}</span>
      <span data-testid="stat-value">{value}</span>
      {subtitle && <span data-testid="stat-subtitle">{subtitle}</span>}
    </div>
  ),
}));

// Mock session hooks
const mockUseSessionStats = vi.fn();
const mockUseActiveSessions = vi.fn();

vi.mock('../../../chat/hooks/use-chat-sessions', () => ({
  useSessionStats: () => mockUseSessionStats(),
  useActiveSessions: () => mockUseActiveSessions(),
}));

// Helper to create mock stats
function createMockStats() {
  return {
    totalSessions: 50,
    avgSessionDurationMinutes: 12.5,
    activeSessions: 3,
    totalMessagesSent: 200,
    totalMessagesReceived: 350,
    lastSessionAt: new Date().toISOString(),
  };
}

function createMockActiveSession(id: string, browser = 'Chrome') {
  return {
    id,
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    deviceInfo: { browser },
  };
}

describe('SessionStatsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSessionStats.mockReturnValue({ data: createMockStats(), isLoading: false });
    mockUseActiveSessions.mockReturnValue({ data: [], isLoading: false });
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render session analytics title', () => {
      render(<SessionStatsSection />);
      expect(screen.getByText('Session Analytics')).toBeInTheDocument();
    });

    it('should render all stat cards', () => {
      render(<SessionStatsSection />);

      expect(screen.getByTestId('stat-card-total-sessions')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-avg-duration')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-active-now')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-messages-total')).toBeInTheDocument();
    });

    it('should display correct stat values', () => {
      render(<SessionStatsSection />);

      const totalSessionsCard = screen.getByTestId('stat-card-total-sessions');
      expect(totalSessionsCard).toHaveTextContent('50');

      const avgDurationCard = screen.getByTestId('stat-card-avg-duration');
      expect(avgDurationCard).toHaveTextContent('12.5 min');

      const activeNowCard = screen.getByTestId('stat-card-active-now');
      expect(activeNowCard).toHaveTextContent('3');
    });

    it('should display total messages (sent + received)', () => {
      render(<SessionStatsSection />);

      const messagesCard = screen.getByTestId('stat-card-messages-total');
      expect(messagesCard).toHaveTextContent('550'); // 200 + 350
    });
  });

  // ============================================
  // Loading State Tests
  // ============================================
  describe('loading state', () => {
    it('should show loading skeleton when stats loading', () => {
      mockUseSessionStats.mockReturnValue({ data: undefined, isLoading: true });
      mockUseActiveSessions.mockReturnValue({ data: undefined, isLoading: false });

      const { container } = render(<SessionStatsSection />);

      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should show loading skeleton when active sessions loading', () => {
      mockUseSessionStats.mockReturnValue({ data: createMockStats(), isLoading: false });
      mockUseActiveSessions.mockReturnValue({ data: undefined, isLoading: true });

      const { container } = render(<SessionStatsSection />);

      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render skeleton with 4 placeholder cards', () => {
      mockUseSessionStats.mockReturnValue({ data: undefined, isLoading: true });
      mockUseActiveSessions.mockReturnValue({ data: undefined, isLoading: true });

      const { container } = render(<SessionStatsSection />);

      const placeholders = container.querySelectorAll('.h-24');
      expect(placeholders.length).toBe(4);
    });
  });

  // ============================================
  // Empty State Tests
  // ============================================
  describe('empty state', () => {
    it('should return null when stats is undefined and not loading', () => {
      mockUseSessionStats.mockReturnValue({ data: undefined, isLoading: false });
      mockUseActiveSessions.mockReturnValue({ data: [], isLoading: false });

      const { container } = render(<SessionStatsSection />);

      expect(container.firstChild).toBeNull();
    });
  });

  // ============================================
  // Active Sessions List Tests
  // ============================================
  describe('active sessions list', () => {
    it('should show active sessions section when sessions exist', () => {
      mockUseActiveSessions.mockReturnValue({
        data: [createMockActiveSession('1', 'Chrome')],
        isLoading: false,
      });

      render(<SessionStatsSection />);

      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    });

    it('should display session device info', () => {
      mockUseActiveSessions.mockReturnValue({
        data: [createMockActiveSession('1', 'Firefox')],
        isLoading: false,
      });

      render(<SessionStatsSection />);

      expect(screen.getByText('Firefox')).toBeInTheDocument();
    });

    it('should show "Unknown device" when deviceInfo is missing', () => {
      mockUseActiveSessions.mockReturnValue({
        data: [{ id: '1', startedAt: new Date().toISOString(), deviceInfo: undefined }],
        isLoading: false,
      });

      render(<SessionStatsSection />);

      expect(screen.getByText('Unknown device')).toBeInTheDocument();
    });

    it('should limit displayed sessions to 3', () => {
      mockUseActiveSessions.mockReturnValue({
        data: [
          createMockActiveSession('1', 'Chrome'),
          createMockActiveSession('2', 'Firefox'),
          createMockActiveSession('3', 'Safari'),
          createMockActiveSession('4', 'Edge'),
        ],
        isLoading: false,
      });

      render(<SessionStatsSection />);

      expect(screen.getByText('Chrome')).toBeInTheDocument();
      expect(screen.getByText('Firefox')).toBeInTheDocument();
      expect(screen.getByText('Safari')).toBeInTheDocument();
      expect(screen.queryByText('Edge')).not.toBeInTheDocument();
    });

    it('should not show active sessions section when empty', () => {
      mockUseActiveSessions.mockReturnValue({ data: [], isLoading: false });

      render(<SessionStatsSection />);

      expect(screen.queryByText('Active Sessions')).not.toBeInTheDocument();
    });

    it('should show green pulse indicator for active sessions', () => {
      mockUseActiveSessions.mockReturnValue({
        data: [createMockActiveSession('1')],
        isLoading: false,
      });

      const { container } = render(<SessionStatsSection />);

      const pulseIndicator = container.querySelector('.bg-green-500.animate-pulse');
      expect(pulseIndicator).toBeInTheDocument();
    });
  });

  // ============================================
  // Last Session Info Tests
  // ============================================
  describe('last session info', () => {
    it('should display last session time', () => {
      const stats = createMockStats();
      stats.lastSessionAt = new Date(Date.now() - 120 * 60 * 1000).toISOString(); // 2 hours ago
      mockUseSessionStats.mockReturnValue({ data: stats, isLoading: false });

      render(<SessionStatsSection />);

      expect(screen.getByText(/Last session:/)).toBeInTheDocument();
    });

    it('should not show last session when lastSessionAt is null', () => {
      const stats = { ...createMockStats(), lastSessionAt: null };
      mockUseSessionStats.mockReturnValue({ data: stats, isLoading: false });

      render(<SessionStatsSection />);

      expect(screen.queryByText(/Last session:/)).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have card styling with rounded corners', () => {
      const { container } = render(<SessionStatsSection />);

      const card = container.querySelector('.rounded-2xl');
      expect(card).toBeInTheDocument();
    });

    it('should have border styling', () => {
      const { container } = render(<SessionStatsSection />);

      const card = container.querySelector('.border');
      expect(card).toBeInTheDocument();
    });

    it('should use 4-column grid on medium screens', () => {
      const { container } = render(<SessionStatsSection />);

      const grid = container.querySelector('.md\\:grid-cols-4');
      expect(grid).toBeInTheDocument();
    });

    it('should have icon in header', () => {
      const { container } = render(<SessionStatsSection />);

      const icon = container.querySelector('svg.h-5.w-5');
      expect(icon).toBeInTheDocument();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle zero active sessions', () => {
      const stats = { ...createMockStats(), activeSessions: 0 };
      mockUseSessionStats.mockReturnValue({ data: stats, isLoading: false });

      render(<SessionStatsSection />);

      const activeNowCard = screen.getByTestId('stat-card-active-now');
      expect(activeNowCard).toHaveTextContent('0');
    });

    it('should handle decimal duration values', () => {
      const stats = { ...createMockStats(), avgSessionDurationMinutes: 7.333333 };
      mockUseSessionStats.mockReturnValue({ data: stats, isLoading: false });

      render(<SessionStatsSection />);

      const avgDurationCard = screen.getByTestId('stat-card-avg-duration');
      expect(avgDurationCard).toHaveTextContent('7.3 min');
    });

    it('should handle zero messages', () => {
      const stats = { ...createMockStats(), totalMessagesSent: 0, totalMessagesReceived: 0 };
      mockUseSessionStats.mockReturnValue({ data: stats, isLoading: false });

      render(<SessionStatsSection />);

      const messagesCard = screen.getByTestId('stat-card-messages-total');
      expect(messagesCard).toHaveTextContent('0');
    });
  });
});
