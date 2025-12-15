/**
 * StatCardsGrid Component Tests
 * Unit tests for the StatCardsGrid component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCardsGrid } from '../StatCardsGrid';
import type { AIUsageStats } from '../../../../types/stats';
import type { SessionStats } from '../../../../types/chat';

// Mock StatCard component
vi.mock('../StatCard', () => ({
  StatCard: ({ title, value }: { title: string; value: string | number }) => (
    <div data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <span data-testid="stat-title">{title}</span>
      <span data-testid="stat-value">{value}</span>
    </div>
  ),
}));

// Mock dashboard utils
vi.mock('../../utils/dashboard-utils', () => ({
  formatTokenCount: (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  },
}));

// Mock animations hook
vi.mock('../../hooks/use-dashboard-animations', () => ({
  useDashboardAnimations: () => ({ isReady: true }),
}));

// Helper to create mock stats
function createMockNotesStats() {
  return {
    totalNotes: 100,
    notesCreatedThisWeek: 10,
    notesCreatedThisMonth: 25,
    notesUpdatedThisWeek: 15,
  };
}

function createMockAIStats(overrides: Partial<AIUsageStats> = {}): AIUsageStats {
  return {
    totalConversations: 50,
    ragConversationsCount: 20,
    agentConversationsCount: 10,
    imageGenerationConversationsCount: 5,
    totalImagesGenerated: 15,
    totalMessages: 500,
    ...overrides,
  };
}

function createMockSessionStats(overrides: Partial<SessionStats> = {}): SessionStats {
  return {
    totalSessions: 30,
    avgSessionDurationMinutes: 15.5,
    activeSessions: 2,
    totalMessagesSent: 100,
    totalMessagesReceived: 150,
    ...overrides,
  };
}

describe('StatCardsGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render grid container', () => {
      const { container } = render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={undefined}
          totalTokens={0}
        />
      );
      expect(container.querySelector('.dashboard-stats-grid')).toBeInTheDocument();
    });

    it('should render all notes stat cards', () => {
      render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={undefined}
          totalTokens={0}
        />
      );

      expect(screen.getByTestId('stat-card-total-notes')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-notes-created-this-week')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-notes-created-this-month')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-notes-updated-this-week')).toBeInTheDocument();
    });

    it('should render AI stat cards when aiStats provided', () => {
      render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={createMockAIStats()}
          totalTokens={10000}
        />
      );

      expect(screen.getByTestId('stat-card-total-conversations')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-rag-enhanced-conversations')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-agent-conversations')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-image-generation')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-total-messages')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-total-tokens-used')).toBeInTheDocument();
    });

    it('should render session stat cards when sessionStats provided', () => {
      render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={createMockAIStats()}
          totalTokens={10000}
          sessionStats={createMockSessionStats()}
        />
      );

      expect(screen.getByTestId('stat-card-total-sessions')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-avg-session-duration')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-active-sessions')).toBeInTheDocument();
    });
  });

  // ============================================
  // Values Display Tests
  // ============================================
  describe('values display', () => {
    it('should display correct total notes value', () => {
      render(
        <StatCardsGrid
          stats={{ ...createMockNotesStats(), totalNotes: 250 }}
          aiStats={undefined}
          totalTokens={0}
        />
      );

      const totalNotesCard = screen.getByTestId('stat-card-total-notes');
      expect(totalNotesCard).toHaveTextContent('250');
    });

    it('should display correct AI conversations value', () => {
      render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={createMockAIStats({ totalConversations: 75 })}
          totalTokens={0}
        />
      );

      const conversationsCard = screen.getByTestId('stat-card-total-conversations');
      expect(conversationsCard).toHaveTextContent('75');
    });

    it('should format token count correctly', () => {
      render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={createMockAIStats()}
          totalTokens={150000}
        />
      );

      const tokensCard = screen.getByTestId('stat-card-total-tokens-used');
      expect(tokensCard).toHaveTextContent('150.0K tokens');
    });

    it('should display session duration with decimal', () => {
      render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={createMockAIStats()}
          totalTokens={0}
          sessionStats={createMockSessionStats({ avgSessionDurationMinutes: 12.7 })}
        />
      );

      const durationCard = screen.getByTestId('stat-card-avg-session-duration');
      expect(durationCard).toHaveTextContent('12.7 min');
    });
  });

  // ============================================
  // Conditional Display Tests
  // ============================================
  describe('conditional display', () => {
    it('should not render AI cards when aiStats is undefined', () => {
      render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={undefined}
          totalTokens={0}
        />
      );

      expect(screen.queryByTestId('stat-card-total-conversations')).not.toBeInTheDocument();
      expect(screen.queryByTestId('stat-card-total-messages')).not.toBeInTheDocument();
    });

    it('should not render session cards when sessionStats is undefined', () => {
      render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={createMockAIStats()}
          totalTokens={0}
        />
      );

      expect(screen.queryByTestId('stat-card-total-sessions')).not.toBeInTheDocument();
      expect(screen.queryByTestId('stat-card-active-sessions')).not.toBeInTheDocument();
    });

    it('should only show notes cards when stats is null', () => {
      render(
        <StatCardsGrid
          stats={null}
          aiStats={undefined}
          totalTokens={0}
        />
      );

      // Notes cards should show with 0 values
      expect(screen.getByTestId('stat-card-total-notes')).toBeInTheDocument();
      const totalNotesCard = screen.getByTestId('stat-card-total-notes');
      expect(totalNotesCard).toHaveTextContent('0');
    });
  });

  // ============================================
  // Layout Tests
  // ============================================
  describe('layout', () => {
    it('should have flex wrap layout', () => {
      const { container } = render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={undefined}
          totalTokens={0}
        />
      );

      const grid = container.querySelector('.dashboard-stats-grid');
      expect(grid).toHaveStyle({ flexWrap: 'wrap' });
    });

    it('should set min-width on card containers', () => {
      const { container } = render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={undefined}
          totalTokens={0}
        />
      );

      const grid = container.querySelector('.dashboard-stats-grid');
      const firstCardContainer = grid?.firstChild as HTMLElement;
      expect(firstCardContainer).toHaveStyle({ minWidth: '150px' });
    });

    it('should render correct number of visible cards', () => {
      render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={createMockAIStats()}
          totalTokens={10000}
          sessionStats={createMockSessionStats()}
        />
      );

      // 4 notes + 6 AI + 3 session = 13 total
      const allCards = screen.getAllByTestId(/^stat-card-/);
      expect(allCards.length).toBe(13);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle zero values gracefully', () => {
      render(
        <StatCardsGrid
          stats={{
            totalNotes: 0,
            notesCreatedThisWeek: 0,
            notesCreatedThisMonth: 0,
            notesUpdatedThisWeek: 0,
          }}
          aiStats={createMockAIStats({ totalConversations: 0 })}
          totalTokens={0}
        />
      );

      const totalNotesCard = screen.getByTestId('stat-card-total-notes');
      expect(totalNotesCard).toHaveTextContent('0');
    });

    it('should handle very large numbers', () => {
      render(
        <StatCardsGrid
          stats={{ ...createMockNotesStats(), totalNotes: 1000000 }}
          aiStats={undefined}
          totalTokens={0}
        />
      );

      const totalNotesCard = screen.getByTestId('stat-card-total-notes');
      expect(totalNotesCard).toHaveTextContent('1000000');
    });

    it('should handle sessionStats with 0 active sessions', () => {
      render(
        <StatCardsGrid
          stats={createMockNotesStats()}
          aiStats={createMockAIStats()}
          totalTokens={0}
          sessionStats={createMockSessionStats({ activeSessions: 0 })}
        />
      );

      const activeSessionsCard = screen.getByTestId('stat-card-active-sessions');
      expect(activeSessionsCard).toHaveTextContent('0');
    });
  });
});
